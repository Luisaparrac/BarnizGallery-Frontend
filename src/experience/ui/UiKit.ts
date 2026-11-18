import { Button, Control, Ellipse, Image, InputPassword, InputText, Rectangle, StackPanel, TextBlock } from "@babylonjs/gui";
import { ArtworkImageFactory } from "../../art/ArtworkImageFactory";
import { UiTheme } from "./UiTheme";

export type ButtonVariant = "primary" | "quiet";

export interface FieldOptions {
  placeholder?: string;
  password?: boolean;
  value?: string;
  width?: number;
}

/** A labelled text field: the whole block to add to a panel and the input to read. */
export interface Field {
  control: StackPanel;
  input: InputText;
}

/** A control that can be switched on and off (chips and color swatches). */
export interface Toggle {
  control: Control;
  readonly selected: boolean;
  setSelected(selected: boolean): void;
}

/**
 * Factory of the GUI pieces every 3D panel is made of: titles, texts, buttons, fields, chips,
 * color swatches and images, all with the museum's theme. Views never style controls by hand.
 */
export class UiKit {
  private count = 0;
  private measurer: CanvasRenderingContext2D | null = null;

  title(text: string): TextBlock {
    return this.textBlock(text, UiTheme.font.display, UiTheme.panel.title, "700", UiTheme.color.ink);
  }

  subtitle(text: string): TextBlock {
    return this.textBlock(text, UiTheme.font.display, UiTheme.panel.subtitle, "700", UiTheme.color.ink);
  }

  text(text: string, options: { small?: boolean; muted?: boolean } = {}): TextBlock {
    const size = options.small ? UiTheme.panel.small : UiTheme.panel.body;
    return this.textBlock(text, UiTheme.font.body, size, "400", options.muted ? UiTheme.color.inkSoft : UiTheme.color.ink);
  }

  button(label: string, onClick: () => void, variant: ButtonVariant = "primary", width = 320): Button {
    const primary = variant === "primary";
    const button = Button.CreateSimpleButton(this.name("button"), label);
    button.widthInPixels = width;
    button.heightInPixels = UiTheme.panel.controlHeight;
    button.cornerRadius = UiTheme.panel.controlHeight / 2;
    button.thickness = primary ? 0 : 3;
    button.color = primary ? UiTheme.color.white : UiTheme.color.ink;
    button.background = primary ? UiTheme.color.accent : "transparent";
    button.disabledColor = UiTheme.color.disabled;
    button.fontFamily = UiTheme.font.body;
    button.fontSizeInPixels = UiTheme.panel.body;
    button.fontWeight = "600";
    button.pointerEnterAnimation = () => (button.background = primary ? UiTheme.color.accentHover : UiTheme.color.paperShade);
    button.pointerOutAnimation = () => (button.background = primary ? UiTheme.color.accent : "transparent");
    button.pointerDownAnimation = () => (button.scaleX = button.scaleY = 0.97);
    button.pointerUpAnimation = () => (button.scaleX = button.scaleY = 1);
    button.onPointerClickObservable.add(() => onClick());
    return button;
  }

  field(label: string, options: FieldOptions = {}): Field {
    const width = options.width ?? 640;
    const block = this.column(8);
    block.widthInPixels = width;
    const caption = this.text(label, { small: true, muted: true });
    caption.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    const input = options.password ? new InputPassword(this.name("password")) : new InputText(this.name("field"));
    input.widthInPixels = width;
    input.heightInPixels = UiTheme.panel.controlHeight;
    input.text = options.value ?? "";
    input.placeholderText = options.placeholder ?? "";
    input.placeholderColor = UiTheme.color.disabled;
    input.color = UiTheme.color.ink;
    input.background = UiTheme.color.white;
    input.focusedBackground = UiTheme.color.white;
    input.focusedColor = UiTheme.color.ink;
    input.thickness = 3;
    input.fontFamily = UiTheme.font.body;
    input.fontSizeInPixels = UiTheme.panel.body;
    input.margin = "16px";
    block.addControl(caption);
    block.addControl(input);
    return { control: block, input };
  }

