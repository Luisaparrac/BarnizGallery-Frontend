import { Button, Control, Rectangle, StackPanel, TextBlock, type AdvancedDynamicTexture } from "@babylonjs/gui";
import { Signal } from "../../core/Signal";
import { UiTheme } from "../ui/UiTheme";

/**
 * Bar at the bottom of the screen while the visitor picks an avatar on the pedestals: what to do,
 * the name of the chosen one and the Continue button (disabled until one is chosen).
 */
export class LobbyPrompt {
  readonly continuePressed = new Signal();

  private readonly bar: Rectangle;
  private readonly text: TextBlock;
  private readonly button: Button;

  constructor(texture: AdvancedDynamicTexture, continueLabel: string) {
    this.bar = new Rectangle("lobbyPrompt");
    this.bar.adaptWidthToChildren = true;
    this.bar.heightInPixels = 64;
    this.bar.cornerRadius = 32;
    this.bar.thickness = 0;
    this.bar.background = UiTheme.color.hudBack;
    this.bar.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.bar.topInPixels = -32;
    this.bar.isVisible = false;
    texture.addControl(this.bar);

    const row = new StackPanel("lobbyPromptRow");
    row.isVertical = false;
    row.spacing = 18;
    row.adaptWidthToChildren = true;
    row.heightInPixels = 64;
    row.paddingLeftInPixels = 28;
    row.paddingRightInPixels = 10;
    this.bar.addControl(row);

    this.text = new TextBlock("lobbyPromptText", "");
    this.text.resizeToFit = true;
    this.text.fontFamily = UiTheme.font.body;
    this.text.fontSizeInPixels = UiTheme.hud.prompt;
    this.text.fontWeight = "600";
    this.text.color = UiTheme.color.hudText;
    row.addControl(this.text);

    this.button = Button.CreateSimpleButton("lobbyContinue", continueLabel);
    this.button.widthInPixels = 170;
    this.button.heightInPixels = 46;
    this.button.cornerRadius = 23;
    this.button.thickness = 0;
    this.button.background = UiTheme.color.accent;
    this.button.color = UiTheme.color.white;
    this.button.disabledColor = UiTheme.color.disabled;
    this.button.fontFamily = UiTheme.font.body;
    this.button.fontSizeInPixels = UiTheme.hud.text;
    this.button.fontWeight = "700";
    this.button.pointerEnterAnimation = () => (this.button.background = UiTheme.color.accentHover);
    this.button.pointerOutAnimation = () => (this.button.background = UiTheme.color.accent);
    this.button.onPointerClickObservable.add(() => {
      if (this.button.isEnabled) this.continuePressed.emit();
    });
    row.addControl(this.button);
  }

  show(text: string, canContinue: boolean): void {
    this.text.text = text;
    this.button.isEnabled = canContinue;
    this.button.alpha = canContinue ? 1 : 0.45;
    this.bar.isVisible = true;
  }

  hide(): void {
    this.bar.isVisible = false;
  }
}
