import { AppEvents } from "../../core/AppEvents";
import type { Id } from "../../domain/common";
import type { Cart, Order, Payment } from "../../domain/commerce";
import type { Address } from "../../domain/user";
import { AppConfig } from "../../config/AppConfig";
import type { Localizer } from "../../i18n/Localizer";
import { services } from "../../services/ServiceRegistry";
import { Formatter } from "../../utils/Formatter";
import type { WorldPiece } from "../world/WorldTypes";
import { ErrorText } from "./ErrorText";
import type { SurfaceView } from "./PanelSurface";
import type { VisitorSession } from "./VisitorSession";
import { AddressFormView } from "./views/AddressFormView";
import { CartView } from "./views/CartView";
import { CheckoutView } from "./views/CheckoutView";
import { ExternalPaymentView } from "./views/ExternalPaymentView";
import { GatewayView } from "./views/GatewayView";
import { LoginView } from "./views/LoginView";
import { MessageView } from "./views/MessageView";
import { OrderConfirmationView } from "./views/OrderConfirmationView";
import type { OrderSummary } from "./views/OrderSummaryCard";
import { PieceView } from "./views/PieceView";

/** Where the purchase boards are shown (the experience's board). */
export interface PurchaseHost {
  show(view: SurfaceView): void;
  /** Closes the board and gives the walk back. */
  close(): void;
}

/**
 * Mediator of buying in 3D: it loads the data, opens each board (piece → cart → address →
 * gateway → confirmation) and decides what comes next, so the boards never know each other. Without a session it asks to sign in first
 * and then comes back to where the visitor was.
 */
export class PurchaseFlow {
  /** Shipping cost when the settings cannot be read (the same default as the backend). */
  private static readonly SHIPPING_FALLBACK = 25;

  private readonly format: Formatter;
  /** Names of the workshops (stores) by id, for the order summary. */
  private storeNames: Map<Id, string> | null = null;
  /** The summary shown at the address step, kept for the payment step. */
  private summary: OrderSummary | null = null;

  constructor(
    private readonly i18n: Localizer,
    private readonly session: VisitorSession,
    private readonly host: PurchaseHost,
  ) {
    this.format = new Formatter(i18n.language);
  }

  /** The board of a piece clicked in its display case. */
  async showPiece(piece: WorldPiece): Promise<void> {
    await this.load(async () => {
      const detail = await services.gallery.getArtwork(piece.slug);
      const id = detail.artwork.id;
      this.host.show(
        new PieceView(this.i18n, this.format, detail, this.session.signedIn, {
          addToCart: async () => {
            await services.commerce.addToCart(id);
            AppEvents.cartChanged.emit();
          },
          toggleSaved: () => services.gallery.toggleFavorite(id),
          signIn: () => this.signIn(() => void this.showPiece(piece)),
          openCart: () => void this.showCart(),
        }),
      );
    });
  }

  /** The cart (HUD button or the cashier stall). */
  async showCart(): Promise<void> {
    if (!this.session.signedIn) {
      this.host.show(new MessageView(this.i18n.t("cart.title"), this.i18n.t("shop.signInForCart"), { label: this.i18n.t("shop.signIn"), run: () => this.signIn(() => void this.showCart()) }));
      return;
    }
    await this.load(async () => {
      const cart = await services.commerce.getCart();
      this.host.show(
        new CartView(this.i18n, this.format, cart, {
          remove: async (artworkId) => {
            await services.commerce.removeFromCart(artworkId);
            AppEvents.cartChanged.emit();
            await this.showCart();
          },
          checkout: () => void this.showCheckout(),
        }),
      );
    });
  }

  /** Shipping address and summary; without saved addresses it starts with the address form. */
  async showCheckout(selected: Id | null = null): Promise<void> {
    await this.load(async () => {
      const [cart, addresses, settings] = await Promise.all([services.commerce.getCart(), services.profile.listAddresses(), services.catalog.getPublicSettings().catch(() => ({}))]);
      if (!cart.items.length) {
        await this.showCart();
        return;
      }
      if (!addresses.length) {
        this.showAddressForm(true);
        return;
      }
      const shipping = Number((settings as Record<string, unknown>)["commerce.shipping_flat_cost"] ?? PurchaseFlow.SHIPPING_FALLBACK);
      this.summary = await this.summarize(cart, shipping);
      this.host.show(
        new CheckoutView(this.i18n, this.summary, addresses, PurchaseFlow.simulatedPayments, selected, {
          back: () => void this.showCart(),
          newAddress: () => this.showAddressForm(false),
          editAddress: (address) => this.showAddressForm(false, address),
          pay: (addressId) => this.createOrder(addressId),
        }),
      );
    });
  }

