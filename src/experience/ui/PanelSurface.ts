import type { Scene } from "@babylonjs/core";
import { Signal } from "../../core/Signal";
import { BabylonPanelSurface } from "./BabylonPanelSurface";
import type { BoardView } from "./board/BoardView";
import { DomPanelSurface } from "./dom/DomPanelSurface";
import type { UiLayer } from "./UiLayer";

/** What the experience needs from a board surface, whatever draws it. */
interface BoardSurface {
  readonly closed: Signal<void>;
  readonly isOpen: boolean;
  readonly currentView: BoardView | null;
  open(view: BoardView): void;
  close(): void;
  dispose(): void;
}

/**
 * Where the boards are shown (the implementation side of the UiKit Bridge): in HTML over the
 * canvas (DomPanelSurface, the default) or, with ?ui=babylon, on a board in the 3D world
 * (BabylonPanelSurface). The views are the same for both.
 */
export class PanelSurface {
  /** True unless the page was opened with ?ui=babylon. */
  static readonly HTML_BOARDS = new URLSearchParams(window.location.search).get("ui") !== "babylon";

  /** The board finished closing (Esc, a button or `close()`). */
  readonly closed = new Signal<void>();
  private readonly surface: BoardSurface;

  constructor(scene: Scene, layer: UiLayer, closeLabel: string) {
    this.surface = PanelSurface.HTML_BOARDS ? new DomPanelSurface(closeLabel) : new BabylonPanelSurface(scene, layer, closeLabel);
    this.surface.closed.subscribe(() => this.closed.emit());
  }

  get isOpen(): boolean {
    return this.surface.isOpen;
  }

  get currentView(): BoardView | null {
    return this.surface.currentView;
  }

  open(view: BoardView): void {
    this.surface.open(view);
  }

  close(): void {
    this.surface.close();
  }

  dispose(): void {
    this.surface.dispose();
  }
}

/** A view the board can show. */
export type SurfaceView = BoardView;
