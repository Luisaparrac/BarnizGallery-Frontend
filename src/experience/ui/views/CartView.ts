import type { Id } from "../../../domain/common";
import type { Cart } from "../../../domain/commerce";
import type { Localizer } from "../../../i18n/Localizer";
import type { Formatter } from "../../../utils/Formatter";
import { BoardView, type BoardContext } from "../board/BoardView";
import { ErrorText } from "../ErrorText";
import type { UiButton, UiNode, UiText } from "../kit/UiKit";

export interface CartActions {
  /** Removes a piece; the flow draws the board again. */
  remove(artworkId: Id): Promise<void>;
  /** Goes on to pay; without it the board has no Continue button. */
  checkout?(): void;
}

/** The cart at the cashier: each piece with its photo, workshop and price, Remove, the subtotal and Continue. */
export class CartView extends BoardView {
  readonly size = "content" as const;
  readonly title: string;
  private error: UiText | null = null;

  constructor(
    private readonly i18n: Localizer,
    private readonly format: Formatter,
    private readonly cart: Cart,
    /** Name of each piece's workshop, by store id. */
    private readonly stores: Map<Id, string>,
    private readonly act: CartActions,
  ) {
    super();
    this.title = i18n.t("cart.title");
  }

  private get unavailable(): boolean {
    return this.cart.items.some((item) => item.stock <= 0);
  }

  content({ kit }: BoardContext): UiNode {
    const column = kit.column("large");
    if (!this.cart.items.length) {
      column.add(kit.section(this.i18n.t("cart.empty")));
      column.add(kit.text(this.i18n.t("cart.emptyText"), true));
      return column;
    }
    const items = kit.column("medium");
    for (const item of this.cart.items) {
      const block = kit.column("small");
      const available = item.stock > 0;
      block.add(
        kit.summaryItem({
          image: item.coverUrl,
          title: this.i18n.pick(item.title, item.titleEn),
          detail: available ? (this.stores.get(item.storeId) ?? "") : this.i18n.t("cart.unavailable"),
          price: item.quantity > 1 ? `${item.quantity} × ${this.format.money(item.unitPrice, item.currency)}` : this.format.money(item.unitPrice, item.currency),
        }),
      );
      block.add(kit.link(this.i18n.t("cart.remove"), () => void this.remove(item.artworkId), "muted"));
      items.add(block);
    }
    column.add(items);
    column.add(kit.divider());
    column.add(kit.amount(this.i18n.t("order.subtotal"), this.format.money(this.cart.subtotal, this.cart.currency), true));
    column.add(kit.note(this.unavailable ? this.i18n.t("cart.removeUnavailable") : this.i18n.t("cart.shippingNote"), this.unavailable ? "error" : "muted"));
    this.error = kit.note("", "error");
    this.error.setVisible(false);
    column.add(this.error);
    return column;
  }

  override actions({ kit }: BoardContext): UiButton[] {
    if (!this.cart.items.length || !this.act.checkout) return [];
    const pay = kit.button(this.i18n.t("cart.checkout"), () => this.act.checkout?.());
    pay.setEnabled(!this.unavailable);
    return [pay];
  }

  private async remove(artworkId: Id): Promise<void> {
    try {
      await this.act.remove(artworkId);
    } catch (error) {
      this.error?.setText(ErrorText.of(this.i18n, error));
      this.error?.setVisible(true);
    }
  }
}
