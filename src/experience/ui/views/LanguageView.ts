import type { Language } from "../../../domain/common";
import type { Localizer } from "../../../i18n/Localizer";
import { BoardView, type BoardContext } from "../board/BoardView";
import type { UiNode } from "../kit/UiKit";

/** First board of the lobby: Spanish or English. The texts are bilingual on purpose. */
export class LanguageView extends BoardView {
  override readonly closable = false;
  override readonly centered = true;
  readonly size = "form" as const;
  readonly title: string;

  constructor(
    private readonly i18n: Localizer,
    private readonly choose: (language: Language) => void,
  ) {
    super();
    this.title = i18n.t("lobby.languageTitle");
  }

  content({ kit }: BoardContext): UiNode {
    const column = kit.column("large", "center");
    column.add(kit.text(this.i18n.t("lobby.languageText"), true));
    const buttons = kit.row("medium", "center");
    buttons.add(kit.button(this.i18n.t("lobby.spanish"), () => this.choose("es")));
    buttons.add(kit.button(this.i18n.t("lobby.english"), () => this.choose("en")));
    column.add(buttons);
    return column;
  }
}
