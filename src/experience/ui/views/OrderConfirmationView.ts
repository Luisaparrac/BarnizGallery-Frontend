import { Control, Rectangle, type TextBlock } from "@babylonjs/gui";
import type { Order } from "../../../domain/commerce";
import type { Localizer } from "../../../i18n/Localizer";
import type { Formatter } from "../../../utils/Formatter";
import { BoardTheme } from "../board/BoardTheme";
import { BoardView, type BoardContext } from "../board/BoardView";
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

  override header({ kit }: BoardContext): Control {
    return CheckoutView.steps(this.i18n, kit, 2);
  }

  content({ kit }: BoardContext, width: number): Control {
    const center = <T extends TextBlock>(block: T) => {
      block.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      return block;
    };
    const column = kit.column(BoardTheme.size.gap);
    column.widthInPixels = width;
    column.addControl(kit.bigCheck());
    column.addControl(center(kit.text(this.i18n.t("gateway.result.APPROVED"), width)));

    // The order code in a box, the one thing to remember.
    const box = new Rectangle("orderCode");
    box.widthInPixels = BoardTheme.px(420);
    box.adaptHeightToChildren = true;
    box.cornerRadius = BoardTheme.px(BoardTheme.size.radius);
    box.thickness = BoardTheme.px(BoardTheme.size.border);
    box.color = BoardTheme.color.green;
    box.background = BoardTheme.color.card;
    const code = kit.column(4);
    code.paddingTopInPixels = code.paddingBottomInPixels = BoardTheme.px(BoardTheme.size.gapMedium);
    code.addControl(center(kit.note(this.i18n.t("shop.orderCodeLabel"), box.widthInPixels)));
    const value = center(kit.section(this.order.code, box.widthInPixels));
    value.color = BoardTheme.color.green;
    code.addControl(value);
    box.addControl(code);
    column.addControl(box);

    const details = kit.column(4);
    for (const item of this.order.items.slice(0, 4)) {
      details.addControl(center(kit.note(`${item.description} · ${this.format.money(item.lineTotal, this.order.currency)}`, width)));
    }
    if (this.order.shippingAddress) {
      details.addControl(center(kit.note(`${this.i18n.t("checkout.address")}: ${CheckoutView.describe(this.order.shippingAddress)}`, width)));
    }
    details.addControl(center(kit.text(`${this.i18n.t("order.total")}: ${this.format.money(this.order.total, this.order.currency)}`, width)));
    column.addControl(details);
    column.addControl(kit.button(this.i18n.t("shop.keepTouring"), () => this.keepTouring(), "primary"));
    return column;
  }
}
