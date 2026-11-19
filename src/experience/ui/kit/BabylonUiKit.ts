import { Button, Container, Control, Ellipse, Image, InputPassword, InputText, Rectangle, StackPanel, TextBlock } from "@babylonjs/gui";
import { ArtworkImageFactory } from "../../../art/ArtworkImageFactory";
import { BoardArt } from "../board/BoardArt";
import { BoardTheme as T } from "../board/BoardTheme";
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

/** A node of the Babylon kit: it only wraps its control. */
class BabylonNode implements UiNode {
  readonly __uiNode = true as const;
  constructor(readonly control: Control) {}
}

class BabylonBox extends BabylonNode implements UiBox {
  constructor(
    readonly stack: Container,
    private readonly align: Align = "start",
  ) {
    super(stack);
  }

  add(child: UiNode): void {
    const control = BabylonUiKit.control(child);
    if (this.align !== "start") control.horizontalAlignment = this.align === "center" ? Control.HORIZONTAL_ALIGNMENT_CENTER : Control.HORIZONTAL_ALIGNMENT_RIGHT;
    if (this.align === "center" && control instanceof TextBlock) control.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.stack.addControl(control);
  }
}

class BabylonText extends BabylonNode implements UiText {
  constructor(readonly block: TextBlock) {
    super(block);
  }

  setText(text: string): void {
    this.block.text = text;
  }

  setTone(tone: NoteTone): void {
    this.block.color = tone === "error" ? T.color.red : tone === "success" ? T.color.green : T.color.inkSoft;
    this.block.fontWeight = tone === "muted" ? "400" : "600";
  }

  setVisible(visible: boolean): void {
    this.block.isVisible = visible;
  }
}

class BabylonButton extends BabylonNode implements UiButton {
  private run: () => void;

  constructor(
    readonly button: Button,
    run: () => void,
  ) {
    super(button);
    this.run = run;
    button.onPointerClickObservable.add(() => {
      if (button.isEnabled) this.run();
    });
  }

  setEnabled(enabled: boolean): void {
    this.button.isEnabled = enabled;
    this.button.alpha = enabled ? 1 : 0.45;
  }

  setLabel(label: string): void {
    if (this.button.textBlock) this.button.textBlock.text = label;
  }

  onClick(run: () => void): void {
    this.run = run;
  }
}

class BabylonField extends BabylonNode implements UiField {
  constructor(
    control: Control,
    private readonly input: InputText,
  ) {
    super(control);
  }

  get value(): string {
    return this.input.text;
  }

  setValue(value: string): void {
    this.input.text = value;
  }

  onEnter(run: () => void): void {
    this.input.onKeyboardEventProcessedObservable.add((event) => {
      if (event.key === "Enter") run();
    });
  }
}

class BabylonOption extends BabylonNode implements UiOption {
  constructor(
    control: Control,
    private readonly paint: (selected: boolean) => void,
    private state: boolean,
  ) {
    super(control);
    paint(state);
  }

  get selected(): boolean {
    return this.state;
  }

  setSelected(selected: boolean): void {
    this.state = selected;
    this.paint(selected);
  }
}

/**
 * Draws the boards with Babylon GUI on a board in the 3D world (concrete factory of UiKit). The
 * texture is SCALE times the design pixels; widths are percentages of the parent so views never
 * give sizes. Only the summary column is fixed: `contentWidth` (set by the board) lets
 * `columns` size the main one.
 */
export class BabylonUiKit implements UiKit {
  /** Width of the side (summary) column, in screen pixels. */
  static readonly SIDE_WIDTH = 360;

  /** Room inside the sheet's margins, in texture pixels; the board sets it before a view builds. */
  contentWidth = T.px(700);
  private count = 0;
  private measurer: CanvasRenderingContext2D | null = null;

  /** The control of a node made by this kit. */
  static control(node: UiNode): Control {
    if (!(node instanceof BabylonNode)) throw new Error("BabylonUiKit: this node was made by another kit");
    return node.control;
  }

  title(text: string): UiText {
    return new BabylonText(this.block(text, T.font.display, T.type.title, "700", T.color.ink));
  }

  section(text: string): UiText {
    return new BabylonText(this.block(text, T.font.display, T.type.section, "700", T.color.ink));
  }

  text(text: string, muted = false): UiText {
    return new BabylonText(this.block(text, T.font.body, T.type.text, "400", muted ? T.color.inkSoft : T.color.ink));
  }

  note(text: string, tone: NoteTone = "muted"): UiText {
    const note = new BabylonText(this.block(text, T.font.body, T.type.note, "400", T.color.inkSoft));
    note.setTone(tone);
    return note;
  }

