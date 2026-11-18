import { Button, Control, Ellipse, Rectangle, StackPanel, TextBlock, type AdvancedDynamicTexture } from "@babylonjs/gui";
import { Signal } from "../../core/Signal";
import { UiTheme } from "./UiTheme";

export interface HudLabels {
  cart: string;
  account: string;
  controls: string;
  clickToLook: string;
}

/**
 * What stays on screen while walking: the interaction prompt, the crosshair, a hint to capture the
 * mouse and the Cart (with its counter), Account and Controls buttons.
 */
export class Hud {
  readonly cartPressed = new Signal();
  readonly accountPressed = new Signal();
  readonly controlsPressed = new Signal();

  private readonly root: Rectangle;
  private readonly crosshair: Ellipse;
  private readonly prompt: Rectangle;
  private readonly promptText: TextBlock;
  private readonly hint: TextBlock;
  private readonly cart: Button;
  private readonly account: Button;
  private readonly cartBadge: Ellipse;
  private readonly cartCount: TextBlock;
  private locked = false;
  private firstPerson = false;

  constructor(texture: AdvancedDynamicTexture, labels: HudLabels) {
    this.root = new Rectangle("hudRoot");
    this.root.thickness = 0;
    this.root.isPointerBlocker = false;
    texture.addControl(this.root);

    const toolbar = new StackPanel("hudToolbar");
    toolbar.isVertical = false;
    toolbar.spacing = UiTheme.hud.gap;
    toolbar.adaptWidthToChildren = true;
    toolbar.heightInPixels = UiTheme.hud.buttonHeight;
    toolbar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    toolbar.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    toolbar.topInPixels = UiTheme.hud.margin;
    toolbar.leftInPixels = -UiTheme.hud.margin;
    toolbar.isPointerBlocker = true;
    this.root.addControl(toolbar);

    this.cart = this.button(labels.cart, this.cartPressed, 150);
    this.cartBadge = new Ellipse("hudCartBadge");
    this.cartBadge.widthInPixels = this.cartBadge.heightInPixels = 24;
    this.cartBadge.thickness = 0;
    this.cartBadge.background = UiTheme.color.accent;
    this.cartBadge.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this.cartBadge.leftInPixels = -10;
    this.cartBadge.isVisible = false;
    this.cartCount = this.label("0", 14);
    this.cartCount.fontWeight = "700";
    this.cartBadge.addControl(this.cartCount);
    this.cart.addControl(this.cartBadge);
    this.account = this.button(labels.account, this.accountPressed, 130);
    toolbar.addControl(this.cart);
    toolbar.addControl(this.account);
    toolbar.addControl(this.button(labels.controls, this.controlsPressed, 140));

    this.crosshair = new Ellipse("hudCrosshair");
    this.crosshair.widthInPixels = this.crosshair.heightInPixels = 8;
    this.crosshair.thickness = 2;
    this.crosshair.color = "#00000080";
    this.crosshair.background = "#ffffffe6";
    this.crosshair.isPointerBlocker = false;
    this.root.addControl(this.crosshair);

    this.prompt = new Rectangle("hudPrompt");
    this.prompt.adaptWidthToChildren = true;
    this.prompt.heightInPixels = 48;
    this.prompt.cornerRadius = 24;
    this.prompt.thickness = 0;
    this.prompt.background = UiTheme.color.hudBack;
    this.prompt.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.prompt.topInPixels = -90;
    this.prompt.isPointerBlocker = false;
    this.promptText = this.label("", UiTheme.hud.prompt);
    this.promptText.resizeToFit = true;
    this.promptText.paddingLeftInPixels = this.promptText.paddingRightInPixels = 24;
    this.prompt.addControl(this.promptText);
    this.root.addControl(this.prompt);

    this.hint = this.label(labels.clickToLook, UiTheme.hud.text);
    this.hint.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.hint.topInPixels = -40;
    this.hint.heightInPixels = 30;
    this.hint.shadowColor = "#000000";
    this.hint.shadowBlur = 6;
    this.root.addControl(this.hint);

    this.setPrompt(null);
    this.refresh();
  }

  setVisible(visible: boolean): void {
    this.root.isVisible = visible;
  }

  setPrompt(text: string | null): void {
    this.prompt.isVisible = text !== null;
    this.promptText.text = text ?? "";
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
    this.cartBadge.isVisible = count !== null && count > 0;
    this.cartCount.text = count !== null && count > 9 ? "9+" : String(count ?? 0);
  }

  /** Buttons without a panel yet stay visible but cannot be pressed. */
  setEnabled(button: "cart" | "account", enabled: boolean): void {
    const control = button === "cart" ? this.cart : this.account;
    control.isEnabled = enabled;
    control.alpha = enabled ? 1 : 0.75;
  }

  private refresh(): void {
    this.crosshair.isVisible = this.locked && this.firstPerson;
    this.hint.isVisible = !this.locked;
  }

  private button(text: string, pressed: Signal, width: number): Button {
    const button = Button.CreateSimpleButton(`hud-${text}`, text);
    button.widthInPixels = width;
    button.heightInPixels = UiTheme.hud.buttonHeight;
    button.cornerRadius = UiTheme.hud.radius;
    button.thickness = 0;
    button.background = UiTheme.color.hudBack;
    button.color = UiTheme.color.hudText;
    button.disabledColor = UiTheme.color.hudBack;
    button.disabledColorItem = UiTheme.color.hudTextMuted;
    button.fontFamily = UiTheme.font.body;
    button.fontSizeInPixels = UiTheme.hud.text;
    button.fontWeight = "600";
    button.pointerEnterAnimation = () => (button.background = UiTheme.color.hudBackHover);
    button.pointerOutAnimation = () => (button.background = UiTheme.color.hudBack);
    button.onPointerClickObservable.add(() => pressed.emit());
    return button;
  }

  private label(text: string, size: number): TextBlock {
    const block = new TextBlock(`hud-text-${text}`, text);
    block.fontFamily = UiTheme.font.body;
    block.fontSizeInPixels = size;
    block.fontWeight = "500";
    block.color = UiTheme.color.hudText;
    block.isPointerBlocker = false;
    return block;
  }
}
