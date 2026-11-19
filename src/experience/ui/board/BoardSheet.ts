import { Container, Control, Image, Rectangle, ScrollViewer, StackPanel, type TextBlock } from "@babylonjs/gui";
import { BoardArt } from "./BoardArt";
import { BoardTheme as T } from "./BoardTheme";
import { BabylonUiKit } from "../kit/BabylonUiKit";
import type { BoardContext, BoardView } from "./BoardView";

/**
 * Builds a board for a view (Builder): a thin wooden frame with bronze corners and a soft
 * shadow, cream paper with a faint fibre, the resin band on top, then the header, the title, the
 * content and the buttons. The height follows the content: after the first layout `fit` reads
 * it, caps it at the allowed height (the content scrolls) and sizes frame and paper.
 */
export class BoardSheet {
  readonly root: Container;
  /** Paper width in screen pixels. */
  readonly paperWidth: number;

  private readonly frame: Rectangle;
  private readonly paper: Rectangle;
  private readonly stack: StackPanel;
  private readonly holder: Container;
  private readonly content: Control;
  private fitted = false;

  constructor(view: BoardView, kit: BabylonUiKit, close: () => void, closeLabel: string) {
    const context: BoardContext = { kit, close, closeLabel };
    this.paperWidth = T.width[view.size];
    const paperWidth = T.px(this.paperWidth);
    const inner = paperWidth - T.px(T.size.padding) * 2;

    this.root = new Container("board");
    this.frame = new Rectangle("boardFrame");
    this.frame.widthInPixels = paperWidth + T.px(T.size.frame) * 2;
    this.frame.heightInPixels = T.px(2000);
    this.frame.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.frame.topInPixels = T.px(T.size.margin);
    this.frame.thickness = 0;
    this.frame.cornerRadius = T.px(6);
    this.frame.background = T.color.wood;
    this.frame.shadowColor = "rgba(36, 22, 18, 0.45)";
    this.frame.shadowBlur = T.px(48);
    this.frame.shadowOffsetY = T.px(16);
    const wood = new Image("boardWood", BoardArt.wood());
    wood.stretch = Image.STRETCH_FILL;
    this.frame.addControl(wood);
    this.root.addControl(this.frame);

    this.paper = new Rectangle("boardPaper");
    this.paper.widthInPixels = paperWidth;
    this.paper.heightInPixels = T.px(1900);
    this.paper.thickness = 0;
    this.paper.background = T.color.paper;
    const fibre = new Image("boardFibre", BoardArt.paperFibre());
    fibre.stretch = Image.STRETCH_FILL;
    this.paper.addControl(fibre);
    this.frame.addControl(this.paper);
    this.addCorners();

    this.stack = new StackPanel("boardStack");
    this.stack.widthInPixels = paperWidth;
    this.stack.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    const band = new Image("boardBand", BoardArt.resinBand());
    band.stretch = Image.STRETCH_FILL;
    band.widthInPixels = paperWidth;
    band.heightInPixels = T.px(T.size.band);
    this.stack.addControl(band);

    const body = new StackPanel("boardBody");
    body.widthInPixels = paperWidth;
    body.spacing = T.px(T.size.gap);
    body.paddingTopInPixels = T.px(T.size.padding) - T.px(T.size.gapSmall);
    body.paddingBottomInPixels = T.px(T.size.padding) - T.px(T.size.gapSmall);
    kit.contentWidth = inner;
    const header = view.header(context);
    const side = view.centered ? Control.HORIZONTAL_ALIGNMENT_CENTER : Control.HORIZONTAL_ALIGNMENT_LEFT;
    if (header) body.addControl(this.lane(BabylonUiKit.control(header), inner, side));
    const title = BabylonUiKit.control(kit.title(view.title)) as TextBlock;
    title.widthInPixels = inner;
    title.textHorizontalAlignment = side;
    body.addControl(title);

    this.holder = new Container("boardContent");
    this.holder.widthInPixels = inner;
    this.holder.adaptHeightToChildren = true;
    this.content = BabylonUiKit.control(view.content(context));
    this.content.widthInPixels = inner;
    this.content.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.holder.addControl(this.content);
    body.addControl(this.holder);

    const buttons = this.footer(view, context, kit);
    if (buttons) body.addControl(this.lane(buttons, inner, Control.HORIZONTAL_ALIGNMENT_RIGHT));
    this.stack.addControl(body);
    this.paper.addControl(this.stack);
  }

