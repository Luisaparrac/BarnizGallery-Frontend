import type { Order } from "../../../domain/commerce";
import type { Localizer } from "../../../i18n/Localizer";
import type { Formatter } from "../../../utils/Formatter";
import { BoardView, type BoardContext } from "../board/BoardView";
import type { UiNode } from "../kit/UiKit";

export interface OrdersActions {
  /** An order waiting for its payment: pay it now. */
  pay(order: Order): void;
  back(): void;
}

/** My orders: code, state, date and total; an order waiting for payment can be paid from here. */
export class OrdersView extends BoardView {
  readonly size = "content" as const;
  readonly title: string;

  constructor(
    private readonly i18n: Localizer,
    private readonly format: Formatter,
    private readonly orders: Order[],
    private readonly act: OrdersActions,
  ) {
    super();
    this.title = i18n.t("account.orders");
  }

  content({ kit }: BoardContext): UiNode {
    const column = kit.column("large");
    if (!this.orders.length) {
      column.add(kit.text(this.i18n.t("orders.empty"), true));
    } else {
      const list = kit.column("small");
      for (const order of [...this.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
        const pending = order.status === "PENDING_PAYMENT";
        const lines = [
          `${this.i18n.tx(`status.order.${order.status}`)} · ${this.format.date(order.createdAt)}`,
          `${order.items.map((item) => item.description).join(", ")} · ${this.format.money(order.total, order.currency)}`,
        ];
        if (pending) lines.push(this.i18n.t("account.payPending"));
        list.add(kit.option(order.code, lines, false, () => pending && this.act.pay(order)));
      }
      column.add(list);
    }
    column.add(kit.link(`← ${this.i18n.t("account.title")}`, () => this.act.back(), "ink"));
    return column;
  }
}
