import type { UiButton, UiKit, UiNode } from "../kit/UiKit";

/** Width of the sheet: a form, ordinary content or a piece (or a two-column checkout). */
export type BoardSize = "form" | "content" | "piece";

/** What a view can ask of the board it is shown on. */
export interface BoardContext {
  /** The factory of the pieces: HTML or Babylon GUI, the view does not know which. */
  kit: UiKit;
  /** Closes the board (the same as Esc). */
  close(): void;
  /** Label of the close button, already translated. */
  closeLabel: string;
}

/**
 * One screen of a board (Template Method): the surface draws the sheet, the resin band, the
 * title and the row of buttons; each view gives its size, an optional header (the steps of a
 * process), its content and its buttons (the primary one last). Views only use the UiKit
 * interface, so the same view works on the HTML surface and on the 3D board.
 */
export abstract class BoardView {
  abstract readonly title: string;
  abstract readonly size: BoardSize;
  /** False for screens the visitor must answer (Esc and the close button are hidden). */
  readonly closable: boolean = true;
  /** Header and title centered (a one-column message such as a confirmation). */
  readonly centered: boolean = false;

  /** Something above the title, such as the steps of a process. */
  header(_context: BoardContext): UiNode | null {
    return null;
  }

  abstract content(context: BoardContext): UiNode;

  /** Buttons at the bottom right, the primary one last (the board adds Close before them). */
  actions(_context: BoardContext): UiButton[] {
    return [];
  }
}
