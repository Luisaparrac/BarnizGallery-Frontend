/** Base class of the DOM overlay widgets: each owns one element and knows how to re-render its texts. */
export abstract class UiComponent {
  abstract readonly element: HTMLElement;

  /** Re-applies translated texts and state. Called on language or state changes. */
  abstract refresh(): void;
}
