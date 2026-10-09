import { LocaleService } from "../i18n/LocaleService";
import type { Language } from "../model/models";
import { Signal } from "../core/Signal";
import { h } from "./dom";
import { UiComponent } from "./UiComponent";

/** ES | EN segmented control. */
export class LanguageSwitch extends UiComponent {
  readonly picked = new Signal<Language>();
  readonly element: HTMLElement;
  private readonly buttons = new Map<Language, HTMLButtonElement>();

  constructor(large = false) {
    super();
    this.element = h("div.seg");
    this.element.classList.toggle("big", large);
    for (const language of ["es", "en"] as Language[]) {
      const label = large ? (language === "es" ? "Español" : "English") : language.toUpperCase();
      const button = h("button", { type: "button", textContent: label, onclick: () => this.picked.emit(language) });
      this.buttons.set(language, button);
      this.element.append(button);
    }
    this.refresh();
  }

  refresh(): void {
    const active = LocaleService.instance.language;
    this.buttons.forEach((button, language) => button.classList.toggle("on", language === active));
  }
}