  chip(label: string, selected: boolean, onChange: (selected: boolean) => void): Toggle {
    const chip = Button.CreateSimpleButton(this.name("chip"), label);
    chip.widthInPixels = this.measure(label, `600 ${UiTheme.panel.small}px ${UiTheme.font.body}`) + 56;
    chip.heightInPixels = 54;
    chip.cornerRadius = 27;
    chip.thickness = 3;
    chip.fontFamily = UiTheme.font.body;
    chip.fontSizeInPixels = UiTheme.panel.small;
    chip.fontWeight = "600";
    let state = selected;
    const paint = () => {
      chip.background = state ? UiTheme.color.ink : "transparent";
      chip.color = state ? UiTheme.color.paper : UiTheme.color.ink;
    };
    paint();
    chip.onPointerClickObservable.add(() => {
      state = !state;
      paint();
      onChange(state);
    });
    return {
      control: chip,
      get selected() {
        return state;
      },
      setSelected(next) {
        state = next;
        paint();
      },
    };
  }

  /** A round color sample; `hex` null is the "multicolor" swatch. */
  swatch(hex: string | null, selected: boolean, onChange: (selected: boolean) => void): Toggle {
    const size = UiTheme.panel.swatch;
    const ring = new Ellipse(this.name("swatch"));
    ring.widthInPixels = ring.heightInPixels = size + 14;
    ring.thickness = 4;
    const dot = new Ellipse(this.name("swatchDot"));
    dot.widthInPixels = dot.heightInPixels = size;
    dot.thickness = 2;
    dot.color = "#00000033";
    dot.background = hex ?? UiTheme.color.paperShade;
    ring.addControl(dot);
    if (!hex) {
      const mark = this.text("✦", { small: true });
      mark.resizeToFit = false;
      dot.addControl(mark);
    }
    let state = selected;
    const paint = () => (ring.color = state ? UiTheme.color.ink : "transparent");
    paint();
    ring.onPointerClickObservable.add(() => {
      state = !state;
      paint();
      onChange(state);
    });
    ring.hoverCursor = "pointer";
    return {
      control: ring,
      get selected() {
        return state;
      },
      setSelected(next) {
        state = next;
        paint();
      },
    };
  }

  /** A photo in a cream frame, scaled to fit without stretching. Demo "art:" URLs are resolved here. */
  image(url: string, width: number, height: number): Rectangle {
    const frame = new Rectangle(this.name("imageFrame"));
    frame.widthInPixels = width;
    frame.heightInPixels = height;
    frame.thickness = 3;
    frame.color = UiTheme.color.line;
    frame.background = UiTheme.color.paperShade;
    frame.cornerRadius = 6;
    const picture = new Image(this.name("image"), ArtworkImageFactory.resolve(url));
    picture.stretch = Image.STRETCH_UNIFORM;
    picture.paddingTopInPixels = picture.paddingBottomInPixels = picture.paddingLeftInPixels = picture.paddingRightInPixels = 8;
    frame.addControl(picture);
    return frame;
  }

  /** Vertical stack whose height follows its children. */
  column(spacing: number = UiTheme.panel.gap): StackPanel {
    const stack = new StackPanel(this.name("column"));
    stack.isVertical = true;
    stack.spacing = spacing;
    stack.adaptHeightToChildren = true;
    return stack;
  }

  /** Horizontal stack whose width follows its children. */
  row(spacing: number = UiTheme.panel.gap): StackPanel {
    const stack = new StackPanel(this.name("row"));
    stack.isVertical = false;
    stack.spacing = spacing;
    stack.adaptHeightToChildren = true;
    stack.adaptWidthToChildren = true;
    return stack;
  }

  private textBlock(text: string, family: string, size: number, weight: string, color: string): TextBlock {
    const block = new TextBlock(this.name("text"), text);
    block.fontFamily = family;
    block.fontSizeInPixels = size;
    block.fontWeight = weight;
    block.color = color;
    block.textWrapping = true;
    block.resizeToFit = true;
    block.lineSpacing = `${Math.round(size * 0.25)}px`;
    // Glyphs with descenders (g, p, y) may go a little past the measured line: do not cut them.
    block.clipContent = false;
    block.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    return block;
  }

  /** Width of a text in pixels, to size controls that must hug their label. */
  private measure(text: string, font: string): number {
    this.measurer ??= document.createElement("canvas").getContext("2d");
    if (!this.measurer) return text.length * 14;
    this.measurer.font = font;
    return Math.ceil(this.measurer.measureText(text).width);
  }

  private name(kind: string): string {
    this.count += 1;
    return `${kind}-${this.count}`;
  }
}
