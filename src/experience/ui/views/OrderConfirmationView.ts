import type { Control, TextBlock } from "@babylonjs/gui";
import type { Order } from "../../../domain/commerce";
import type { Localizer } from "../../../i18n/Localizer";
import type { Formatter } from "../../../utils/Formatter";
import { PanelView, type PanelContext } from "../PanelView";
import { UiTheme } from "../UiTheme";
import { CheckoutView } from "./CheckoutView";

/** The order is paid: its code, what was bought, where it goes and the total. */
export class OrderConfirmationView extends PanelView {
  /** "Keep touring" already closes the board. */
  override readonly closable = false;
  readonly title: string;

  constructor(
    private readonly i18n: Localizer,
    private readonly format: Formatter,
    private readonly order: Order,
    private readonly keepTouring: () => void,
  ) {
    super();
    this.title = i18n.t("shop.thanksTitle");
  }

  protected content({ kit }: PanelContext, width: number): Control {
    const column = kit.column();
    const code = this.wide(kit.subtitle(this.i18n.t("shop.orderCode", { code: this.order.code })), width);
    code.color = UiTheme.color.green;
    column.addControl(code);
    column.addControl(this.wide(kit.text(this.i18n.t("gateway.result.APPROVED")), width));
    for (const item of this.order.items.slice(0, 4)) {
      column.addControl(this.wide(kit.text(`· ${item.description} — ${this.format.money(item.lineTotal, this.order.currency)}`, { small: true }), width));
    }
    if (this.order.shippingAddress) {
      column.addControl(this.wide(kit.text(`${this.i18n.t("checkout.address")}: ${CheckoutView.describe(this.order.shippingAddress)}`, { small: true, muted: true }), width));
    }
    column.addControl(this.wide(kit.subtitle(`${this.i18n.t("order.total")}: ${this.format.money(this.order.total, this.order.currency)}`), width));
    return column;
  }

  protected override actions({ kit }: PanelContext): Control[] {
    return [kit.button(this.i18n.t("shop.keepTouring"), () => this.keepTouring(), "primary", 420)];
  }

  private wide<T extends TextBlock>(block: T, width: number): T {
    block.widthInPixels = width;
    return block;
  }
}
