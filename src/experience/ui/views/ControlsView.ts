import type { Localizer } from "../../../i18n/Localizer";
import { BoardView, type BoardContext } from "../board/BoardView";
import type { UiButton, UiNode } from "../kit/UiKit";

export interface ControlsActions {
  /** Shown at the start: closes the board and captures the mouse to walk. */
  enter?(): void;
}

/** How to move around the museum; it is also the start screen of the plaza. */
export class ControlsView extends BoardView {
  readonly size = "content" as const;
  readonly title: string;

  constructor(
    private readonly i18n: Localizer,
    private readonly callbacks: ControlsActions = {},
  ) {
    super();
    this.title = callbacks.enter ? i18n.t("world.introTitle") : i18n.t("world.controls");
  }

  content({ kit }: BoardContext): UiNode {
    const column = kit.column("large");
    // At the start the title is the plaza's, so the controls get their own section.
    if (this.callbacks.enter) {
      column.add(kit.text(this.i18n.t("world.introText"), true));
      column.add(kit.section(this.i18n.t("world.controls")));
    }
    const keys = kit.column("small");
    const hints: [string, string][] = [
      ["W A S D", this.i18n.t("world.control.move")],
      ["Shift", this.i18n.t("world.control.run")],
      [this.i18n.t("world.control.mouseKey"), this.i18n.t("world.control.look")],
      ["E", this.i18n.t("world.control.use")],
      ["V", this.i18n.t("world.control.camera")],
      [this.i18n.t("world.control.pieceKey"), this.i18n.t("world.control.piece")],
      ["Esc", this.i18n.t("ui.control.close")],
    ];
    hints.forEach(([key, action]) => keys.add(kit.keyHint(key, action)));
    column.add(keys);
    return column;
  }

  override actions({ kit }: BoardContext): UiButton[] {
    return this.callbacks.enter ? [kit.button(this.i18n.t("world.enter"), this.callbacks.enter)] : [];
  }
}
