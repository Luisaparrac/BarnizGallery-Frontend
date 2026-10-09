import { h } from "./dom";
import { UiComponent } from "./UiComponent";

/** Short-lived message above the prompt. */
export class ToastNotifier extends UiComponent {
  readonly element = h("div.toast");
  private timer = 0;

  show(text: string, durationMs = 3600): void {
    this.element.textContent = text;
    this.element.classList.add("on");
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.element.classList.remove("on"), durationMs);
  }

  refresh(): void {}
}
