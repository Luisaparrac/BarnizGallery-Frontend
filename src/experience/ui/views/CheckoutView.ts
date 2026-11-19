import type { Id } from "../../../domain/common";
import type { Address } from "../../../domain/user";
import type { Localizer } from "../../../i18n/Localizer";
import { BoardView, type BoardContext } from "../board/BoardView";
import { ErrorText } from "../ErrorText";
import type { UiButton, UiKit, UiNode, UiText } from "../kit/UiKit";
import { OrderSummaryCard, type OrderSummary } from "./OrderSummaryCard";

export interface CheckoutActions {
  back(): void;
  newAddress(): void;
  editAddress(address: Address): void;
  /** Creates the order to the chosen address and goes to the payment. */
  pay(addressId: Id): Promise<void>;
}

/**
 * Step 1 of paying, like the checkout of a real shop: on the left the shipping addresses as
 * cards (and a dashed card to add one), on the right the order summary with the button.
 */
export class CheckoutView extends BoardView {
  override readonly closable = false;
  readonly size = "piece" as const;
  readonly title: string;
  private addressId: Id | null;
  private payButton: UiButton | null = null;
  private error: UiText | null = null;
  private busy = false;

  constructor(
    private readonly i18n: Localizer,
    private readonly summary: OrderSummary,
    private readonly addresses: Address[],
    private readonly simulatedPayment: boolean,
    selected: Id | null,
    private readonly act: CheckoutActions,
  ) {
    super();
    this.title = i18n.t("checkout.address");
    this.addressId = selected ?? addresses.find((address) => address.isDefault)?.id ?? addresses[0]?.id ?? null;
  }

  /** One line with the whole address. */
  static describe(address: Pick<Address, "recipientName" | "line1" | "line2" | "city" | "region" | "countryCode">): string {
    return `${address.recipientName} · ${[address.line1, address.line2, address.city, address.region, address.countryCode].filter(Boolean).join(", ")}`;
  }

  /** The steps of paying, shared by the three boards. */
  static steps(i18n: Localizer, kit: UiKit, current: number): UiNode {
    return kit.steps([i18n.t("shop.stepAddress"), i18n.t("shop.stepPayment"), i18n.t("shop.stepDone")], current);
  }

  /** The quiet lines under the button: the reservation and, with the test gateway, no charge. */
  static notes(i18n: Localizer, kit: UiKit, simulated: boolean): UiNode[] {
    const notes = [kit.iconNote("lock", i18n.t("shop.reservedNote"))];
    if (simulated) notes.push(kit.iconNote("card", i18n.t("shop.testNote")));
    return notes;
  }

  override header({ kit }: BoardContext): UiNode {
    return CheckoutView.steps(this.i18n, kit, 0);
  }

  content({ kit }: BoardContext): UiNode {
    const left = kit.column("medium");
    left.add(kit.text(this.i18n.t("shop.chooseAddress"), true));
    const selected = this.addresses.find((item) => item.id === this.addressId) ?? null;
    const cards = kit.choice(
      this.addresses,
      selected,
      (item) => [item.recipientName, this.lines(item)],
      (item) => {
        this.addressId = item.id;
        this.refresh();
      },
      (item) => ({ action: { label: this.i18n.t("shop.edit"), run: () => this.act.editAddress(item) } }),
    );
    cards.add(kit.addCard(this.i18n.t("shop.addAddress"), () => this.act.newAddress()));
    left.add(cards);
    this.error = kit.note("", "error");
    this.error.setVisible(false);
    left.add(this.error);
    left.add(kit.link(`← ${this.i18n.t("common.back")}`, () => !this.busy && this.act.back(), "ink"));

    this.payButton = kit.button(this.i18n.t("shop.continueToPay", { total: this.summary.total }), () => void this.pay(), "primary", true);
    this.refresh();
    return kit.columns(left, OrderSummaryCard.build(kit, this.i18n, this.summary, this.payButton, CheckoutView.notes(this.i18n, kit, this.simulatedPayment)));
  }

  /** Street, city and phone under the name. */
  private lines(address: Address): string[] {
    const street = [address.line1, address.line2].filter(Boolean).join(", ");
    const city = [address.city, address.region, address.countryCode].filter(Boolean).join(", ");
    return [street, city, address.phone ? `${this.i18n.t("address.phone")}: ${address.phone}` : ""].filter(Boolean);
  }

  private say(text: string): void {
    this.error?.setText(text);
    this.error?.setVisible(text !== "");
  }

  private refresh(): void {
    this.payButton?.setEnabled(this.addressId !== null && !this.busy);
  }

  private async pay(): Promise<void> {
    if (this.addressId === null || this.busy) return;
    this.busy = true;
    this.refresh();
    this.say(this.i18n.t("checkout.creating"));
    try {
      await this.act.pay(this.addressId);
    } catch (error) {
      this.say(ErrorText.of(this.i18n, error));
      this.busy = false;
      this.refresh();
    }
  }
}
