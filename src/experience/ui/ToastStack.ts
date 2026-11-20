/** One pop-up message. */
export interface Toast {
  icon: string;
  title: string;
  body: string | null;
  /** Opens what the message is about; the toast closes when clicked. */
  open?: () => void;
}

/**
 * Pop-up messages in the top right corner, in HTML over the canvas (they stay visible while a board
 * is open). Each one closes by itself after a few seconds, or when clicked.
 */
export class ToastStack {
  private static readonly DURATION_MS = 9000;
  private static readonly MAX = 3;
  private readonly root: HTMLDivElement;

  constructor() {
    this.root = document.createElement("div");
    this.root.className = "mu-toasts";
    this.root.setAttribute("role", "status");
    this.root.setAttribute("aria-live", "polite");
    document.body.append(this.root);
  }

  show(toast: Toast): void {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "mu-toast";
    const icon = document.createElement("span");
    icon.className = "mu-toast-icon";
    icon.textContent = toast.icon;
    icon.setAttribute("aria-hidden", "true");
    const text = document.createElement("span");
    text.className = "mu-toast-text";
    const title = document.createElement("strong");
    title.textContent = toast.title;
    text.append(title);
    if (toast.body) {
      const body = document.createElement("span");
      body.textContent = toast.body;
      text.append(body);
    }
    item.append(icon, text);
    const close = () => {
      item.classList.add("is-leaving");
      window.setTimeout(() => item.remove(), 250);
    };
    item.addEventListener("click", (event) => {
      event.stopPropagation();
      close();
      toast.open?.();
    });
    this.root.prepend(item);
    while (this.root.children.length > ToastStack.MAX) this.root.lastElementChild?.remove();
    window.setTimeout(close, ToastStack.DURATION_MS);
  }

  dispose(): void {
    this.root.remove();
  }
}
