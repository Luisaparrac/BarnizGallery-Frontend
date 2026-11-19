import { Button, Container, Control, Ellipse, Image, InputPassword, InputText, Line, Rectangle, StackPanel, TextBlock } from "@babylonjs/gui";
import { ArtworkImageFactory } from "../../../art/ArtworkImageFactory";
import { BoardTheme as T } from "./BoardTheme";

export type BoardButtonVariant = "primary" | "secondary";
export type NoteTone = "muted" | "error" | "success";

/** A labelled field: the block to add to the board and the input to read. */
export interface BoardField {
  control: Control;
  input: InputText;
}

/** A selectable card (addresses, payment methods, demo accounts). */
export interface BoardOption {
  control: Control;
  readonly selected: boolean;
  setSelected(selected: boolean): void;
}

/** One line of a receipt; `image` adds a thumbnail of the piece. */
export interface ReceiptLine {
  label: string;
  value: string;
  image?: string;
}

/**
 * Factory of the pieces every board is made of (titles, texts, fields with a focus ring, option
 * cards, the receipt, the steps and the buttons), with the sizes and colors of the design plan.
 * Widths given to it are texture pixels (screen pixels × BoardTheme.SCALE).
 */
export class BoardKit {
  private count = 0;
  private measurer: CanvasRenderingContext2D | null = null;

  // ---------------------------------------------------------------- text

  title(text: string, width: number): TextBlock {
    return this.block(text, T.font.display, T.type.title, "700", T.color.ink, width);
  }

  section(text: string, width: number): TextBlock {
    return this.block(text, T.font.display, T.type.section, "700", T.color.ink, width);
  }

  text(text: string, width: number, muted = false): TextBlock {
    return this.block(text, T.font.body, T.type.text, "400", muted ? T.color.inkSoft : T.color.ink, width);
  }

  note(text: string, width: number, tone: NoteTone = "muted"): TextBlock {
    const color = tone === "error" ? T.color.red : tone === "success" ? T.color.green : T.color.inkSoft;
    return this.block(text, T.font.body, T.type.note, tone === "muted" ? "400" : "600", color, width);
  }

  // ---------------------------------------------------------------- controls

  /** Label above a 48 px box; while it has the focus a bronze ring surrounds it. */
  field(label: string, width: number, options: { password?: boolean; value?: string; placeholder?: string } = {}): BoardField {
    const block = this.column(T.size.gapSmall);
    block.widthInPixels = width;
    block.addControl(this.block(label, T.font.body, T.type.note, "600", T.color.ink, width));

    const ring = new Rectangle(this.name("fieldRing"));
    ring.widthInPixels = width;
    ring.heightInPixels = T.px(T.size.control);
    ring.cornerRadius = T.px(T.size.radius);
    ring.thickness = T.px(T.size.border);
    ring.color = T.color.line;
    ring.background = T.color.white;

    const input = options.password ? new InputPassword(this.name("password")) : new InputText(this.name("field"));
    input.widthInPixels = width - T.px(T.size.focus) * 2;
    input.heightInPixels = T.px(T.size.control) - T.px(T.size.focus) * 2;
    input.thickness = 0;
    input.background = "transparent";
    input.focusedBackground = "transparent";
    input.color = T.color.ink;
    input.focusedColor = T.color.ink;
    input.placeholderColor = T.color.inkSoft;
    input.placeholderText = options.placeholder ?? "";
    input.text = options.value ?? "";
    input.fontFamily = T.font.body;
    input.fontSizeInPixels = T.px(T.type.text);
    input.paddingLeftInPixels = T.px(T.size.gapMedium) - T.px(T.size.focus);
    input.onFocusObservable.add(() => {
      ring.color = T.color.bronze;
      ring.thickness = T.px(T.size.focus);
    });
    input.onBlurObservable.add(() => {
      ring.color = T.color.line;
      ring.thickness = T.px(T.size.border);
    });
    ring.addControl(input);
    block.addControl(ring);
    return { control: block, input };
  }

  /** Red (primary) or bordered (secondary) button, as wide as its label. */
  button(label: string, onClick: () => void, variant: BoardButtonVariant = "primary"): Button {
    const primary = variant === "primary";
    const button = Button.CreateSimpleButton(this.name("button"), label);
    const font = `600 ${T.px(T.type.button)}px ${T.font.body}`;
    button.widthInPixels = this.measure(label, font) + T.px(T.size.padding) * 1.2;
    button.heightInPixels = T.px(T.size.control);
    button.cornerRadius = T.px(T.size.radius);
    button.thickness = primary ? 0 : T.px(T.size.border);
    button.color = primary ? T.color.paper : T.color.ink;
    button.background = primary ? T.color.red : "transparent";
    button.fontFamily = T.font.body;
    button.fontSizeInPixels = T.px(T.type.button);
    button.fontWeight = "600";
    button.hoverCursor = "pointer";
    button.pointerEnterAnimation = () => (button.background = primary ? T.color.redHover : T.color.paperHover);
    button.pointerOutAnimation = () => (button.background = primary ? T.color.red : "transparent");
    button.pointerDownAnimation = () => (button.scaleX = button.scaleY = 0.97);
    button.pointerUpAnimation = () => (button.scaleX = button.scaleY = 1);
    button.onPointerClickObservable.add(() => {
      if (button.isEnabled) onClick();
    });
    return button;
  }

