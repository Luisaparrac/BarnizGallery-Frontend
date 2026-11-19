import type { Button, Control, TextBlock } from "@babylonjs/gui";
import type { Payment } from "../../../domain/commerce";
import type { Localizer } from "../../../i18n/Localizer";
import type { Formatter } from "../../../utils/Formatter";
import { ErrorText } from "../ErrorText";
import { PanelView, type PanelContext } from "../PanelView";
import { UiTheme } from "../UiTheme";

export interface ExternalPaymentActions {
  /** Opens the gateway's page in a new tab (again). */
  open(): void;
  /** Asks the backend about the payment; resolves false while it is still pending. */
  checkPaid(): Promise<boolean>;
}

/**
 * A real gateway pays in its own page: it opens in a new tab and this board waits for the
 * visitor to come back and press "I already paid".
 */
export class ExternalPaymentView extends PanelView {
  override readonly closable = false;
  readonly title: string;
  private status: TextBlock | null = null;
  private paidButton: Button | null = null;
  private busy = false;

  constructor(
    private readonly i18n: Localizer,
    private readonly format: Formatter,
    private readonly payment: Payment,
    private readonly act: ExternalPaymentActions,
  ) {
    super();
    this.title = i18n.t("shop.externalTitle");
  }

  protected content({ kit }: PanelContext, width: number): Control {
    const column = kit.column();
    const wide = <T extends TextBlock>(block: T) => {
      block.widthInPixels = width;
      return block;
    };
    column.addControl(wide(kit.subtitle(this.format.money(this.payment.amount, this.payment.currency))));
    column.addControl(wide(kit.text(this.i18n.t("gateway.reference", { reference: this.payment.reference }), { muted: true })));
    column.addControl(wide(kit.text(this.i18n.t("shop.externalText"))));
    this.status = wide(kit.text("", { small: true }));
    this.status.fontWeight = "600";
    this.status.color = UiTheme.color.accent;
    column.addControl(this.status);
    return column;
  }

  protected override actions({ kit }: PanelContext): Control[] {
    this.paidButton = kit.button(this.i18n.t("shop.paid"), () => void this.check(), "primary", 340);
    return [kit.button(this.i18n.t("shop.reopen"), () => this.act.open(), "quiet", 440), this.paidButton];
  }

  private async check(): Promise<void> {
    if (this.busy || !this.paidButton) return;
    this.busy = true;
    this.paidButton.isEnabled = false;
    if (this.status) this.status.text = this.i18n.t("gateway.processing");
    try {
      const done = await this.act.checkPaid();
      if (!done && this.status) this.status.text = this.i18n.t("shop.notPaidYet");
    } catch (error) {
      if (this.status) this.status.text = ErrorText.of(this.i18n, error);
    } finally {
      this.busy = false;
      this.paidButton.isEnabled = true;
    }
  }
}
