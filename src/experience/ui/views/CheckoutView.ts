import { Control, type Button, type TextBlock } from "@babylonjs/gui";
import type { Id } from "../../../domain/common";
import type { Cart } from "../../../domain/commerce";
import type { Address } from "../../../domain/user";
import type { Localizer } from "../../../i18n/Localizer";
import type { Formatter } from "../../../utils/Formatter";
import { ErrorText } from "../ErrorText";
import { PanelView, type PanelContext } from "../PanelView";
import type { Toggle } from "../UiKit";
import { UiTheme } from "../UiTheme";

export interface CheckoutActions {
  back(): void;
  newAddress(): void;
  /** Creates the order to the chosen address and goes to the payment. */
  pay(addressId: Id): Promise<void>;
}

/** Shipping address (one of the saved ones or a new one), the order summary and Pay. */
export class CheckoutView extends PanelView {
  override readonly closable = false;
  readonly title: string;
  private addressId: Id | null;
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

  static describe(address: Pick<Address, "recipientName" | "line1" | "line2" | "city" | "region" | "countryCode">): string {
    const place = [address.line1, address.line2, address.city, address.region, address.countryCode].filter(Boolean).join(", ");
    return `${address.recipientName} · ${place}`;
  }

  protected content({ kit }: PanelContext, width: number): Control {
    const column = kit.column();
    column.addControl(this.wide(kit.subtitle(this.i18n.t("checkout.address")), width));
    const choices: Toggle[] = [];
    for (const address of this.addresses) {
      const chip = kit.chip(CheckoutView.describe(address), address.id === this.addressId, () => {
        this.addressId = address.id;
        choices.forEach((other) => other.setSelected(other === chip));
        this.refresh();
      });
      chip.control.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      choices.push(chip);
      column.addControl(chip.control);
    }
    const add = kit.button(this.i18n.t("checkout.newAddress"), () => this.act.newAddress(), "quiet", 420);
    add.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    column.addControl(add);

    column.addControl(this.wide(kit.subtitle(this.i18n.t("checkout.summary")), width));
    const money = (amount: number) => this.format.money(amount, this.cart.currency);
    const lines = [
      `${this.i18n.t("order.subtotal")}: ${money(this.cart.subtotal)} (${this.cart.items.length})`,
      `${this.i18n.t("order.shipping")}: ${money(this.shippingCost)}`,
    ];
    for (const line of lines) column.addControl(this.wide(kit.text(line), width));
    column.addControl(this.wide(kit.subtitle(`${this.i18n.t("order.total")}: ${money(this.cart.subtotal + this.shippingCost)}`), width));
    column.addControl(this.wide(kit.text(this.i18n.t("checkout.reservation"), { small: true, muted: true }), width));
    this.error = this.wide(kit.text("", { small: true }), width);
    this.error.color = UiTheme.color.accent;
    this.error.fontWeight = "600";
    column.addControl(this.error);
    return column;
  }

  protected override actions({ kit }: PanelContext): Control[] {
    this.payButton = kit.button(this.i18n.t("checkout.pay"), () => void this.pay(), "primary", 500);
    this.refresh();
    return [kit.button(this.i18n.t("common.back"), () => !this.busy && this.act.back(), "quiet", 260), this.payButton];
  }

  private refresh(): void {
    if (!this.payButton) return;
    const ready = this.addressId !== null && !this.busy;
    this.payButton.isEnabled = ready;
    this.payButton.alpha = ready ? 1 : 0.45;
  }

  private async pay(): Promise<void> {
    if (this.addressId === null || this.busy) return;
    this.busy = true;
    this.refresh();
    if (this.error) this.error.text = this.i18n.t("checkout.creating");
    try {
      await this.act.pay(this.addressId);
    } catch (error) {
      if (this.error) this.error.text = ErrorText.of(this.i18n, error);
      this.busy = false;
      this.refresh();
    }
  }

  private wide<T extends TextBlock>(block: T, width: number): T {
    block.widthInPixels = width;
    return block;
  }
}
