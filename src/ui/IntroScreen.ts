import { Signal } from "../core/Signal";
import { t } from "../i18n/LocaleService";
import type { Language } from "../model/models";
import { h } from "./dom";
import { LanguageSwitch } from "./LanguageSwitch";
import { UiComponent } from "./UiComponent";

/** Full-screen welcome card shown until the visitor clicks "enter". */
export class IntroScreen extends UiComponent {
  readonly enterClicked = new Signal();
  readonly languagePicked = new Signal<Language>();
  readonly element: HTMLElement;

  private readonly tagline = h("p.tagline");
  private readonly description = h("p.intro-p");
  private readonly enterButton = h("button.cta", { type: "button", onclick: () => this.enterClicked.emit() });
  private readonly languageSwitch = new LanguageSwitch(true);

  constructor() {
    super();
    this.languageSwitch.picked.subscribe((language) => this.languagePicked.emit(language));
    this.element = h(
      "section.intro",
      {},
      h("div.intro-card", {}, h("div.intro-mark", { textContent: "M" }), h("h1", { textContent: "MUSEO" }), this.tagline, this.description, this.languageSwitch.element, this.enterButton),
    );
    this.refresh();
  }

  hide(): void {
    this.element.classList.add("hidden");
  }

  refresh(): void {
    this.tagline.textContent = t("tagline");
    this.description.textContent = t("intro_p");
    this.enterButton.textContent = t("enter");
    this.languageSwitch.refresh();
  }
}
