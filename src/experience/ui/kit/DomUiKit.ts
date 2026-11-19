import { ArtworkImageFactory } from "../../../art/ArtworkImageFactory";
import type {
  Align,
  ButtonVariant,
  FieldOptions,
  Gap,
  IconName,
  LinkTone,
  NoteTone,
  OptionExtras,
  SummaryItem,
  UiBox,
  UiButton,
  UiField,
  UiKit,
  UiNode,
  UiOption,
  UiText,
} from "./UiKit";
import "./dom-ui.css";

/** A node of the DOM kit: it only wraps its element. */
class DomNode implements UiNode {
  readonly __uiNode = true as const;
  constructor(readonly element: HTMLElement) {}
}

class DomBox extends DomNode implements UiBox {
  add(child: UiNode): void {
    this.element.append(DomUiKit.element(child));
  }
}

class DomText extends DomNode implements UiText {
  setText(text: string): void {
    this.element.textContent = text;
  }

  setTone(tone: NoteTone): void {
    this.element.dataset.tone = tone;
  }

  setVisible(visible: boolean): void {
    this.element.hidden = !visible;
  }
}

class DomButton extends DomNode implements UiButton {
  private run: () => void;

  constructor(
    readonly button: HTMLButtonElement,
    run: () => void,
  ) {
    super(button);
    this.run = run;
    button.addEventListener("click", () => this.run());
  }

  setEnabled(enabled: boolean): void {
    this.button.disabled = !enabled;
  }

  setLabel(label: string): void {
    this.button.textContent = label;
  }

  onClick(run: () => void): void {
    this.run = run;
  }
}

class DomField extends DomNode implements UiField {
  constructor(
    element: HTMLElement,
    private readonly input: HTMLInputElement,
  ) {
    super(element);
  }

  get value(): string {
    return this.input.value;
  }

  setValue(value: string): void {
    this.input.value = value;
  }

  onEnter(run: () => void): void {
    this.input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      run();
    });
  }
}

class DomOption extends DomNode implements UiOption {
  constructor(
    element: HTMLElement,
    private state: boolean,
  ) {
    super(element);
    this.paint();
  }

  get selected(): boolean {
    return this.state;
  }

  setSelected(selected: boolean): void {
    this.state = selected;
    this.paint();
  }

  private paint(): void {
    this.element.setAttribute("aria-checked", String(this.state));
    this.element.classList.toggle("is-selected", this.state);
  }
}

/** Line icons as inline SVG (they follow the text color). */
const ICONS: Record<IconName, string> = {
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  card: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h4"/>',
  bank: '<path d="M3 10 12 5l9 5M5 10v7M10 10v7M14 10v7M19 10v7M3 20h18"/>',
  phone: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
};

/**
 * Draws the boards with real HTML and CSS (concrete factory of UiKit): crisp text at any size,
 * real form fields with autocomplete, focus rings and scrolling handled by the browser.
 */
export class DomUiKit implements UiKit {
  private count = 0;

  /** The element of a node made by this kit. */
  static element(node: UiNode): HTMLElement {
    if (!(node instanceof DomNode)) throw new Error("DomUiKit: this node was made by another kit");
    return node.element;
  }

  title(text: string): UiText {
    return new DomText(this.tag("h2", "mu-title", text));
  }

  section(text: string): UiText {
    return new DomText(this.tag("h3", "mu-section", text));
  }

  text(text: string, muted = false): UiText {
    return new DomText(this.tag("p", muted ? "mu-text is-muted" : "mu-text", text));
  }

  note(text: string, tone: NoteTone = "muted"): UiText {
    const note = new DomText(this.tag("p", "mu-note", text));
    note.setTone(tone);
    if (tone === "error") note.element.setAttribute("role", "alert");
    return note;
  }

  link(label: string, onClick: () => void, tone: LinkTone = "accent"): UiNode {
    const link = this.tag("button", `mu-link is-${tone}`, label) as HTMLButtonElement;
    link.type = "button";
    link.addEventListener("click", onClick);
    return new DomNode(link);
  }

  field(label: string, options: FieldOptions = {}): UiField {
    const id = this.id("field");
    const wrap = this.tag("div", "mu-field");
    const caption = this.tag("label", "mu-label", label) as HTMLLabelElement;
    caption.htmlFor = id;
    const input = document.createElement("input");
    input.id = id;
    input.className = "mu-input";
    input.type = options.password ? "password" : (options.type ?? "text");
    input.value = options.value ?? "";
    input.placeholder = options.placeholder ?? "";
    if (options.autocomplete) input.autocomplete = options.autocomplete as AutoFill;
    input.spellcheck = false;
    wrap.append(caption, input);
    return new DomField(wrap, input);
  }

  button(label: string, onClick: () => void, variant: ButtonVariant = "primary", fullWidth = false): UiButton {
    const button = this.tag("button", `mu-button is-${variant}${fullWidth ? " is-wide" : ""}`, label) as HTMLButtonElement;
    button.type = "button";
    return new DomButton(button, onClick);
  }

