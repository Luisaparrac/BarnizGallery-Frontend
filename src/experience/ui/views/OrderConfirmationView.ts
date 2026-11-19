import type { Order } from "../../../domain/commerce";
import type { Localizer } from "../../../i18n/Localizer";
import type { Formatter } from "../../../utils/Formatter";
import { BoardView, type BoardContext } from "../board/BoardView";
import type { UiNode } from "../kit/UiKit";
import { CheckoutView } from "./CheckoutView";

/**
 * Step 3 of paying: one centered column with a big ✓, the order code in a box that stands out,
 * what was bought, where it goes, the total and "Keep touring".
 */
export class OrderConfirmationView extends BoardView {
  /** "Keep touring" closes the board. */
  override readonly closable = false;
  override readonly centered = true;
  readonly size = "content" as const;
  readonly title: string;

  constructor(
    private readonly i18n: Localizer,
    private readonly format: Formatter,
    private readonly order: Order,
    private readonly keepTouring: () => void,
  ) {
    super();
    this.title = i18n.t("shop.confirmedTitle");
  }

  override header({ kit }: BoardContext): UiNode {
    return CheckoutView.steps(this.i18n, kit, 2);
  }

  content({ kit }: BoardContext): UiNode {
    const column = kit.column("large", "center");
    column.add(kit.bigCheck());
    column.add(kit.text(this.i18n.t("gateway.result.APPROVED")));
    column.add(kit.highlight(this.i18n.t("shop.orderCodeLabel"), this.order.code));
    const details = kit.column("small", "center");
    for (const item of this.order.items.slice(0, 4)) details.add(kit.note(`${item.description} · ${this.format.money(item.lineTotal, this.order.currency)}`));
    if (this.order.shippingAddress) details.add(kit.note(`${this.i18n.t("checkout.address")}: ${CheckoutView.describe(this.order.shippingAddress)}`));
    details.add(kit.text(`${this.i18n.t("order.total")}: ${this.format.money(this.order.total, this.order.currency)}`));
    column.add(details);
    column.add(kit.button(this.i18n.t("shop.keepTouring"), () => this.keepTouring()));
    return column;
  }
}
