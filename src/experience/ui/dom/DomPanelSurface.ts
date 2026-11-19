import { Signal } from "../../../core/Signal";
import { BoardArt } from "../board/BoardArt";
import type { BoardContext, BoardView } from "../board/BoardView";
import { DomUiKit } from "../kit/DomUiKit";

/**
 * Boards drawn in HTML over the canvas: the 3D world stays behind, darkened and blurred, and a
 * centered sheet shows the view. Opening fades and scales in (180 ms), Esc closes it, the focus
 * stays inside the sheet, the pointer lock is released and the keys typed in a field never reach
 * the walk. The sheet scrolls inside when it does not fit.
 */
export class DomPanelSurface {
  private static readonly ANIMATION_MS = 180;
  private static readonly FOCUSABLE = 'input, button, select, textarea, [tabindex]:not([tabindex="-1"])';

  /** The board finished closing (Esc, a button or `close()`). */
  readonly closed = new Signal<void>();

  private readonly kit = new DomUiKit();
  private readonly layer: HTMLDivElement;
  private view: BoardView | null = null;
  private open_ = false;
  private hideTimer = 0;
  private returnFocus: HTMLElement | null = null;

  constructor(private readonly closeLabel: string) {
    this.layer = document.createElement("div");
    this.layer.className = "mu-layer";
    this.layer.hidden = true;
    this.layer.addEventListener("keydown", (event) => this.onKeyDown(event));
    // A click on the darkened world does nothing (the sheet is modal), but it must not reach the canvas.
    this.layer.addEventListener("pointerdown", (event) => event.stopPropagation());
    document.body.append(this.layer);
  }

  get isOpen(): boolean {
    return this.open_;
  }

  get currentView(): BoardView | null {
    return this.view;
  }

  /** Shows a view; if a sheet is already open it is replaced without the animation. */
  open(view: BoardView): void {
    window.clearTimeout(this.hideTimer);
    const wasOpen = this.open_;
    this.view = view;
    this.open_ = true;
    if (!wasOpen) this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (document.pointerLockElement) document.exitPointerLock();

    this.layer.replaceChildren(this.sheet(view));
    this.layer.hidden = false;
    if (!wasOpen) {
      // Next frame, so the transition runs from the closed state.
      requestAnimationFrame(() => this.layer.classList.add("is-open"));
    }
    this.focusFirst();
  }

  close(): void {
    if (!this.open_) return;
    this.open_ = false;
    this.layer.classList.remove("is-open");
    this.hideTimer = window.setTimeout(() => {
      this.layer.hidden = true;
      this.layer.replaceChildren();
      this.view = null;
      this.returnFocus?.focus?.();
      this.closed.emit();
    }, DomPanelSurface.ANIMATION_MS);
  }

  /** Takes the sheet away at once, without the closed event (another board takes its place). */
  dismiss(): void {
    window.clearTimeout(this.hideTimer);
    this.open_ = false;
    this.layer.classList.remove("is-open");
    this.layer.hidden = true;
    this.layer.replaceChildren();
    this.view = null;
  }

  dispose(): void {
    window.clearTimeout(this.hideTimer);
    this.layer.remove();
  }

  /** The sheet: resin band, then a form with header, title and content, then the buttons. */
  private sheet(view: BoardView): HTMLElement {
    const context: BoardContext = { kit: this.kit, close: () => this.close(), closeLabel: this.closeLabel };
    const sheet = document.createElement("section");
    sheet.className = "mu-sheet";
    sheet.dataset.size = view.size;
    sheet.dataset.centered = String(view.centered);
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");

    const band = document.createElement("div");
    band.className = "mu-band";
    band.style.backgroundImage = `url("${BoardArt.resinBand()}")`;
    band.setAttribute("aria-hidden", "true");

    const form = document.createElement("form");
    form.className = "mu-sheet-form";
    form.noValidate = true;
    // A real form helps the browser's password manager; Enter is handled by each field.
    form.addEventListener("submit", (event) => event.preventDefault());

    const body = document.createElement("div");
    body.className = "mu-sheet-body";
    const header = view.header(context);
    if (header) {
      const wrap = document.createElement("div");
      wrap.className = "mu-sheet-header";
      wrap.append(DomUiKit.element(header));
      body.append(wrap);
    }
    const title = DomUiKit.element(this.kit.title(view.title));
    title.id = `mu-title-${Date.now()}`;
    sheet.setAttribute("aria-labelledby", title.id);
    body.append(title, DomUiKit.element(view.content(context)));

    const footer = document.createElement("div");
    footer.className = "mu-sheet-footer";
    if (view.closable) footer.append(DomUiKit.element(this.kit.button(this.closeLabel, () => this.close(), "secondary")));
    view.actions(context).forEach((button) => footer.append(DomUiKit.element(button)));

    form.append(body, footer);
    sheet.append(band, form);
    return sheet;
  }

  private focusFirst(): void {
    const sheet = this.layer.querySelector<HTMLElement>(".mu-sheet");
    const target = sheet?.querySelector<HTMLElement>("input") ?? sheet?.querySelector<HTMLElement>(DomPanelSurface.FOCUSABLE);
    target?.focus({ preventScroll: true });
  }

  /** Esc closes; Tab cycles inside the sheet; no key goes on to the walk. */
  private onKeyDown(event: KeyboardEvent): void {
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      if (this.view?.closable) this.close();
      return;
    }
    if (event.key !== "Tab") return;
    const items = [...this.layer.querySelectorAll<HTMLElement>(DomPanelSurface.FOCUSABLE)].filter((item) => !item.hasAttribute("disabled") && item.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
