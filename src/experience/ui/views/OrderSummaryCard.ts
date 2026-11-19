import type { Localizer } from "../../../i18n/Localizer";
import type { SummaryItem, UiKit, UiNode } from "../kit/UiKit";

/** What the order summary shows; amounts already formatted. */
export interface OrderSummary {
  items: SummaryItem[];
  subtotal: string;
  shipping: string;
  total: string;
}

/**
 * The right column of the payment steps: a card a little lighter than the sheet with "Your
 * order (n pieces)", each piece, Subtotal and Shipping, a rule, the Total in large type, the
 * main button across the whole card and quiet notes under it.
 */
export class OrderSummaryCard {
  static build(kit: UiKit, i18n: Localizer, summary: OrderSummary, button: UiNode, notes: UiNode[]): UiNode {
    const card = kit.card();
    const count = summary.items.length;
    card.add(kit.text(count === 1 ? i18n.t("shop.yourOrderOne") : i18n.t("shop.yourOrderMany", { count })));
    const items = kit.column("medium");
    summary.items.forEach((item) => items.add(kit.summaryItem(item)));
    card.add(items);
    card.add(kit.divider());
    const amounts = kit.column("small");
    amounts.add(kit.amount(i18n.t("order.subtotal"), summary.subtotal));
    amounts.add(kit.amount(i18n.t("order.shipping"), summary.shipping));
    card.add(amounts);
    card.add(kit.divider());
    card.add(kit.amount(i18n.t("order.total"), summary.total, true));
    card.add(button);
    if (notes.length) {
      const column = kit.column("small");
      notes.forEach((note) => column.add(note));
      card.add(column);
    }
    return card;
  }
}
