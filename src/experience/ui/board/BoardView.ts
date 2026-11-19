import type { Control } from "@babylonjs/gui";
import type { BoardKit } from "./BoardKit";
import type { BoardTheme } from "./BoardTheme";

/** Width of the paper: a form, ordinary content or a piece with its photos. */
export type BoardSize = keyof typeof BoardTheme.width;

/** What a view can ask of the board it is shown on. */
export interface BoardContext {
  kit: BoardKit;
  /** Closes the board (the same as Esc). */
  close(): void;
  /** Label of the close button, already translated. */
  closeLabel: string;
}

/**
 * One screen of the redesigned board (Template Method): the board draws the frame, the resin
 * band, the title and the row of buttons; each view gives its width, an optional header (the
 * steps of a process), its content and its buttons (the primary one last).
 * The board calls these methods; views never call each other.
 */
export abstract class BoardView {
  abstract readonly title: string;
  abstract readonly size: BoardSize;
  /** False for screens the visitor must answer (Esc and the close button are hidden). */
  readonly closable: boolean = true;
  /** Header and title centered (a one-column message such as a confirmation). */
  readonly centered: boolean = false;

  /** Something above the title, such as the steps of a process. */
  header(_context: BoardContext, _width: number): Control | null {
    return null;
  }

  /** The body of the board; `width` is the room inside the paper's margins (texture pixels). */
  abstract content(context: BoardContext, width: number): Control;

  /** Buttons at the bottom right, the primary one last (the board adds Close before them). */
  actions(_context: BoardContext): Control[] {
    return [];
  }
}
