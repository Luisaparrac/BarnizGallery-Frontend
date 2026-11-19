import { MeshBuilder, StandardMaterial, TransformNode, type Mesh, type Observer, type Scene } from "@babylonjs/core";
import { AdvancedDynamicTexture } from "@babylonjs/gui";
import { Signal } from "../../core/Signal";
import { BoardSheet } from "./board/BoardSheet";
import { BoardTheme } from "./board/BoardTheme";
import type { BoardView } from "./board/BoardView";
import { BabylonUiKit } from "./kit/BabylonUiKit";
import type { UiLayer } from "./UiLayer";
import { UiTheme } from "./UiTheme";

/**
 * Boards drawn with Babylon GUI on a plane floating in front of the UI camera (used with
 * ?ui=babylon). The texture is resized after the first layout so the board fits its content and
 * measures on screen the pixels of the design; it rises into view and closes with Esc.
 */
export class BabylonPanelSurface {
  private static readonly DISTANCE = 2;
  private static readonly ANIMATION_SECONDS = 0.22;

  readonly closed = new Signal<void>();

  private readonly root: TransformNode;
  private readonly plane: Mesh;
  private readonly texture: AdvancedDynamicTexture;
  private readonly kit = new BabylonUiKit();
  private readonly listeners = new AbortController();
  private readonly frameObserver: Observer<Scene>;
  private sheet: BoardSheet | null = null;
  private view: BoardView | null = null;
  /** Size of the texture in texture pixels; it changes with every board. */
  private size = { width: 1, height: 1 };
  /** False while a new board waits for its first layout to know its height. */
  private ready = true;
  /** 0 = hidden, 1 = fully open. */
  private progress = 0;
  private target = 0;

  constructor(
    private readonly scene: Scene,
    private readonly layer: UiLayer,
    private readonly closeLabel: string,
  ) {
    this.root = new TransformNode("panelBoard", scene);
    this.root.parent = layer.camera;
    this.plane = MeshBuilder.CreatePlane("boardSheet", { width: 1, height: 1 }, scene);
    this.texture = AdvancedDynamicTexture.CreateForMesh(this.plane, 1024, 1024, true, false);
    (this.plane.material as StandardMaterial).disableLighting = true;
    this.texture.onEndLayoutObservable.add(() => this.fit());
    this.plane.parent = this.root;
    this.plane.layerMask = UiTheme.LAYER_MASK;
    this.plane.applyFog = false;
    this.root.setEnabled(false);
    this.frameObserver = scene.onBeforeRenderObservable.add(() => this.animate(scene.getEngine().getDeltaTime() / 1000));
    window.addEventListener("keydown", (event) => this.onKeyDown(event), { signal: this.listeners.signal });
  }

  get isOpen(): boolean {
    return this.target === 1;
  }

  get currentView(): BoardView | null {
    return this.view;
  }

  /** Shows a view; if the board is already open, the sheet changes without the animation. */
  open(view: BoardView): void {
    this.view = view;
    this.clear();
    this.sheet = new BoardSheet(view, this.kit, () => this.close(), this.closeLabel);
    // Tall enough to lay the whole content out once; `fit` then trims it.
    this.resize(this.sheet.textureWidth, BoardTheme.px(2200));
    this.texture.addControl(this.sheet.root);
    this.ready = false;
    this.target = 1;
    this.root.setEnabled(true);
    this.place();
  }

  close(): void {
    this.target = 0;
  }

  /** Takes the board away at once, without the animation or the closed event. */
  dismiss(): void {
    this.target = 0;
    this.progress = 0;
    this.root.setEnabled(false);
    this.clear();
    this.view = null;
  }

  dispose(): void {
    this.listeners.abort();
    this.scene.onBeforeRenderObservable.remove(this.frameObserver);
    this.texture.dispose();
    this.root.dispose();
  }

  private animate(delta: number): void {
    if (!this.ready) return;
    if (this.progress === this.target) {
      if (this.target === 1) this.place();
      return;
    }
    const step = Math.min(delta, 0.05) / BabylonPanelSurface.ANIMATION_SECONDS;
    this.progress = this.target > this.progress ? Math.min(1, this.progress + step) : Math.max(0, this.progress - step);
    this.place();
    if (this.target === 0 && this.progress === 0) {
      this.root.setEnabled(false);
      this.clear();
      this.view = null;
      this.closed.emit();
    }
  }

  /**
   * A texture pixel is 1/SCALE screen pixels; a board wider or taller than the window shrinks to
   * fit. Opening, it rises and grows a little.
   */
  private place(): void {
    const eased = 1 - Math.pow(1 - this.progress, 3);
    const camera = this.layer.camera;
    const visibleHeight = 2 * BabylonPanelSurface.DISTANCE * Math.tan(camera.fov / 2);
    const visibleWidth = visibleHeight * this.scene.getEngine().getAspectRatio(camera);
    const perPixel = visibleHeight / this.screenHeight() / BoardTheme.SCALE;
    let width = this.size.width * perPixel;
    let height = this.size.height * perPixel;
    const shrink = Math.min(1, (visibleWidth * 0.98) / width, (visibleHeight * 0.98) / height);
    width *= shrink;
    height *= shrink;
    this.plane.scaling.set(width, height, 1);
    this.root.scaling.setAll(0.94 + 0.06 * eased);
    this.root.position.set(0, -(1 - eased) * visibleHeight * 0.12, BabylonPanelSurface.DISTANCE);
    this.plane.visibility = this.ready ? eased : 0;
  }

  /** After the first layout of a new board: trims it to its content and shows it. */
  private fit(): void {
    if (!this.sheet || this.ready) return;
    const maxPaper = this.screenHeight() * BoardTheme.size.maxScreenHeight - BoardTheme.size.frame * 2;
    const height = this.sheet.fit(maxPaper);
    if (height === null) return;
    this.resize(this.sheet.textureWidth, height);
    this.ready = true;
    this.place();
  }

  private resize(width: number, height: number): void {
    this.size = { width, height };
    this.texture.scaleTo(width, height);
  }

  /** Height of the canvas in CSS pixels. */
  private screenHeight(): number {
    return this.scene.getEngine().getRenderingCanvasClientRect()?.height || window.innerHeight;
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.code !== "Escape" || !this.isOpen || !this.view?.closable) return;
    event.preventDefault();
    this.close();
  }

  private clear(): void {
    for (const control of [...this.texture.rootContainer.children]) control.dispose();
    this.sheet = null;
  }
}
