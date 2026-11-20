import type { Id } from "../../domain/common";
import type { CustomRequest, CustomRequestInput } from "../../domain/customOrder";
import type { Localizer } from "../../i18n/Localizer";
import { services } from "../../services/ServiceRegistry";
import { Formatter } from "../../utils/Formatter";
import { ErrorText } from "./ErrorText";
import type { PurchaseFlow, PurchaseHost } from "./PurchaseFlow";
import type { VisitorSession } from "./VisitorSession";
import { CommissionFormView } from "./views/CommissionFormView";
import { CommissionsView } from "./views/CommissionsView";
import { CommissionView } from "./views/CommissionView";
import { MessageView } from "./views/MessageView";

/**
 * The commissions workshop (Mediator of its boards): my custom orders → a new one (title,
 * description, shape, colors, budget) → AI designs in frames → publish → the masters' offers →
 * accept → pay the deposit with the same gateway as a purchase.
 */
export class CommissionFlow {
  private static readonly MAX_DESIGNS = 4;
  private static readonly DEPOSIT_PERCENT = 50;

  private readonly format: Formatter;
  private settings: Record<string, unknown> | null = null;

  constructor(
    private readonly i18n: Localizer,
    private readonly session: VisitorSession,
    private readonly host: PurchaseHost,
    private readonly purchase: PurchaseFlow,
  ) {
    this.format = new Formatter(i18n.language);
  }

  /** My custom orders (the stall or the Account board). */
  async showList(): Promise<void> {
    if (!this.session.signedIn) {
      this.host.show(new MessageView(this.i18n.t("custom.title"), this.i18n.t("shop.signInForCommissions"), { label: this.i18n.t("shop.signIn"), run: () => this.purchase.requireSignIn(() => void this.showList()) }));
      return;
    }
    await this.load(async () => {
      const requests = await services.customOrder.listMine();
      this.host.show(new CommissionsView(this.i18n, requests, { open: (request) => void this.showRequest(request.id), create: () => void this.showForm() }));
    });
  }

  private async showForm(): Promise<void> {
    await this.load(async () => {
      const catalogs = await services.catalog.getCatalogs();
      this.host.show(new CommissionFormView(this.i18n, () => void this.showList(), catalogs, (input) => this.create(input)));
    });
  }

  private async create(input: CustomRequestInput): Promise<void> {
    const request = await services.customOrder.create(input);
    await this.showRequest(request.id);
  }

  private async showRequest(id: Id): Promise<void> {
    await this.load(async () => {
      const [request] = await Promise.all([services.customOrder.get(id), this.loadSettings()]);
      this.show(request);
    });
  }

  private show(request: CustomRequest): void {
    const id = request.id;
    const refresh = (next: CustomRequest) => this.show(next);
    this.host.show(
      new CommissionView(this.i18n, this.format, request, this.setting("custom_orders.max_ai_designs", CommissionFlow.MAX_DESIGNS), this.setting("custom_orders.deposit_percent", CommissionFlow.DEPOSIT_PERCENT), {
        back: () => void this.showList(),
        generate: async () => refresh(await services.customOrder.generateDesign(id)),
        selectDesign: async (designId) => refresh(await services.customOrder.selectDesign(id, designId)),
        publish: async () => refresh(await services.customOrder.publish(id)),
        accept: async (offerId) => {
          const { orderId } = await services.customOrder.acceptOffer(id, offerId);
          await this.purchase.payOrder(orderId);
        },
        payDeposit: async () => {
          const orders = await services.commerce.listMyOrders();
          const offerId = request.acceptedOfferId;
          const deposit = orders.find((order) => order.type === "CUSTOM" && order.status === "PENDING_PAYMENT" && order.items.some((item) => item.customOfferId === offerId));
          if (deposit) await this.purchase.payOrder(deposit.id);
          else this.host.show(new MessageView(request.title, this.i18n.t("shop.noDepositPending")));
        },
      }),
    );
  }

  private async loadSettings(): Promise<void> {
    this.settings ??= await services.catalog.getPublicSettings().catch(() => ({}));
  }

  private setting(key: string, fallback: number): number {
    const value = Number(this.settings?.[key]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private async load(step: () => Promise<void>): Promise<void> {
    try {
      await step();
    } catch (error) {
      this.host.show(new MessageView(this.i18n.t("shop.errorTitle"), ErrorText.of(this.i18n, error)));
    }
  }
}
