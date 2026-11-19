import { Control, type Button, type TextBlock } from "@babylonjs/gui";
import type { Payment, PaymentMethod } from "../../../domain/commerce";
import type { Localizer } from "../../../i18n/Localizer";
import { BoardArt } from "../board/BoardArt";
import type { BoardKit } from "../board/BoardKit";
import { BoardTheme } from "../board/BoardTheme";
import { BoardView, type BoardContext } from "../board/BoardView";
import { ErrorText } from "../ErrorText";
import { CheckoutView } from "./CheckoutView";
import { OrderSummaryCard, type OrderSummary } from "./OrderSummaryCard";

export type GatewayResult = "APPROVED" | "REJECTED";

/**
 * Step 2 of paying, at the simulated gateway: on the left the payment methods as cards with an
 * icon, on the right the order summary with Pay. A quiet link plays a rejected payment. No card
 * data is asked and no money moves.
 */
export class GatewayView extends BoardView {
  private static readonly METHODS: { method: PaymentMethod; icon: "card" | "bank" | "phone" }[] = [
    { method: "CARD", icon: "card" },
    { method: "PSE", icon: "bank" },
    { method: "NEQUI", icon: "phone" },
  ];

  override readonly closable = false;
  readonly size = "piece" as const;
  readonly title: string;
  private method: PaymentMethod = "CARD";
  private kit: BoardKit | null = null;
  private status: TextBlock | null = null;
  private payButton: Button | null = null;
  private busy = false;

  constructor(
    private readonly i18n: Localizer,
    private readonly summary: OrderSummary,
    private readonly payment: Payment,
    private readonly decide: (method: PaymentMethod, result: GatewayResult) => Promise<void>,
  ) {
    super();
    this.title = i18n.t("shop.stepPayment");
  }

  override header({ kit }: BoardContext): Control {
    return CheckoutView.steps(this.i18n, kit, 1);
  }

  content({ kit }: BoardContext, width: number): Control {
    this.kit = kit;
    const right = BoardTheme.px(CheckoutView.SUMMARY_WIDTH);
    const leftWidth = width - right - BoardTheme.px(BoardTheme.size.padding);

    const left = kit.column(BoardTheme.size.gapMedium);
    left.widthInPixels = leftWidth;
    left.addControl(kit.text(this.i18n.t("shop.chooseMethod"), leftWidth, true));
    const current = GatewayView.METHODS.find((item) => item.method === this.method) ?? null;
    left.addControl(
      kit.choice(
        GatewayView.METHODS,
        leftWidth,
        current,
        (item) => [this.i18n.t(`gateway.methods.${item.method}`), this.i18n.t(`shop.methodDetail.${item.method}`)],
        (item) => (this.method = item.method),
        (item) => ({ icon: BoardArt.icon(item.icon) }),
      ),
    );
    left.addControl(kit.note(this.i18n.t("gateway.reference", { reference: this.payment.reference }), leftWidth));
    this.status = kit.note("", leftWidth, "error");
    this.status.isVisible = false;
    left.addControl(this.status);

    this.payButton = kit.button(this.i18n.t("shop.payTotal", { total: this.summary.total }), () => void this.choose("APPROVED"), "primary");
    const notesWidth = right - BoardTheme.px(BoardTheme.size.gap) * 2;
    const notes = CheckoutView.notes(this.i18n, kit, notesWidth, true);
    const reject = kit.link(this.i18n.t("shop.simulateReject"), () => void this.choose("REJECTED"), BoardTheme.color.inkSoft);
    reject.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    notes.push(reject);
    return kit.columns(left, OrderSummaryCard.build(kit, this.i18n, this.summary, right, this.payButton, notes));
  }

  private say(text: string, error: boolean): void {
    if (!this.status) return;
    this.status.text = text;
    this.status.color = error ? BoardTheme.color.red : BoardTheme.color.inkSoft;
    this.status.isVisible = text !== "";
  }

  private async choose(result: GatewayResult): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    if (this.payButton && this.kit) this.kit.setEnabled(this.payButton, false);
    this.say(this.i18n.t("gateway.processing"), false);
    try {
      await this.decide(this.method, result);
    } catch (error) {
      this.say(ErrorText.of(this.i18n, error), true);
      this.busy = false;
      if (this.payButton && this.kit) this.kit.setEnabled(this.payButton, true);
    }
  }
}