  /** Enables or disables a button and shows it faded when it cannot be used. */
  setEnabled(button: Button, enabled: boolean): void {
    button.isEnabled = enabled;
    button.alpha = enabled ? 1 : 0.45;
  }

  /** A card with a bold first line and an optional second line; the chosen one shows a green ✓. */
  option(title: string, detail: string | null, width: number, selected: boolean, onSelect: () => void): BoardOption {
    const card = new Rectangle(this.name("option"));
    card.widthInPixels = width;
    card.adaptHeightToChildren = true;
    card.cornerRadius = T.px(T.size.radius);
    card.thickness = T.px(T.size.border);
    card.hoverCursor = "pointer";
    card.isPointerBlocker = true;

    const inner = this.column(4);
    inner.widthInPixels = width - T.px(T.size.gapMedium) * 2 - T.px(40);
    inner.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    inner.leftInPixels = T.px(T.size.gapMedium);
    inner.paddingTopInPixels = T.px(14);
    inner.paddingBottomInPixels = T.px(14);
    inner.addControl(this.block(title, T.font.body, T.type.text, "600", T.color.ink, inner.widthInPixels));
    if (detail) inner.addControl(this.block(detail, T.font.body, T.type.note, "400", T.color.inkSoft, inner.widthInPixels));
    card.addControl(inner);

    const mark = new Ellipse(this.name("optionMark"));
    mark.widthInPixels = mark.heightInPixels = T.px(24);
    mark.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    mark.leftInPixels = -T.px(T.size.gapMedium);
    const check = this.block("✓", T.font.body, 15, "700", T.color.white, T.px(24));
    check.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    mark.addControl(check);
    card.addControl(mark);

    let state = selected;
    const paint = (hover = false) => {
      card.color = state ? T.color.green : T.color.line;
      card.background = hover && !state ? T.color.paperHover : state ? "#2e7d320f" : "transparent";
      mark.background = state ? T.color.green : "transparent";
      mark.thickness = state ? 0 : T.px(T.size.border);
      mark.color = T.color.line;
      check.isVisible = state;
    };
    paint();
    card.onPointerEnterObservable.add(() => paint(true));
    card.onPointerOutObservable.add(() => paint(false));
    card.onPointerClickObservable.add(() => {
      state = true;
      paint();
      onSelect();
    });
    return {
      control: card,
      get selected() {
        return state;
      },
      setSelected(next: boolean) {
        state = next;
        paint();
      },
    };
  }

  /** Several option cards where only one can be chosen. */
  choice<Item>(items: Item[], width: number, selected: Item | null, describe: (item: Item) => [string, string | null], onChange: (item: Item) => void): StackPanel {
    const column = this.column(T.size.gapSmall);
    const options: BoardOption[] = [];
    for (const item of items) {
      const [title, detail] = describe(item);
      const option = this.option(title, detail, width, item === selected, () => {
        options.forEach((other) => other.setSelected(other === option));
        onChange(item);
      });
      options.push(option);
      column.addControl(option.control);
    }
    return column;
  }

  /**
   * A receipt: lines with an optional thumbnail, a dotted leader up to the value, a solid rule
   * and the total in large type.
   */
  receipt(lines: ReceiptLine[], total: ReceiptLine, width: number): StackPanel {
    const column = this.column(T.size.gapSmall);
    column.widthInPixels = width;
    for (const line of lines) column.addControl(this.receiptLine(line, width, false));
    const rule = new Rectangle(this.name("rule"));
    rule.widthInPixels = width;
    rule.heightInPixels = T.px(2);
    rule.thickness = 0;
    rule.background = T.color.ink;
    column.addControl(rule);
    column.addControl(this.receiptLine(total, width, true));
    return column;
  }