  /** Width of the whole texture (frame, shadow room) in texture pixels. */
  get textureWidth(): number {
    return this.frame.widthInPixels + T.px(T.size.margin) * 2;
  }

  /**
   * Called after a layout: sizes paper and frame to the content, at most `maxPaperHeight`
   * screen pixels tall (the content then scrolls). Returns the texture height, or null when
   * it was already fitted.
   */
  fit(maxPaperHeight: number): number | null {
    if (this.fitted) return null;
    this.fitted = true;
    let height = this.stack.heightInPixels;
    const limit = T.px(maxPaperHeight);
    if (height > limit) {
      const visible = this.holder.heightInPixels - (height - limit);
      this.scroll(Math.max(T.px(120), visible));
      height = limit;
    }
    this.paper.heightInPixels = height;
    this.frame.heightInPixels = height + T.px(T.size.frame) * 2;
    return this.frame.heightInPixels + T.px(T.size.margin) * 2;
  }

  /** Puts the content in a scroll area of the given height. */
  private scroll(height: number): void {
    const width = this.holder.widthInPixels;
    this.holder.removeControl(this.content);
    this.holder.adaptHeightToChildren = false;
    this.holder.heightInPixels = height;
    // The content keeps its width; the scroll bar sits in the paper's right margin.
    this.holder.clipChildren = false;
    const bar = T.px(6);
    const viewer = new ScrollViewer("boardScroll");
    viewer.widthInPixels = width + bar + T.px(T.size.gapMedium);
    viewer.heightInPixels = height;
    viewer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    viewer.thickness = 0;
    viewer.color = "transparent";
    viewer.barSize = bar;
    viewer.barColor = T.color.line;
    viewer.barBackground = "transparent";
    viewer.wheelPrecision = 0.02;
    viewer.addControl(this.content);
    this.holder.addControl(viewer);
  }

  private footer(view: BoardView, context: BoardContext, kit: BabylonUiKit): Control | null {
    const buttons = view.actions(context);
    if (view.closable) buttons.unshift(kit.button(context.closeLabel, context.close, "secondary"));
    if (!buttons.length) return null;
    const row = kit.row("medium");
    buttons.forEach((button) => row.add(button));
    return BabylonUiKit.control(row);
  }

  /** Small bronze plates on the four corners of the frame. */
  private addCorners(): void {
    const size = T.px(T.size.corner);
    for (const vertical of [Control.VERTICAL_ALIGNMENT_TOP, Control.VERTICAL_ALIGNMENT_BOTTOM]) {
      for (const horizontal of [Control.HORIZONTAL_ALIGNMENT_LEFT, Control.HORIZONTAL_ALIGNMENT_RIGHT]) {
        const plate = new Rectangle("boardCorner");
        plate.widthInPixels = plate.heightInPixels = size;
        plate.verticalAlignment = vertical;
        plate.horizontalAlignment = horizontal;
        plate.background = T.color.bronze;
        plate.color = "#8a6a2c";
        plate.thickness = T.px(1);
        plate.cornerRadius = T.px(3);
        const shine = new Rectangle("boardCornerShine");
        shine.widthInPixels = shine.heightInPixels = size * 0.4;
        shine.thickness = 0;
        shine.cornerRadius = T.px(2);
        shine.background = "#e0c27a";
        plate.addControl(shine);
        this.frame.addControl(plate);
      }
    }
  }

  /** A strip as wide as the paper's inside, holding a narrower block on its left or right. */
  private lane(control: Control, width: number, alignment: number): Container {
    const lane = new Container("boardLane");
    lane.widthInPixels = width;
    lane.adaptHeightToChildren = true;
    control.horizontalAlignment = alignment;
    lane.addControl(control);
    return lane;
  }
}

