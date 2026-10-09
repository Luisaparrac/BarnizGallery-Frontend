import { t } from "../i18n/LocaleService";
import { h } from "./dom";
import { UiComponent } from "./UiComponent";

/** Reminds the visitor to click when the mouse pointer has been released (Esc). */
export class ClickHint extends UiComponent {
  readonly element = h("div.click-hint");

  setVisible(visible: boolean): void {
    this.element.classList.toggle("on", visible);
  }

  refresh(): void {
    this.element.textContent = t("enter");
  }
}
