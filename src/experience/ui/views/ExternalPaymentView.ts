import type { Payment } from "../../../domain/commerce";
import type { Localizer } from "../../../i18n/Localizer";
import type { Formatter } from "../../../utils/Formatter";
import { BoardView, type BoardContext } from "../board/BoardView";
import { ErrorText } from "../ErrorText";
import type { UiButton, UiNode, UiText } from "../kit/UiKit";
import { CheckoutView } from "./CheckoutView";

export interface ExternalPaymentActions {
  /** Opens the gateway's page in a new tab (again). */
  open(): void;
  /** Asks the backend about the payment; resolves false while it is still pending. */
  checkPaid(): Promise<boolean>;
}

/**
 * Step 2 with a real gateway: it pays in its own page, opened in a new tab, and this board waits
 * for the visitor to come back and press "I already paid".
 */
export class ExternalPaymentView extends BoardView {
  override readonly closable = false;
  readonly size = "content" as const;
  readonly title: string;
  private status: UiText | null = null;
  private paidButton: UiButton | null = null;
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

  override header({ kit }: BoardContext): UiNode {
    return CheckoutView.steps(this.i18n, kit, 1);
  }

  content({ kit }: BoardContext): UiNode {
    const column = kit.column("medium");
    column.add(kit.amount(this.i18n.t("order.total"), this.format.money(this.payment.amount, this.payment.currency), true));
    column.add(kit.note(this.i18n.t("gateway.reference", { reference: this.payment.reference })));
    column.add(kit.text(this.i18n.t("shop.externalText")));
    column.add(kit.iconNote("lock", this.i18n.t("shop.reservedNote")));
    this.status = kit.note("", "error");
    this.status.setVisible(false);
    column.add(this.status);
    return column;
  }

  override actions({ kit }: BoardContext): UiButton[] {
    this.paidButton = kit.button(this.i18n.t("shop.paid"), () => void this.check());
    return [kit.button(this.i18n.t("shop.reopen"), () => this.act.open(), "secondary"), this.paidButton];
  }

  private say(text: string, tone: "muted" | "error"): void {
    this.status?.setText(text);
    this.status?.setTone(tone);
    this.status?.setVisible(text !== "");
  }

  private async check(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.paidButton?.setEnabled(false);
    this.say(this.i18n.t("gateway.processing"), "muted");
    try {
      if (!(await this.act.checkPaid())) this.say(this.i18n.t("shop.notPaidYet"), "error");
    } catch (error) {
      this.say(ErrorText.of(this.i18n, error), "error");
    } finally {
      this.busy = false;
      this.paidButton?.setEnabled(true);
    }
  }
}
