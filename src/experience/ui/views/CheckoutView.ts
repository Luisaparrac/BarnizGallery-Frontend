import { Control, type Button, type TextBlock } from "@babylonjs/gui";
import type { Id } from "../../../domain/common";
import type { Cart } from "../../../domain/commerce";
import type { Address } from "../../../domain/user";
import type { Localizer } from "../../../i18n/Localizer";
import type { Formatter } from "../../../utils/Formatter";
import type { BoardKit } from "../board/BoardKit";
import { BoardView, type BoardContext } from "../board/BoardView";
import { ErrorText } from "../ErrorText";

export interface CheckoutActions {
  back(): void;
  newAddress(): void;
  /** Creates the order to the chosen address and goes to the payment. */
  pay(addressId: Id): Promise<void>;
}

/** First step of paying: the shipping address (a card per saved address) and the receipt. */
export class CheckoutView extends BoardView {
  override readonly closable = false;
  readonly size = "content" as const;
  readonly title: string;
  private addressId: Id | null;
  private kit: BoardKit | null = null;
  private payButton: Button | null = null;
  private error: TextBlock | null = null;
  private busy = false;

  constructor(
    private readonly i18n: Localizer,
    private readonly format: Formatter,
    private readonly cart: Cart,
    private readonly addresses: Address[],
    private readonly shippingCost: number,
    selected: Id | null,
    private readonly act: CheckoutActions,
  ) {
    super();
    this.title = i18n.t("checkout.title");
    this.addressId = selected ?? addresses.find((address) => address.isDefault)?.id ?? addresses[0]?.id ?? null;
  }

  /** One line with the whole address. */
  static describe(address: Pick<Address, "recipientName" | "line1" | "line2" | "city" | "region" | "countryCode">): string {
    return `${address.recipientName} · ${CheckoutView.place(address)}`;
  }

  private static place(address: Pick<Address, "line1" | "line2" | "city" | "region" | "countryCode">): string {
    return [address.line1, address.line2, address.city, address.region, address.countryCode].filter(Boolean).join(", ");
  }

  override header({ kit }: BoardContext): Control {
    return kit.steps([this.i18n.t("shop.stepAddress"), this.i18n.t("shop.stepPayment"), this.i18n.t("shop.stepDone")], 0);
  }

  content({ kit }: BoardContext, width: number): Control {
    this.kit = kit;
    const column = kit.column();

    const address = kit.column(16);
    address.addControl(kit.section(this.i18n.t("checkout.address"), width));
    const selected = this.addresses.find((item) => item.id === this.addressId) ?? null;
    address.addControl(
      kit.choice(this.addresses, width, selected, (item) => [item.recipientName, CheckoutView.place(item)], (item) => {
        this.addressId = item.id;
        this.refresh();
      }),
    );
    const add = kit.button(`+ ${this.i18n.t("checkout.newAddress")}`, () => this.act.newAddress(), "secondary");
    add.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    address.addControl(add);
    column.addControl(address);

    const summary = kit.column(16);
    summary.addControl(kit.section(this.i18n.t("checkout.summary"), width));
    const money = (amount: number) => this.format.money(amount, this.cart.currency);
    summary.addControl(
      kit.receipt(
        [
          ...this.cart.items.map((item) => ({ label: this.i18n.pick(item.title, item.titleEn), value: money(item.unitPrice * item.quantity), image: item.coverUrl })),
          { label: this.i18n.t("order.subtotal"), value: money(this.cart.subtotal) },
          { label: this.i18n.t("order.shipping"), value: money(this.shippingCost) },
        ],
        { label: this.i18n.t("order.total"), value: money(this.cart.subtotal + this.shippingCost) },
        width,
      ),
    );
    summary.addControl(kit.note(this.i18n.t("checkout.reservation"), width));
    column.addControl(summary);

    this.error = kit.note("", width, "error");
    this.error.isVisible = false;
    column.addControl(this.error);
    return column;
  }

  override actions({ kit }: BoardContext): Control[] {
    this.payButton = kit.button(this.i18n.t("checkout.pay"), () => void this.pay(), "primary");
    this.refresh();
    return [kit.button(this.i18n.t("common.back"), () => !this.busy && this.act.back(), "secondary"), this.payButton];
  }

  /** The note under the receipt only takes room while it has something to say. */
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
