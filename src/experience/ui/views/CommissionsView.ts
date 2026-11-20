import type { CustomRequest } from "../../../domain/customOrder";
import type { Localizer } from "../../../i18n/Localizer";
import { BoardView, type BoardContext } from "../board/BoardView";
import type { UiButton, UiNode } from "../kit/UiKit";

export interface CommissionsActions {
  open(request: CustomRequest): void;
  create(): void;
}

/** "My custom orders" at the commissions workshop: one card per request and New custom order. */
export class CommissionsView extends BoardView {
  readonly size = "content" as const;
  readonly title: string;

  constructor(
    private readonly i18n: Localizer,
    private readonly requests: CustomRequest[],
    private readonly act: CommissionsActions,
  ) {
    super();
    this.title = i18n.t("custom.title");
  }

  content({ kit }: BoardContext): UiNode {
    const column = kit.column("large");
    column.add(kit.text(this.i18n.t("custom.lead"), true));
    if (!this.requests.length) {
      const empty = kit.column("small");
      empty.add(kit.section(this.i18n.t("custom.empty")));
      empty.add(kit.text(this.i18n.t("custom.emptyText"), true));
      column.add(empty);
      return column;
    }
    const list = kit.column("small");
    for (const request of this.requests) {
      const offers = request.offers.filter((offer) => offer.status === "SENT").length;
      const lines = [this.i18n.tx(`status.customRequest.${request.status}`)];
      if (offers) lines.push(this.i18n.t("custom.offerCount", { count: offers }));
      list.add(kit.option(request.title, lines, false, () => this.act.open(request)));
    }
    column.add(list);
    return column;
  }

  override actions({ kit }: BoardContext): UiButton[] {
    return [kit.button(this.i18n.t("custom.new"), () => this.act.create())];
  }
}
