import { Control, type TextBlock } from "@babylonjs/gui";
import type { Id } from "../../../domain/common";
import type { Cart, CartItem } from "../../../domain/commerce";
import type { Localizer } from "../../../i18n/Localizer";
import type { Formatter } from "../../../utils/Formatter";
import { ErrorText } from "../ErrorText";
import { PanelView, type PanelContext } from "../PanelView";
import { UiTheme } from "../UiTheme";

export interface CartActions {
  /** Removes a piece; resolves with the updated cart (the board is drawn again). */
  remove(artworkId: Id): Promise<void>;
  /** Goes on to pay; without it the board has no Continue button. */
  checkout?(): void;
}

/** The cart at the cashier: each piece with its photo and price, the subtotal and Continue. */
export class CartView extends PanelView {
  private static readonly THUMB = 116;
  /** Rows that fit on the paper; the rest are summed up in one line. */
  private static readonly MAX_ROWS = 5;

  readonly title: string;
  private error: TextBlock | null = null;

  constructor(
    private readonly i18n: Localizer,
    private readonly format: Formatter,
    private readonly cart: Cart,
    private readonly act: CartActions,
  ) {
    super();
    this.title = i18n.t("cart.title");
  }

  private get unavailable(): boolean {
    return this.cart.items.some((item) => item.stock <= 0);
  }

  protected content({ kit }: PanelContext, width: number): Control {
    const column = kit.column();
    if (!this.cart.items.length) {
      column.addControl(this.wide(kit.subtitle(this.i18n.t("cart.empty")), width));
      column.addControl(this.wide(kit.text(this.i18n.t("cart.emptyText"), { muted: true }), width));
      return column;
    }
    for (const item of this.cart.items.slice(0, CartView.MAX_ROWS)) column.addControl(this.row(kit, item, width));
    const hidden = this.cart.items.length - CartView.MAX_ROWS;
    if (hidden > 0) column.addControl(this.wide(kit.text(this.i18n.t("shop.moreItems", { count: hidden }), { muted: true }), width));

    const total = this.wide(kit.subtitle(`${this.i18n.t("order.subtotal")}: ${this.format.money(this.cart.subtotal, this.cart.currency)}`), width);
    total.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    column.addControl(total);
    const note = this.unavailable ? this.i18n.t("cart.removeUnavailable") : this.i18n.t("cart.shippingNote");
    const noteText = this.wide(kit.text(note, { small: true, muted: !this.unavailable }), width);
    noteText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    column.addControl(noteText);
    this.error = this.wide(kit.text("", { small: true }), width);
    this.error.color = UiTheme.color.accent;
    column.addControl(this.error);
    return column;
  }

  protected override actions({ kit }: PanelContext): Control[] {
    if (!this.cart.items.length || !this.act.checkout) return [];
    const pay = kit.button(this.i18n.t("cart.checkout"), () => this.act.checkout?.(), "primary", 460);
    pay.isEnabled = !this.unavailable;
    pay.alpha = this.unavailable ? 0.45 : 1;
    return [pay];
  }

  /** One piece: photo, title and price, and the Remove button. */
  private row(kit: PanelContext["kit"], item: CartItem, width: number): Control {
    const row = kit.row(UiTheme.panel.gap);
    row.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    row.addControl(kit.image(item.coverUrl, CartView.THUMB, CartView.THUMB));
    const remove = kit.button(this.i18n.t("cart.remove"), () => void this.remove(item.artworkId), "quiet", 300);
    const texts = kit.column(6);
    texts.widthInPixels = width - CartView.THUMB - remove.widthInPixels - UiTheme.panel.gap * 2;
    texts.addControl(this.wide(kit.text(this.i18n.pick(item.title, item.titleEn)), texts.widthInPixels));
    const price = item.quantity > 1 ? `${item.quantity} × ${this.format.money(item.unitPrice, item.currency)}` : this.format.money(item.unitPrice, item.currency);
    const detail = this.wide(kit.text(item.stock <= 0 ? this.i18n.t("cart.unavailable") : price, { small: true, muted: item.stock > 0 }), texts.widthInPixels);
    if (item.stock <= 0) detail.color = UiTheme.color.accent;
    texts.addControl(detail);
    row.addControl(texts);
    row.addControl(remove);
    return row;
  }

  private async remove(artworkId: Id): Promise<void> {
    try {
      await this.act.remove(artworkId);
    } catch (error) {
      if (this.error) this.error.text = ErrorText.of(this.i18n, error);
    }
  }

  private wide<T extends TextBlock>(block: T, width: number): T {
    block.widthInPixels = width;
    return block;
  }
}