  link(label: string, onClick: () => void, tone: LinkTone = "accent"): UiNode {
    const color = tone === "accent" ? T.color.red : tone === "ink" ? T.color.ink : T.color.inkSoft;
    const link = this.inline(label, T.type.note, "600", color);
    link.isPointerBlocker = true;
    link.hoverCursor = "pointer";
    link.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    link.onPointerEnterObservable.add(() => (link.underline = true));
    link.onPointerOutObservable.add(() => (link.underline = false));
    link.onPointerClickObservable.add(() => onClick());
    return new BabylonNode(link);
  }

  field(label: string, options: FieldOptions = {}): UiField {
    const block = this.stack(true, T.size.gapSmall);
    block.addControl(this.block(label, T.font.body, T.type.note, "600", T.color.ink));
    const ring = new Rectangle(this.name("fieldRing"));
    ring.width = "100%";
    ring.heightInPixels = T.px(T.size.control);
    ring.cornerRadius = T.px(T.size.radius);
    ring.thickness = T.px(T.size.border);
    ring.color = T.color.line;
    ring.background = T.color.white;
    const input = options.password ? new InputPassword(this.name("password")) : new InputText(this.name("field"));
    input.width = "100%";
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
    input.paddingLeftInPixels = T.px(T.size.gapMedium);
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
    return new BabylonField(block, input);
  }

  button(label: string, onClick: () => void, variant: ButtonVariant = "primary", fullWidth = false): UiButton {
    const primary = variant === "primary";
    const button = Button.CreateSimpleButton(this.name("button"), label);
    if (fullWidth) button.width = "100%";
    else button.widthInPixels = this.measure(label, `600 ${T.px(T.type.button)}px ${T.font.body}`) + T.px(48);
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
    return new BabylonButton(button, onClick);
  }

