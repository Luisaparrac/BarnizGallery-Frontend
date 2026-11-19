import type { Control } from "@babylonjs/gui";
import type { Localizer } from "../../../i18n/Localizer";
import type { BoardKit, SummaryItem } from "../board/BoardKit";

/** What the order summary shows; amounts already formatted. */
export interface OrderSummary {
  items: SummaryItem[];
  subtotal: string;
  shipping: string;
  total: string;
}

/**
 * The right column of the payment steps: a card a little lighter than the paper with "Your
 * order (n pieces)", each piece, Subtotal and Shipping, a rule, the Total in large type, the
 * main button across the whole card and quiet notes under it.
 */
export class OrderSummaryCard {
  static build(kit: BoardKit, i18n: Localizer, summary: OrderSummary, width: number, button: Control, notes: Control[]): Control {
    const { card, body } = kit.card(width);
    const inner = body.widthInPixels;
    const count = summary.items.length;
    const heading = count === 1 ? i18n.t("shop.yourOrderOne") : i18n.t("shop.yourOrderMany", { count });
    body.addControl(kit.text(heading, inner));
    const items = kit.column(12);
    summary.items.forEach((item) => items.addControl(kit.summaryItem(item, inner)));
    body.addControl(items);
    body.addControl(kit.divider(inner));
    const amounts = kit.column(4);
    amounts.addControl(kit.amount(i18n.t("order.subtotal"), summary.subtotal, inner));
    amounts.addControl(kit.amount(i18n.t("order.shipping"), summary.shipping, inner));
    body.addControl(amounts);
    body.addControl(kit.divider(inner));
    body.addControl(kit.amount(i18n.t("order.total"), summary.total, inner, true));
    button.widthInPixels = inner;
    body.addControl(button);
    if (notes.length) {
      const column = kit.column(8);
      notes.forEach((note) => column.addControl(note));
      body.addControl(column);
    }
    return card;
  }
}
