import { h } from "./dom";
import { UiComponent } from "./UiComponent";

/** Contextual hint above the bottom edge ("Press E to ..."). Its text is re-evaluated on every refresh. */
export class PromptBanner extends UiComponent {
  readonly element = h("div.prompt");
  private source: (() => string) | null = null;

  setSource(source: (() => string) | null): void {
    this.source = source;
    this.refresh();
  }

  refresh(): void {
    const text = this.source?.() ?? "";
    this.element.textContent = text;
    this.element.classList.toggle("on", text.length > 0);
  }
}
