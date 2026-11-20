import { Signal } from "../../core/Signal";
import "./kit/dom-ui.css";

export interface HudLabels {
  cart: string;
  notifications: string;
  account: string;
  controls: string;
  clickToLook: string;
}

/**
 * What stays on screen while walking, in HTML over the canvas so it is always crisp: the
 * interaction prompt, the crosshair, a hint to capture the mouse and the Cart (with its
 * counter), notifications bell (with the unread count), Account and Controls buttons.
 */
export class Hud {
  readonly cartPressed = new Signal();
  readonly notificationsPressed = new Signal();
  readonly accountPressed = new Signal();
  readonly controlsPressed = new Signal();

  private readonly root: HTMLDivElement;
  private readonly crosshair: HTMLDivElement;
  private readonly prompt: HTMLDivElement;
  private readonly hint: HTMLDivElement;
  private readonly cart: HTMLButtonElement;
  private readonly account: HTMLButtonElement;
  private readonly badge: HTMLSpanElement;
  private readonly bellBadge: HTMLSpanElement;
  private locked = false;
  private firstPerson = false;

  constructor(labels: HudLabels) {
    this.root = this.element("div", "mu-hud");
    const toolbar = this.element("nav", "mu-hud-toolbar");
    toolbar.setAttribute("aria-label", "MUSEO");
    this.cart = this.button(labels.cart, this.cartPressed);
    this.badge = this.element("span", "mu-hud-badge");
    this.badge.hidden = true;
    this.cart.append(this.badge);
    const bell = this.button("", this.notificationsPressed);
    bell.classList.add("is-icon");
    bell.setAttribute("aria-label", labels.notifications);
    bell.title = labels.notifications;
    bell.innerHTML =
      '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 3a6 6 0 0 0-6 6v3.6l-1.6 2.7A1 1 0 0 0 5.3 17h13.4a1 1 0 0 0 .9-1.7L18 12.6V9a6 6 0 0 0-6-6Zm-2.5 15.5a2.5 2.5 0 0 0 5 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    this.bellBadge = this.element("span", "mu-hud-badge");
    this.bellBadge.hidden = true;
    bell.append(this.bellBadge);
    this.account = this.button(labels.account, this.accountPressed);
    toolbar.append(this.cart, bell, this.account, this.button(labels.controls, this.controlsPressed));

    this.crosshair = this.element("div", "mu-hud-crosshair");
    this.prompt = this.element("div", "mu-hud-prompt");
    this.prompt.setAttribute("role", "status");
    this.hint = this.element("div", "mu-hud-hint", labels.clickToLook);
    this.root.append(toolbar, this.crosshair, this.prompt, this.hint);
    document.body.append(this.root);

    this.setPrompt(null);
    this.refresh();
  }

  setVisible(visible: boolean): void {
    this.root.hidden = !visible;
  }

  setPrompt(text: string | null): void {
    this.prompt.hidden = text === null;
    this.prompt.textContent = text ?? "";
  }

  setPointerLocked(locked: boolean): void {
    this.locked = locked;
    this.refresh();
  }

  setFirstPerson(firstPerson: boolean): void {
    this.firstPerson = firstPerson;
    this.refresh();
  }

  /** Number of pieces in the cart; null hides the counter (visitor without a cart). */
  setCartCount(count: number | null): void {
    this.badge.hidden = count === null || count <= 0;
    this.badge.textContent = count !== null && count > 9 ? "9+" : String(count ?? 0);
  }

  /** Number of unread notifications; null or 0 hides the counter. */
  setNotificationCount(count: number | null): void {
    this.bellBadge.hidden = count === null || count <= 0;
    this.bellBadge.textContent = count !== null && count > 9 ? "9+" : String(count ?? 0);
  }

  /** Buttons without a board yet stay visible but cannot be pressed. */
  setEnabled(button: "cart" | "account", enabled: boolean): void {
    (button === "cart" ? this.cart : this.account).disabled = !enabled;
  }

  dispose(): void {
    this.root.remove();
  }

  private refresh(): void {
    this.crosshair.hidden = !(this.locked && this.firstPerson);
    this.hint.hidden = this.locked;
  }

  private button(text: string, pressed: Signal): HTMLButtonElement {
    const button = this.element("button", "mu-hud-button", text) as HTMLButtonElement;
    button.type = "button";
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      button.blur();
      pressed.emit();
    });
    return button;
  }

  private element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag);
    element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
}
