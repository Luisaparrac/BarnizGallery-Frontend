import { AppEvents } from "../../core/AppEvents";
import type { Localizer } from "../../i18n/Localizer";
import { services } from "../../services/ServiceRegistry";
import { Formatter } from "../../utils/Formatter";
import type { WorldPiece } from "../world/WorldTypes";
import { ErrorText } from "./ErrorText";
import type { PanelView } from "./PanelView";
import type { VisitorSession } from "./VisitorSession";
import { CartView } from "./views/CartView";
import { LoginView } from "./views/LoginView";
import { MessageView } from "./views/MessageView";
import { PieceView } from "./views/PieceView";

/** Where the purchase boards are shown (the experience's board). */
export interface PurchaseHost {
  show(view: PanelView): void;
}

/**
 * Mediator of buying in 3D: it loads the data, opens each board (piece, cart…) and decides what
 * comes next, so the boards never know each other. Without a session it asks to sign in first
 * and then comes back to where the visitor was.
 */
export class PurchaseFlow {
  private readonly format: Formatter;

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
        }),
      );
    });
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
