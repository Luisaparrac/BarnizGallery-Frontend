import { Matrix, Vector3, type Camera } from "@babylonjs/core";
import { Control, Rectangle, TextBlock, type AdvancedDynamicTexture } from "@babylonjs/gui";
import { UiTheme } from "../ui/UiTheme";

/**
 * Name of the avatar under the mouse (or chosen with the keyboard), floating above its head. It
 * fades in and out and follows the world camera; the HUD is drawn by the UI camera, so the
 * position is projected by hand.
 */
export class PedestalLabel {
  private static readonly FADE_PER_SECOND = 1 / 0.3;

  private readonly pill: Rectangle;
  private readonly text: TextBlock;
  private readonly anchor = new Vector3();
  private shown = false;
  private alpha = 0;

  constructor(private readonly texture: AdvancedDynamicTexture) {
    this.pill = new Rectangle("pedestalLabel");
    this.pill.adaptWidthToChildren = true;
    this.pill.heightInPixels = 40;
    this.pill.cornerRadius = 20;
    this.pill.thickness = 0;
    this.pill.background = UiTheme.color.hudBack;
    this.pill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.pill.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.pill.isPointerBlocker = false;
    this.pill.isHitTestVisible = false;
    this.pill.alpha = 0;
    this.pill.isVisible = false;
    texture.addControl(this.pill);

    this.text = new TextBlock("pedestalLabelText", "");
    this.text.resizeToFit = true;
    this.text.paddingLeftInPixels = 20;
    this.text.paddingRightInPixels = 20;
    this.text.fontFamily = UiTheme.font.body;
    this.text.fontSizeInPixels = UiTheme.hud.text;
    this.text.fontWeight = "700";
    this.text.color = UiTheme.color.hudText;
    this.pill.addControl(this.text);
  }

  /** Shows `name` above the point `anchor` (world space), or hides the label with null. */
  show(name: string | null, anchor?: Vector3): void {
    this.shown = name !== null;
    if (name !== null) this.text.text = name;
    if (anchor) this.anchor.copyFrom(anchor);
  }

  update(deltaSeconds: number, camera: Camera): void {
    const step = deltaSeconds * PedestalLabel.FADE_PER_SECOND;
    this.alpha = Math.min(1, Math.max(0, this.alpha + (this.shown ? step : -step)));
    this.pill.alpha = this.alpha;
    this.pill.isVisible = this.alpha > 0;
    if (!this.pill.isVisible) return;

    const engine = camera.getScene().getEngine();
    const width = engine.getRenderWidth();
    const height = engine.getRenderHeight();
    const screen = Vector3.Project(this.anchor, Matrix.IdentityReadOnly, camera.getTransformationMatrix(), camera.viewport.toGlobal(width, height));
    // The HUD texture may be smaller or bigger than the render (its render scale), so convert.
    const size = this.texture.getSize();
    this.pill.leftInPixels = (screen.x / width) * size.width - this.pill.widthInPixels / 2;
    this.pill.topInPixels = (screen.y / height) * size.height - this.pill.heightInPixels;
    this.pill.isVisible = screen.z > 0 && screen.z < 1;
  }

  dispose(): void {
    this.pill.dispose();
  }
}
