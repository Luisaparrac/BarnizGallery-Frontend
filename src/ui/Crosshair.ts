import { h } from "./dom";
import { UiComponent } from "./UiComponent";

/** Centre dot shown in first-person view. */
export class Crosshair extends UiComponent {
  readonly element = h("div.crosshair");

  setVisible(visible: boolean): void {
    this.element.classList.toggle("on", visible);
  }

  refresh(): void {}
}
