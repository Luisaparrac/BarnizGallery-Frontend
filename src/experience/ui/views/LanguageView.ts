import { Control } from "@babylonjs/gui";
import type { Language } from "../../../domain/common";
import type { Localizer } from "../../../i18n/Localizer";
import { PanelView, type PanelContext } from "../PanelView";

/** First board of the lobby: Spanish or English. The texts are bilingual on purpose. */
export class LanguageView extends PanelView {
  readonly title: string;
  override readonly closable = false;

  constructor(
    private readonly i18n: Localizer,
    private readonly choose: (language: Language) => void,
  ) {
    super();
    this.title = i18n.t("lobby.languageTitle");
  }

  protected content({ kit }: PanelContext, width: number): Control {
    const column = kit.column();
    const text = kit.text(this.i18n.t("lobby.languageText"), { muted: true });
    text.widthInPixels = width;
    column.addControl(text);
    const buttons = kit.row(40);
    buttons.paddingTopInPixels = 60;
    buttons.addControl(kit.button(this.i18n.t("lobby.spanish"), () => this.choose("es"), "primary", 420));
    buttons.addControl(kit.button(this.i18n.t("lobby.english"), () => this.choose("en"), "primary", 420));
    column.addControl(buttons);
    return column;
  }
}