  option(title: string, details: string | string[] | null, selected: boolean, onSelect: () => void, extras: OptionExtras = {}): UiOption {
    const card = this.tag("div", "mu-option");
    card.tabIndex = 0;
    card.setAttribute("role", "radio");
    if (extras.icon) card.append(this.icon(extras.icon, "mu-option-icon"));
    const body = this.tag("div", "mu-option-body");
    body.append(this.tag("strong", "mu-option-title", title));
    for (const line of details === null ? [] : Array.isArray(details) ? details : [details]) body.append(this.tag("span", "mu-option-line", line));
    card.append(body);
    if (extras.action) {
      const action = extras.action;
      const link = this.tag("button", "mu-link is-accent", action.label) as HTMLButtonElement;
      link.type = "button";
      link.addEventListener("click", (event) => {
        event.stopPropagation();
        action.run();
      });
      card.append(link);
    }
    card.append(this.tag("span", "mu-check"));
    const option = new DomOption(card, selected);
    const choose = () => {
      option.setSelected(true);
      onSelect();
    };
    card.addEventListener("click", choose);
    card.addEventListener("keydown", (event) => {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        choose();
      }
    });
    return option;
  }

  choice<Item>(
    items: Item[],
    selected: Item | null,
    describe: (item: Item) => [string, string | string[] | null],
    onChange: (item: Item) => void,
    extras: (item: Item) => OptionExtras = () => ({}),
  ): UiBox {
    const group = new DomBox(this.tag("div", "mu-choice"));
    group.element.setAttribute("role", "radiogroup");
    const options: UiOption[] = [];
    for (const item of items) {
      const [title, details] = describe(item);
      const option = this.option(
        title,
        details,
        item === selected,
        () => {
          options.forEach((other) => other.setSelected(other === option));
          onChange(item);
        },
        extras(item),
      );
      options.push(option);
      group.add(option);
    }
    return group;
  }

  addCard(label: string, onClick: () => void): UiNode {
    const card = this.tag("button", "mu-add") as HTMLButtonElement;
    card.type = "button";
    card.append(this.icon("plus", "mu-add-icon"), this.tag("span", "", label));
    card.addEventListener("click", onClick);
    return new DomNode(card);
  }

  steps(labels: string[], current: number): UiNode {
    const list = this.tag("ol", "mu-steps");
    labels.forEach((label, index) => {
      const step = this.tag("li", index < current ? "is-done" : index === current ? "is-current" : "");
      if (index === current) step.setAttribute("aria-current", "step");
      step.append(this.tag("span", "mu-step-dot", index < current ? "✓" : String(index + 1)), this.tag("span", "mu-step-label", label));
      list.append(step);
    });
    return new DomNode(list);
  }

  column(gap: Gap = "large", align: Align = "start"): UiBox {
    return new DomBox(this.tag("div", `mu-column gap-${gap} align-${align}`));
  }

  row(gap: Gap = "medium", align: Align = "start"): UiBox {
    return new DomBox(this.tag("div", `mu-row gap-${gap} align-${align}`));
  }

  columns(main: UiNode, side: UiNode): UiNode {
    const grid = this.tag("div", "mu-columns");
    grid.append(DomUiKit.element(main), DomUiKit.element(side));
    return new DomNode(grid);
  }

  card(): UiBox {
    return new DomBox(this.tag("section", "mu-card"));
  }

  summaryItem(item: SummaryItem): UiNode {
    const row = this.tag("div", "mu-item");
    const image = document.createElement("img");
    image.className = "mu-thumb";
    image.src = ArtworkImageFactory.resolve(item.image);
    image.alt = "";
    const texts = this.tag("div", "mu-item-texts");
    texts.append(this.tag("strong", "mu-item-title", item.title), this.tag("span", "mu-item-detail", item.detail));
    row.append(image, texts, this.tag("span", "mu-item-price", item.price));
    return new DomNode(row);
  }

  amount(label: string, value: string, total = false): UiNode {
    const row = this.tag("div", total ? "mu-amount is-total" : "mu-amount");
    row.append(this.tag("span", "", label), this.tag("span", "mu-amount-value", value));
    return new DomNode(row);
  }

  divider(): UiNode {
    return new DomNode(this.tag("hr", "mu-divider"));
  }

  iconNote(icon: IconName, text: string): UiNode {
    const note = this.tag("p", "mu-icon-note");
    note.append(this.icon(icon, "mu-note-icon"), this.tag("span", "", text));
    return new DomNode(note);
  }

  bigCheck(): UiNode {
    const check = this.tag("div", "mu-big-check", "✓");
    check.setAttribute("aria-hidden", "true");
    return new DomNode(check);
  }

  highlight(label: string, value: string): UiNode {
    const box = this.tag("div", "mu-highlight");
    box.append(this.tag("span", "mu-highlight-label", label), this.tag("strong", "mu-highlight-value", value));
    return new DomNode(box);
  }

  // ---------------------------------------------------------------- helpers

  private tag(name: string, className: string, text?: string): HTMLElement {
    const element = document.createElement(name);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  private icon(name: IconName, className: string): SVGSVGElement {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", className);
    svg.innerHTML = ICONS[name];
    return svg;
  }

  private id(kind: string): string {
    this.count += 1;
    return `mu-${kind}-${this.count}-${Math.random().toString(36).slice(2, 7)}`;
  }
}