  /** A new address, or `editing` one of the saved ones. */
  private showAddressForm(first: boolean, editing: Address | null = null): void {
    this.host.show(
      new AddressFormView(
        this.i18n,
        () => void (first ? this.showCart() : this.showCheckout(editing?.id ?? null)),
        this.session.user?.fullName ?? "",
        first,
        async (address) => {
          const saved = await services.profile.saveAddress(address, editing?.id);
          await this.showCheckout(saved.id);
        },
        editing,
      ),
    );
  }

  /** Without a real backend for commerce the gateway is the simulated one (no money moves). */
  private static get simulatedPayments(): boolean {
    return !AppConfig.usesApi("commerce");
  }

  /** The order summary: each piece with its photo and workshop, subtotal, shipping and total. */
  private async summarize(cart: Cart, shipping: number): Promise<OrderSummary> {
    if (!this.storeNames) {
      const stores = await services.gallery.listStores().catch(() => []);
      this.storeNames = new Map(stores.map(({ store }) => [store.id, this.i18n.pick(store.nameEs, store.nameEn)]));
    }
    const money = (amount: number) => this.format.money(amount, cart.currency);
    return {
      items: cart.items.map((item) => ({
        image: item.coverUrl,
        title: this.i18n.pick(item.title, item.titleEn),
        detail: this.storeNames?.get(item.storeId) ?? "",
        price: money(item.unitPrice * item.quantity),
      })),
      subtotal: money(cart.subtotal),
      shipping: money(shipping),
      total: money(cart.subtotal + shipping),
    };
  }

  /** The order is created (its pieces stay reserved) and the payment starts at the gateway. */
  private async createOrder(addressId: Id): Promise<void> {
    const order = await services.commerce.checkout({ addressId });
    AppEvents.cartChanged.emit();
    await this.startPayment(order);
  }

  /** A real gateway (http address) pays in a new tab; the simulated one pays on a board. */
  private async startPayment(order: Order): Promise<void> {
    const payment = await services.commerce.startPayment(order.id);
    if (PurchaseFlow.isExternal(payment.checkoutUrl)) this.showExternalPayment(order, payment);
    else this.showGateway(order, payment);
  }

  private showExternalPayment(order: Order, payment: Payment): void {
    const open = () => window.open(payment.checkoutUrl, "_blank", "noopener");
    open();
    this.host.show(
      new ExternalPaymentView(this.i18n, this.format, payment, {
        open,
        checkPaid: async () => {
          const current = await services.commerce.getPayment(payment.id);
          if (current.status === "APPROVED") await this.showConfirmation(order.id);
          else if (current.status === "REJECTED" || current.status === "VOIDED" || current.status === "ERROR") this.showRejected(current);
          else return false;
          return true;
        },
      }),
    );
  }

  private static isExternal(url: string): boolean {
    return /^https?:\/\//i.test(url);
  }

  /**
   * The simulated gateway: Approve shows the confirmation. A rejection cancels the order and
   * frees its pieces (they stay in the cart), so trying again goes back to the checkout.
   */
  private showGateway(order: Order, payment: Payment): void {
    this.host.show(
      new GatewayView(this.i18n, this.format, payment, async (method, result) => {
        const outcome = await services.commerce.simulateGatewayResult(payment.id, method, result);
        if (outcome.status === "APPROVED") await this.showConfirmation(order.id);
        else this.showRejected(outcome);
      }),
    );
  }

  private showRejected(payment: Payment): void {
    this.host.show(
      new MessageView(this.i18n.t("gateway.name"), `${this.i18n.tx(`gateway.result.${payment.status}`, this.i18n.t("gateway.result.REJECTED"))} ${this.i18n.t("shop.tryAgainText")}`, {
        label: this.i18n.t("shop.tryAgain"),
        run: () => void this.showCheckout(),
      }),
    );
  }

  private async showConfirmation(orderId: Id): Promise<void> {
    const order = await services.commerce.getOrder(orderId);
    this.host.show(new OrderConfirmationView(this.i18n, this.format, order, () => this.host.close()));
  }

  /** The sign-in board; after signing in (or going back) the visitor returns to `then`. */
  private signIn(then: () => void): void {
    this.host.show(
      new LoginView(this.i18n, then, async (request) => {
        await this.session.login(request);
        then();
      }),
    );
  }

  /** Runs a step; if the services fail, a board says what happened. */
  private async load(step: () => Promise<void>): Promise<void> {
    try {
      await step();
    } catch (error) {
      this.host.show(new MessageView(this.i18n.t("shop.errorTitle"), ErrorText.of(this.i18n, error)));
    }
  }
}
