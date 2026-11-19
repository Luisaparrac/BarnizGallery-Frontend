import type { Payment, PaymentMethod } from "../../../domain/commerce";
import type { Localizer } from "../../../i18n/Localizer";
import { BoardView, type BoardContext } from "../board/BoardView";
import { ErrorText } from "../ErrorText";
import type { IconName, UiButton, UiNode, UiText } from "../kit/UiKit";
import { CheckoutView } from "./CheckoutView";
import { OrderSummaryCard, type OrderSummary } from "./OrderSummaryCard";

export type GatewayResult = "APPROVED" | "REJECTED";

/**
 * Step 2 of paying, at the simulated gateway: on the left the payment methods as cards with an
 * icon, on the right the order summary with Pay. A quiet link plays a rejected payment. No card
 * data is asked and no money moves.
 */
export class GatewayView extends BoardView {
  private static readonly METHODS: { method: PaymentMethod; icon: IconName }[] = [
    { method: "CARD", icon: "card" },
    { method: "PSE", icon: "bank" },
    { method: "NEQUI", icon: "phone" },
  ];

  override readonly closable = false;
  readonly size = "piece" as const;
  readonly title: string;
  private method: PaymentMethod = "CARD";
  private status: UiText | null = null;
  private payButton: UiButton | null = null;
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

  override header({ kit }: BoardContext): UiNode {
    return CheckoutView.steps(this.i18n, kit, 1);
  }

  content({ kit }: BoardContext): UiNode {
    const left = kit.column("medium");
    left.add(kit.text(this.i18n.t("shop.chooseMethod"), true));
    const current = GatewayView.METHODS.find((item) => item.method === this.method) ?? null;
    left.add(
      kit.choice(
        GatewayView.METHODS,
        current,
        (item) => [this.i18n.t(`gateway.methods.${item.method}`), this.i18n.t(`shop.methodDetail.${item.method}`)],
        (item) => (this.method = item.method),
        (item) => ({ icon: item.icon }),
      ),
    );
    left.add(kit.note(this.i18n.t("gateway.reference", { reference: this.payment.reference })));
    this.status = kit.note("", "error");
    this.status.setVisible(false);
    left.add(this.status);

    this.payButton = kit.button(this.i18n.t("shop.payTotal", { total: this.summary.total }), () => void this.choose("APPROVED"), "primary", true);
    const notes = CheckoutView.notes(this.i18n, kit, true);
    notes.push(kit.link(this.i18n.t("shop.simulateReject"), () => void this.choose("REJECTED"), "muted"));
    return kit.columns(left, OrderSummaryCard.build(kit, this.i18n, this.summary, this.payButton, notes));
  }

  private say(text: string, error: boolean): void {
    this.status?.setText(text);
    this.status?.setTone(error ? "error" : "muted");
    this.status?.setVisible(text !== "");
  }

  private async choose(result: GatewayResult): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.payButton?.setEnabled(false);
    this.say(this.i18n.t("gateway.processing"), false);
    try {
      await this.decide(this.method, result);
    } catch (error) {
      this.say(ErrorText.of(this.i18n, error), true);
      this.busy = false;
      this.payButton?.setEnabled(true);
    }
  }
}
