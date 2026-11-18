import { Control, Rectangle } from "@babylonjs/gui";
import type { Localizer } from "../../../i18n/Localizer";
import { PanelView, type PanelContext } from "../PanelView";
import { UiTheme } from "../UiTheme";

export interface ControlsActions {
  /** Shown at the start: closes the board and captures the mouse to walk. */
  enter?(): void;
  /** Only with ?debug: opens the UiKit sample. */
  openSample?(): void;
}

/** How to move around the museum; it is also the start screen of the plaza. */
export class ControlsView extends PanelView {
  readonly title: string;

  constructor(
    private readonly i18n: Localizer,
    private readonly callbacks: ControlsActions = {},
  ) {
    super();
    this.title = callbacks.enter ? i18n.t("world.introTitle") : i18n.t("world.controls");
  }

  protected content({ kit }: PanelContext, width: number): Control {
    const column = kit.column();
    // At the start the title is the plaza's, so the controls get their own subtitle.
    if (this.callbacks.enter) {
      column.addControl(kit.text(this.i18n.t("world.introText"), { muted: true }));
      column.addControl(kit.subtitle(this.i18n.t("world.controls")));
    }
    const keys: [string, string][] = [
      ["W A S D", this.i18n.t("world.control.move")],
      ["Shift", this.i18n.t("world.control.run")],
      ["Mouse", this.i18n.t("world.control.look")],
      ["E", this.i18n.t("world.control.use")],
      ["V", this.i18n.t("world.control.camera")],
      [this.i18n.t("world.control.pieceKey"), this.i18n.t("world.control.piece")],
      ["Esc", this.i18n.t("ui.control.close")],
    ];
    const keyWidth = 300;
    for (const [key, action] of keys) {
      const row = kit.row(28);
      row.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      const cap = new Rectangle(`key-${key}`);
      cap.widthInPixels = keyWidth;
      cap.heightInPixels = 52;
      cap.cornerRadius = 10;
      cap.thickness = 3;
      cap.color = UiTheme.color.line;
      cap.background = UiTheme.color.white;
      const label = kit.text(key, { small: true });
      label.fontWeight = "700";
      label.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      cap.addControl(label);
      const text = kit.text(action);
      text.widthInPixels = width - keyWidth - 28;
      row.addControl(cap);
      row.addControl(text);
      column.addControl(row);
    }
    return column;
  }

  protected actions({ kit }: PanelContext): Control[] {
    const buttons: Control[] = [];
    if (this.callbacks.openSample) buttons.push(kit.button(this.i18n.t("uiDemo.open"), this.callbacks.openSample, "quiet", 380));
    if (this.callbacks.enter) buttons.push(kit.button(this.i18n.t("world.enter"), this.callbacks.enter, "primary", 380));
    return buttons;
  }
}
