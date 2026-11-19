import { Control, type Button, type TextBlock } from "@babylonjs/gui";
import type { Id } from "../../../domain/common";
import type { Address } from "../../../domain/user";
import type { Localizer } from "../../../i18n/Localizer";
import { BoardArt } from "../board/BoardArt";
import type { BoardKit } from "../board/BoardKit";
import { BoardTheme } from "../board/BoardTheme";
import { BoardView, type BoardContext } from "../board/BoardView";
import { ErrorText } from "../ErrorText";
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
  /** Room of the summary column, in screen pixels. */
  static readonly SUMMARY_WIDTH = 384;

  override readonly closable = false;
  readonly size = "piece" as const;
  readonly title: string;
  private addressId: Id | null;
  private kit: BoardKit | null = null;
  private payButton: Button | null = null;
  private error: TextBlock | null = null;
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
  static steps(i18n: Localizer, kit: BoardKit, current: number): Control {
    return kit.steps([i18n.t("shop.stepAddress"), i18n.t("shop.stepPayment"), i18n.t("shop.stepDone")], current);
  }

  /** The quiet lines under the button: the reservation and, with the test gateway, no charge. */
  static notes(i18n: Localizer, kit: BoardKit, width: number, simulated: boolean): Control[] {
    const notes = [kit.iconNote(BoardArt.icon("lock", BoardTheme.color.inkSoft), i18n.t("shop.reservedNote"), width)];
    if (simulated) notes.push(kit.iconNote(BoardArt.icon("card", BoardTheme.color.inkSoft), i18n.t("shop.testNote"), width));
    return notes;
  }

  override header({ kit }: BoardContext): Control {
    return CheckoutView.steps(this.i18n, kit, 0);
  }

  content({ kit }: BoardContext, width: number): Control {
    this.kit = kit;
    const right = BoardTheme.px(CheckoutView.SUMMARY_WIDTH);
    const leftWidth = width - right - BoardTheme.px(BoardTheme.size.padding);

    const left = kit.column(BoardTheme.size.gapMedium);
    left.widthInPixels = leftWidth;
    left.addControl(kit.text(this.i18n.t("shop.chooseAddress"), leftWidth, true));
    const selected = this.addresses.find((item) => item.id === this.addressId) ?? null;
    const cards = kit.choice(
      this.addresses,
      leftWidth,
      selected,
      (item) => [item.recipientName, this.lines(item)],
      (item) => {
        this.addressId = item.id;
        this.refresh();
      },
      (item) => ({ action: { label: this.i18n.t("shop.edit"), run: () => this.act.editAddress(item) } }),
    );
    cards.addControl(kit.addCard(this.i18n.t("shop.addAddress"), leftWidth, () => this.act.newAddress()));
    left.addControl(cards);
    this.error = kit.note("", leftWidth, "error");
    this.error.isVisible = false;
    left.addControl(this.error);
    const back = kit.link(`← ${this.i18n.t("common.back")}`, () => !this.busy && this.act.back(), BoardTheme.color.ink);
    back.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    left.addControl(back);

    this.payButton = kit.button(this.i18n.t("shop.continueToPay", { total: this.summary.total }), () => void this.pay(), "primary");
    this.refresh();
    const notesWidth = right - BoardTheme.px(BoardTheme.size.gap) * 2;
    const card = OrderSummaryCard.build(kit, this.i18n, this.summary, right, this.payButton, CheckoutView.notes(this.i18n, kit, notesWidth, this.simulatedPayment));
    return kit.columns(left, card);
  }

  /** Street, city and phone under the name. */
  private lines(address: Address): string[] {
    const street = [address.line1, address.line2].filter(Boolean).join(", ");
    const city = [address.city, address.region, address.countryCode].filter(Boolean).join(", ");
    return [street, city, address.phone ? `${this.i18n.t("address.phone")}: ${address.phone}` : ""].filter(Boolean);
  }

  private say(text: string): void {
    if (!this.error) return;
    this.error.text = text;
    this.error.isVisible = text !== "";
  }

  private refresh(): void {
    if (this.payButton && this.kit) this.kit.setEnabled(this.payButton, this.addressId !== null && !this.busy);
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