  option(title: string, details: string | string[] | null, selected: boolean, onSelect: () => void, extras: OptionExtras = {}): UiOption {
    const card = new Rectangle(this.name("option"));
    card.width = "100%";
    card.adaptHeightToChildren = true;
    card.cornerRadius = T.px(T.size.radius);
    card.thickness = T.px(T.size.border);
    card.hoverCursor = "pointer";
    card.isPointerBlocker = true;
    const pad = T.px(T.size.gapMedium);
    const inner = this.stack(true, 4);
    inner.paddingTopInPixels = inner.paddingBottomInPixels = T.px(14);
    inner.paddingLeftInPixels = pad + (extras.icon ? T.px(28) + pad : 0);
    const linkWidth = extras.action ? this.measure(extras.action.label, `600 ${T.px(T.type.note)}px ${T.font.body}`) + pad : 0;
    inner.paddingRightInPixels = pad * 2 + T.px(22) + linkWidth;
    inner.addControl(this.block(title, T.font.body, T.type.text, "700", T.color.ink));
    for (const line of details === null ? [] : Array.isArray(details) ? details : [details]) inner.addControl(this.block(line, T.font.body, T.type.note, "400", T.color.inkSoft));
    card.addControl(inner);
    if (extras.icon) {
      const icon = new Image(this.name("optionIcon"), BoardArt.icon(extras.icon));
      icon.widthInPixels = icon.heightInPixels = T.px(28);
      icon.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      icon.leftInPixels = pad;
      card.addControl(icon);
    }
    const mark = new Ellipse(this.name("optionMark"));
    mark.widthInPixels = mark.heightInPixels = T.px(22);
    mark.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    mark.leftInPixels = -pad;
    const check = this.inline("✓", 13, "700", T.color.white);
    check.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    mark.addControl(check);
    card.addControl(mark);
    if (extras.action) {
      const action = extras.action;
      const link = BabylonUiKit.control(this.link(action.label, () => action.run()));
      link.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
      link.leftInPixels = -(pad * 2 + T.px(22));
      card.addControl(link);
    }
    let hover = false;
    let chosen = selected;
    const paint = (state: boolean) => {
      chosen = state;
      card.color = state ? T.color.green : hover ? T.color.inkSoft : T.color.line;
      card.background = state ? T.color.greenTint : T.color.white;
      mark.background = state ? T.color.green : "transparent";
      mark.thickness = state ? 0 : T.px(T.size.border);
      mark.color = T.color.line;
      check.isVisible = state;
    };
    const option = new BabylonOption(card, paint, selected);
    card.onPointerEnterObservable.add(() => {
      hover = true;
      paint(chosen);
    });
    card.onPointerOutObservable.add(() => {
      hover = false;
      paint(chosen);
    });
    card.onPointerClickObservable.add(() => {
      option.setSelected(true);
      onSelect();
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
    const box = new BabylonBox(this.stack(true, T.size.gapSmall));
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
      box.add(option);
    }
    return box;
  }

  /** On the 3D board the border is solid (Babylon GUI has no dashed borders). */
  addCard(label: string, onClick: () => void): UiNode {
    const card = new Rectangle(this.name("addCard"));
    card.width = "100%";
    card.heightInPixels = T.px(56);
    card.cornerRadius = T.px(T.size.radius);
    card.thickness = T.px(T.size.border);
    card.color = T.color.line;
    card.isPointerBlocker = true;
    card.hoverCursor = "pointer";
    const row = this.stack(false, T.size.gapSmall);
    const plus = new Image(this.name("plus"), BoardArt.icon("plus"));
    plus.widthInPixels = plus.heightInPixels = T.px(18);
    row.addControl(plus);
    row.addControl(this.inline(label, T.type.text, "600", T.color.ink));
    card.addControl(row);
    card.onPointerEnterObservable.add(() => (card.color = T.color.ink));
    card.onPointerOutObservable.add(() => (card.color = T.color.line));
    card.onPointerClickObservable.add(() => onClick());
    return new BabylonNode(card);
  }

  steps(labels: string[], current: number): UiNode {
    const row = this.stack(false, T.size.gapSmall);
    row.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    labels.forEach((label, index) => {
      const done = index < current;
      const active = index === current;
      if (index > 0) {
        const joint = new Rectangle(this.name("stepLine"));
        joint.widthInPixels = T.px(32);
        joint.heightInPixels = T.px(2);
        joint.thickness = 0;
        joint.background = index <= current ? T.color.green : T.color.line;
        row.addControl(joint);
      }
      const dot = new Ellipse(this.name("step"));
      dot.widthInPixels = dot.heightInPixels = T.px(26);
      dot.thickness = done || active ? 0 : T.px(T.size.border);
      dot.color = T.color.line;
      dot.background = done || active ? T.color.green : "transparent";
      const mark = this.inline(done ? "✓" : String(index + 1), 13, "700", done || active ? T.color.white : T.color.inkSoft);
      mark.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      dot.addControl(mark);
      row.addControl(dot);
      row.addControl(this.inline(label, T.type.note, active ? "700" : "500", active ? T.color.ink : T.color.inkSoft));
    });
    return new BabylonNode(row);
  }

  column(gap: Gap = "large", align: Align = "start"): UiBox {
    return new BabylonBox(this.stack(true, this.gap(gap)), align);
  }

  row(gap: Gap = "medium", align: Align = "start"): UiBox {
    const row = this.stack(false, this.gap(gap));
    row.horizontalAlignment = align === "center" ? Control.HORIZONTAL_ALIGNMENT_CENTER : align === "end" ? Control.HORIZONTAL_ALIGNMENT_RIGHT : Control.HORIZONTAL_ALIGNMENT_LEFT;
    return new BabylonBox(row);
  }

  columns(main: UiNode, side: UiNode): UiNode {
    const sideWidth = T.px(BabylonUiKit.SIDE_WIDTH);
    const gap = T.px(T.size.padding);
    const row = this.stack(false, T.size.padding);
    row.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    const left = BabylonUiKit.control(main);
    left.widthInPixels = this.contentWidth - sideWidth - gap;
    left.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    const right = BabylonUiKit.control(side);
    right.widthInPixels = sideWidth;
    right.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    row.addControl(left);
    row.addControl(right);
    return new BabylonNode(row);
  }

  card(): UiBox {
    const card = new Rectangle(this.name("card"));
    card.width = "100%";
    card.adaptHeightToChildren = true;
    card.cornerRadius = T.px(12);
    card.thickness = T.px(1);
    card.color = T.color.line;
    card.background = T.color.card;
    const body = this.stack(true, T.size.gapMedium);
    body.paddingTopInPixels = body.paddingBottomInPixels = body.paddingLeftInPixels = body.paddingRightInPixels = T.px(T.size.gap);
    card.addControl(body);
    return new BabylonBox(body);
  }

  summaryItem(item: SummaryItem): UiNode {
    const size = T.px(64);
    const box = new Container(this.name("summaryItem"));
    box.width = "100%";
    box.adaptHeightToChildren = true;
    const thumb = this.picture(item.image, size);
    thumb.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    thumb.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    box.addControl(thumb);
    const price = this.inline(item.price, T.type.text, "600", T.color.ink);
    price.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    price.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    box.addControl(price);
    const texts = this.stack(true, 2);
    texts.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    texts.paddingLeftInPixels = size + T.px(T.size.gapMedium);
    texts.paddingRightInPixels = this.measure(item.price, `600 ${T.px(T.type.text)}px ${T.font.body}`) + T.px(T.size.gapMedium);
    texts.addControl(this.block(item.title, T.font.body, T.type.text, "600", T.color.ink));
    texts.addControl(this.block(item.detail, T.font.body, T.type.note, "400", T.color.inkSoft));
    box.addControl(texts);
    return new BabylonNode(box);
  }

  amount(label: string, value: string, total = false): UiNode {
    const size = total ? T.type.section : T.type.text;
    const box = new Container(this.name("amount"));
    box.width = "100%";
    box.heightInPixels = T.px(size * 1.45);
    const family = total ? T.font.display : T.font.body;
    const weight = total ? "700" : "400";
    const left = this.inline(label, size, weight, T.color.ink, family);
    left.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    const right = this.inline(value, size, weight, T.color.ink, family);
    right.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    box.addControl(left);
    box.addControl(right);
    return new BabylonNode(box);
  }

  divider(): UiNode {
    const rule = new Rectangle(this.name("divider"));
    rule.width = "100%";
    rule.heightInPixels = T.px(1);
    rule.thickness = 0;
    rule.background = T.color.line;
    return new BabylonNode(rule);
  }

  iconNote(icon: IconName, text: string): UiNode {
    const row = this.stack(false, T.size.gapSmall);
    row.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    const image = new Image(this.name("noteIcon"), BoardArt.icon(icon, T.color.inkSoft));
    image.widthInPixels = image.heightInPixels = T.px(14);
    row.addControl(image);
    row.addControl(this.inline(text, 13, "400", T.color.inkSoft));
    return new BabylonNode(row);
  }

  bigCheck(): UiNode {
    const circle = new Ellipse(this.name("bigCheck"));
    circle.widthInPixels = circle.heightInPixels = T.px(72);
    circle.thickness = 0;
    circle.background = T.color.green;
    const mark = this.inline("✓", 36, "700", T.color.white);
    mark.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    circle.addControl(mark);
    return new BabylonNode(circle);
  }

  highlight(label: string, value: string): UiNode {
    const box = new Rectangle(this.name("highlight"));
    box.widthInPixels = T.px(400);
    box.adaptHeightToChildren = true;
    box.cornerRadius = T.px(12);
    box.thickness = T.px(T.size.border);
    box.color = T.color.green;
    box.background = T.color.greenTint;
    const column = this.stack(true, 4);
    column.paddingTopInPixels = column.paddingBottomInPixels = T.px(T.size.gapMedium);
    const caption = this.block(label, T.font.body, T.type.note, "400", T.color.inkSoft);
    caption.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    const code = this.block(value, T.font.display, T.type.section, "700", T.color.green);
    code.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    column.addControl(caption);
    column.addControl(code);
    box.addControl(column);
    return new BabylonNode(box);
  }

  // ---------------------------------------------------------------- helpers

  /** A wrapping text as wide as its parent. */
  private block(text: string, family: string, size: number, weight: string, color: string): TextBlock {
    const block = new TextBlock(this.name("text"), text);
    block.width = "100%";
    block.fontFamily = family;
    block.fontSizeInPixels = T.px(size);
    block.fontWeight = weight;
    block.color = color;
    block.textWrapping = true;
    block.resizeToFit = true;
    block.lineSpacing = `${T.px(size * 0.4)}px`;
    block.clipContent = false;
    block.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    return block;
  }

  /** A one-line text as wide as its words (in rows, links, amounts). */
  private inline(text: string, size: number, weight: string, color: string, family: string = T.font.body): TextBlock {
    const block = new TextBlock(this.name("inline"), text);
    block.fontFamily = family;
    block.fontSizeInPixels = T.px(size);
    block.fontWeight = weight;
    block.color = color;
    block.textWrapping = false;
    block.resizeToFit = true;
    block.clipContent = false;
    return block;
  }

  private stack(vertical: boolean, spacing: number): StackPanel {
    const stack = new StackPanel(this.name(vertical ? "column" : "row"));
    stack.isVertical = vertical;
    stack.spacing = T.px(spacing);
    stack.adaptHeightToChildren = true;
    if (vertical) stack.width = "100%";
    else stack.adaptWidthToChildren = true;
    return stack;
  }

  private picture(url: string, size: number): Rectangle {
    const frame = new Rectangle(this.name("imageFrame"));
    frame.widthInPixels = frame.heightInPixels = size;
    frame.cornerRadius = T.px(8);
    frame.thickness = T.px(1);
    frame.color = T.color.line;
    frame.background = T.color.white;
    const picture = new Image(this.name("image"), ArtworkImageFactory.resolve(url));
    picture.stretch = Image.STRETCH_UNIFORM;
    frame.addControl(picture);
    return frame;
  }

  private gap(gap: Gap): number {
    return gap === "small" ? T.size.gapSmall : gap === "medium" ? T.size.gapMedium : T.size.gap;
  }

  private measure(text: string, font: string): number {
    this.measurer ??= document.createElement("canvas").getContext("2d");
    if (!this.measurer) return text.length * T.px(9);
    this.measurer.font = font;
    return Math.ceil(this.measurer.measureText(text).width);
  }

  private name(kind: string): string {
    this.count += 1;
    return `${kind}-${this.count}`;
  }
}
