/**
 * The pieces every board is made of, without saying how they are drawn (Abstract Factory, the
 * abstraction side of a Bridge). Views only talk to this interface; DomUiKit draws with
 * HTML/CSS over the canvas and BabylonUiKit with Babylon GUI on a board in the 3D world.
 *
 * The nodes are opaque: a view can only put them in boxes and use the few handles below.
 * Layout is semantic (columns, rows, a summary column), never in pixels.
 */
export interface UiNode {
  /** Only the kit that made a node can read what is inside. */
  readonly __uiNode: true;
}

export type ButtonVariant = "primary" | "secondary";
export type NoteTone = "muted" | "error" | "success";
export type LinkTone = "accent" | "ink" | "muted";
export type IconName = "lock" | "card" | "bank" | "phone" | "plus";
export type Gap = "small" | "medium" | "large";
export type Align = "start" | "center" | "end";

/** A text that can change after it is shown (errors, notices). */
export interface UiText extends UiNode {
  setText(text: string): void;
  setTone(tone: NoteTone): void;
  /** A hidden text takes no room. */
  setVisible(visible: boolean): void;
}

export interface UiButton extends UiNode {
  setEnabled(enabled: boolean): void;
  setLabel(label: string): void;
  /** Replaces what the button does. */
  onClick(run: () => void): void;
}

export interface FieldOptions {
  password?: boolean;
  value?: string;
  placeholder?: string;
  /** The browser's autocomplete hint: email, current-password, new-password, address-line1… */
  autocomplete?: string;
  type?: "text" | "email" | "tel" | "number" | "date";
  /** The earliest value of a date field (ISO YYYY-MM-DD); the Babylon kit only shows the placeholder. */
  min?: string;
  /** A text area of several lines (descriptions). */
  multiline?: boolean;
}

/** One option of a drop-down list. */
export interface SelectOption {
  value: string;
  label: string;
}

export interface UiField extends UiNode {
  readonly value: string;
  setValue(value: string): void;
  /** Enter in the field. */
  onEnter(run: () => void): void;
}

export interface UiOption extends UiNode {
  readonly selected: boolean;
  setSelected(selected: boolean): void;
}

/** A box other nodes go into. */
export interface UiBox extends UiNode {
  add(child: UiNode): void;
}

/** What else an option card may show: an icon on the left, a text link (Edit) on the right. */
export interface OptionExtras {
  icon?: IconName;
  action?: { label: string; run(): void };
}

/** A piece in an order summary. */
export interface SummaryItem {
  image: string;
  title: string;
  detail: string;
  price: string;
}

export interface UiKit {
  title(text: string): UiText;
  section(text: string): UiText;
  text(text: string, muted?: boolean): UiText;
  note(text: string, tone?: NoteTone): UiText;
  link(label: string, onClick: () => void, tone?: LinkTone): UiNode;

  field(label: string, options?: FieldOptions): UiField;
  button(label: string, onClick: () => void, variant?: ButtonVariant, fullWidth?: boolean): UiButton;

  /** A selectable card: bold title, smaller lines, a ✓ when chosen. */
  option(title: string, details: string | string[] | null, selected: boolean, onSelect: () => void, extras?: OptionExtras): UiOption;
  /** Cards where only one can be chosen. */
  choice<Item>(
    items: Item[],
    selected: Item | null,
    describe: (item: Item) => [string, string | string[] | null],
    onChange: (item: Item) => void,
    extras?: (item: Item) => OptionExtras,
  ): UiBox;
  /** The last card of a list: dashed border, a + and a label. */
  addCard(label: string, onClick: () => void): UiNode;

  /** A drop-down list (on the 3D board, arrows that go through the options). */
  select(label: string, options: SelectOption[], value: string, onChange?: (value: string) => void): UiField;
  /** A chip that can be switched on and off (several can be on). */
  chip(label: string, selected: boolean, onChange: (selected: boolean) => void): UiOption;
  /** A round color sample that can be switched on and off; `hex` null is "multicolor". */
  swatch(hex: string | null, label: string, selected: boolean, onChange: (selected: boolean) => void): UiOption;
  /** A key cap and what it does ("W A S D · Walk"). */
  keyHint(keys: string, description: string): UiNode;
  /** The photos of a piece: a big one and thumbnails that swap it. */
  gallery(urls: string[], description: string): UiNode;
  /** A framed picture with an optional caption (a design proposal). */
  picture(url: string, caption?: string): UiNode;

  /** Steps of a process, the current one in green. */
  steps(labels: string[], current: number): UiNode;

  column(gap?: Gap, align?: Align): UiBox;
  row(gap?: Gap, align?: Align): UiBox;
  /** The main column and, on its right, a summary column of fixed width. */
  columns(main: UiNode, side: UiNode): UiNode;

  /** A card a little lighter than the sheet (the order summary). */
  card(): UiBox;
  summaryItem(item: SummaryItem): UiNode;
  /** "Subtotal …… US$ 310": label left, value right; `total` in large type. */
  amount(label: string, value: string, total?: boolean): UiNode;
  divider(): UiNode;
  iconNote(icon: IconName, text: string): UiNode;
  /** A big green ✓ (a finished order). */
  bigCheck(): UiNode;
  /** A small label and a big value in a framed box (the order code). */
  highlight(label: string, value: string): UiNode;
}