  /** Steps of a process, the current one in green: ① Address — ② Payment — ③ Confirmation. */
  steps(labels: string[], current: number): StackPanel {
    const row = this.row(T.size.gapSmall);
    row.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    labels.forEach((label, index) => {
      if (index > 0) {
        const joint = new Rectangle(this.name("stepLine"));
        joint.widthInPixels = T.px(32);
        joint.heightInPixels = T.px(2);
        joint.thickness = 0;
        joint.background = index <= current ? T.color.green : T.color.line;
        row.addControl(joint);
      }
      const done = index < current;
      const active = index === current;
      const dot = new Ellipse(this.name("step"));
      dot.widthInPixels = dot.heightInPixels = T.px(28);
      dot.thickness = done || active ? 0 : T.px(T.size.border);
      dot.color = T.color.line;
      dot.background = done || active ? T.color.green : "transparent";
      const mark = this.block(done ? "✓" : String(index + 1), T.font.body, 14, "700", done || active ? T.color.white : T.color.inkSoft, T.px(28));
      mark.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      dot.addControl(mark);
      row.addControl(dot);
      const name = this.block(label, T.font.body, T.type.note, active ? "700" : "500", active ? T.color.ink : T.color.inkSoft, 0);
      name.textWrapping = false;
      name.resizeToFit = true;
      row.addControl(name);
    });
    return row;
  }

  image(url: string, width: number, height: number): Rectangle {
    const frame = new Rectangle(this.name("imageFrame"));
    frame.widthInPixels = width;
    frame.heightInPixels = height;
    frame.cornerRadius = T.px(6);
    frame.thickness = T.px(1);
    frame.color = T.color.line;
    frame.background = T.color.white;
    const picture = new Image(this.name("image"), ArtworkImageFactory.resolve(url));
    picture.stretch = Image.STRETCH_UNIFORM;
    frame.addControl(picture);
    return frame;
  }

  column(spacing: number = T.size.gap): StackPanel {
    const stack = new StackPanel(this.name("column"));
    stack.isVertical = true;
    stack.spacing = T.px(spacing);
    stack.adaptHeightToChildren = true;
    return stack;
  }

  row(spacing: number = T.size.gapMedium): StackPanel {
    const stack = new StackPanel(this.name("row"));
    stack.isVertical = false;
    stack.spacing = T.px(spacing);
    stack.adaptHeightToChildren = true;
    stack.adaptWidthToChildren = true;
    return stack;
  }

  /** Width of a text in texture pixels. */
  measure(text: string, font: string): number {
    this.measurer ??= document.createElement("canvas").getContext("2d");
    if (!this.measurer) return text.length * T.px(9);
    this.measurer.font = font;
    return Math.ceil(this.measurer.measureText(text).width);
  }

  // ---------------------------------------------------------------- helpers

  private receiptLine(line: ReceiptLine, width: number, total: boolean): Control {
    const size = total ? T.type.section : T.type.text;
    const family = total ? T.font.display : T.font.body;
    const weight = total ? "700" : "400";
    const height = Math.max(T.px(line.image ? 56 : size * 1.5), T.px(size * 1.5));
    const box = new Container(this.name("receiptLine"));
    box.widthInPixels = width;
    box.heightInPixels = height;

    let left = 0;
    if (line.image) {
      const thumb = this.image(line.image, T.px(56), T.px(56));
      thumb.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      box.addControl(thumb);
      left = T.px(56) + T.px(T.size.gapMedium);
    }
    const font = `${weight} ${T.px(size)}px ${family}`;
    const valueWidth = this.measure(line.value, font);
    const labelWidth = Math.min(this.measure(line.label, font), width - left - valueWidth - T.px(48));

    const label = this.block(line.label, family, size, weight, T.color.ink, labelWidth + T.px(4));
    label.textWrapping = false;
    label.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    label.leftInPixels = left;
    label.resizeToFit = false;
    label.heightInPixels = height;
    label.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    box.addControl(label);

    const value = this.block(line.value, family, size, weight, T.color.ink, valueWidth + T.px(4));
    value.textWrapping = false;
    value.resizeToFit = false;
    value.heightInPixels = height;
    value.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    value.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    value.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    box.addControl(value);

    if (!total) {
      const leader = new Line(this.name("leader"));
      leader.x1 = left + labelWidth + T.px(12);
      leader.x2 = width - valueWidth - T.px(12);
      leader.y1 = leader.y2 = height / 2 + T.px(size * 0.35);
      leader.lineWidth = T.px(1.5);
      leader.dash = [T.px(2), T.px(5)];
      leader.color = T.color.line;
      box.addControl(leader);
    }
    return box;
  }

  private block(text: string, family: string, size: number, weight: string, color: string, width: number): TextBlock {
    const block = new TextBlock(this.name("text"), text);
    block.fontFamily = family;
    block.fontSizeInPixels = T.px(size);
    block.fontWeight = weight;
    block.color = color;
    block.textWrapping = true;
    block.resizeToFit = true;
    block.lineSpacing = `${T.px(size * 0.4)}px`;
    block.clipContent = false;
    block.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    if (width > 0) block.widthInPixels = width;
    return block;
  }

  private name(kind: string): string {
    this.count += 1;
    return `${kind}-${this.count}`;
  }
}
