import { Control, type Button, type TextBlock } from "@babylonjs/gui";
import type { Payment, PaymentMethod } from "../../../domain/commerce";
import type { Localizer } from "../../../i18n/Localizer";
import type { Formatter } from "../../../utils/Formatter";
import { ErrorText } from "../ErrorText";
import { PanelView, type PanelContext } from "../PanelView";
import type { Toggle } from "../UiKit";
import { UiTheme } from "../UiTheme";

export type GatewayResult = "APPROVED" | "REJECTED";

/**
 * The simulated payment gateway: the visitor picks Card, PSE or Nequi and chooses the result the
 * real gateway would give (Approve or Reject). No card data is asked and no money moves.
 */
export class GatewayView extends PanelView {
  private static readonly METHODS: PaymentMethod[] = ["CARD", "PSE", "NEQUI"];

  override readonly closable = false;
  readonly title: string;
  private method: PaymentMethod = "CARD";
  private status: TextBlock | null = null;
  private readonly buttons: Button[] = [];
  private busy = false;

  constructor(
    private readonly i18n: Localizer,
    private readonly format: Formatter,
    private readonly payment: Payment,
    private readonly decide: (method: PaymentMethod, result: GatewayResult) => Promise<void>,
  ) {
    super();
    this.title = i18n.t("gateway.name");
  }

  protected content({ kit }: PanelContext, width: number): Control {
    const column = kit.column();
    column.addControl(this.wide(kit.subtitle(this.format.money(this.payment.amount, this.payment.currency)), width));
    column.addControl(this.wide(kit.text(this.i18n.t("gateway.reference", { reference: this.payment.reference }), { muted: true }), width));
    column.addControl(this.wide(kit.text(this.i18n.t("gateway.method"), { small: true, muted: true }), width));
    const chips = kit.row(14);
    chips.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    const toggles: Toggle[] = [];
    for (const method of GatewayView.METHODS) {
      const chip = kit.chip(this.i18n.t(`gateway.methods.${method}`), method === this.method, () => {
        this.method = method;
        toggles.forEach((other) => other.setSelected(other === chip));
      });
      toggles.push(chip);
      chips.addControl(chip.control);
    }
    column.addControl(chips);
    column.addControl(this.wide(kit.text(this.i18n.t("gateway.testNotice"), { small: true, muted: true }), width));
    this.status = this.wide(kit.text("", { small: true }), width);
    this.status.fontWeight = "600";
    this.status.color = UiTheme.color.accent;
    column.addControl(this.status);
    return column;
  }

  protected override actions({ kit }: PanelContext): Control[] {
    this.buttons.push(kit.button(this.i18n.t("gateway.reject"), () => void this.choose("REJECTED"), "quiet", 360));
    this.buttons.push(kit.button(this.i18n.t("gateway.approve"), () => void this.choose("APPROVED"), "primary", 400));
    return this.buttons;
  }

  private async choose(result: GatewayResult): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.buttons.forEach((button) => (button.isEnabled = false));
    if (this.status) this.status.text = this.i18n.t("gateway.processing");
    try {
      await this.decide(this.method, result);
    } catch (error) {
      if (this.status) this.status.text = ErrorText.of(this.i18n, error);
      this.busy = false;
      this.buttons.forEach((button) => (button.isEnabled = true));
    }
  }

  private wide<T extends TextBlock>(block: T, width: number): T {
    block.widthInPixels = width;
    return block;
  }
}
