import { Color3, MeshBuilder, StandardMaterial, TransformNode, type Mesh, type Observer, type Scene } from "@babylonjs/core";
import { AdvancedDynamicTexture } from "@babylonjs/gui";
import { Signal } from "../../core/Signal";
import { TextureFactory } from "../world/TextureFactory";
import type { PanelView } from "./PanelView";
import { UiKit } from "./UiKit";
import type { UiLayer } from "./UiLayer";
import { UiTheme } from "./UiTheme";

/**
 * The board every panel is shown on: a wooden frame with a cream sheet of paper, floating in
 * front of the UI camera. It rises into view with a short animation and closes with Esc.
 */
export class PanelSurface {
  /** Size of the paper texture; views lay out their controls in these pixels. */
  static readonly PAPER_WIDTH = 1600;
  static readonly PAPER_HEIGHT = 1100;

  private static readonly DISTANCE = 2;
  private static readonly FRAME = 0.07;
  private static readonly ANIMATION_SECONDS = 0.22;

  /** The board finished closing (Esc, the close button or `close()`). */
  readonly closed = new Signal<void>();

  private readonly root: TransformNode;
  private readonly meshes: Mesh[];
  private readonly texture: AdvancedDynamicTexture;
  private readonly kit = new UiKit();
  private readonly listeners = new AbortController();
  private readonly frameObserver: Observer<Scene>;
  private view: PanelView | null = null;
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

    const height = 1;
    const width = PanelSurface.PAPER_WIDTH / PanelSurface.PAPER_HEIGHT;
    const frame = PanelSurface.FRAME;
    const board = MeshBuilder.CreatePlane("panelWood", { width: width + frame * 2, height: height + frame * 2 }, scene);
    board.material = this.woodMaterial();
    board.isPickable = false;
    board.position.z = 0.004;

    const paper = MeshBuilder.CreatePlane("panelPaper", { width, height }, scene);
    this.texture = AdvancedDynamicTexture.CreateForMesh(paper, PanelSurface.PAPER_WIDTH, PanelSurface.PAPER_HEIGHT, true, false);
    this.texture.background = UiTheme.color.paper;
    const paperMaterial = paper.material as StandardMaterial;
    paperMaterial.disableLighting = true;

    this.meshes = [board, paper];
    for (const mesh of this.meshes) {
      mesh.parent = this.root;
      mesh.layerMask = UiTheme.LAYER_MASK;
      mesh.applyFog = false;
    }
    this.root.setEnabled(false);

    this.frameObserver = scene.onBeforeRenderObservable.add(() => this.animate(scene.getEngine().getDeltaTime() / 1000));
    window.addEventListener("keydown", (event) => this.onKeyDown(event), { signal: this.listeners.signal });
  }

  get isOpen(): boolean {
    return this.target === 1;
  }

  get currentView(): PanelView | null {
    return this.view;
  }

  /** Shows a view; if the board is already open, the sheet changes without the animation. */
  open(view: PanelView): void {
    this.view = view;
    this.clearSheet();
    const context = { kit: this.kit, close: () => this.close(), closeLabel: this.closeLabel };
    this.texture.addControl(view.render(context, PanelSurface.PAPER_WIDTH, PanelSurface.PAPER_HEIGHT));
    this.target = 1;
    this.root.setEnabled(true);
  }

  close(): void {
    if (this.target === 0) return;
    this.target = 0;
  }

  dispose(): void {
    this.listeners.abort();
    this.scene.onBeforeRenderObservable.remove(this.frameObserver);
    this.texture.dispose();
    this.root.dispose();
  }

  private animate(delta: number): void {
    if (this.progress === this.target) return;
    const step = Math.min(delta, 0.05) / PanelSurface.ANIMATION_SECONDS;
    this.progress = this.target > this.progress ? Math.min(1, this.progress + step) : Math.max(0, this.progress - step);
    this.place();
    if (this.target === 0 && this.progress === 0) {
      this.root.setEnabled(false);
      this.clearSheet();
      this.view = null;
      this.closed.emit();
    }
  }

  /** Fits the board in the view and applies the animation (it rises and grows a little). */
  private place(): void {
    const eased = 1 - Math.pow(1 - this.progress, 3);
    const camera = this.layer.camera;
    const distance = PanelSurface.DISTANCE;
    const visibleHeight = 2 * distance * Math.tan(camera.fov / 2);
    const visibleWidth = visibleHeight * this.scene.getEngine().getAspectRatio(camera);
    const boardWidth = PanelSurface.PAPER_WIDTH / PanelSurface.PAPER_HEIGHT + PanelSurface.FRAME * 2;
    const boardHeight = 1 + PanelSurface.FRAME * 2;
    const fit = Math.min((visibleHeight * 0.88) / boardHeight, (visibleWidth * 0.94) / boardWidth);
    const scale = fit * (0.92 + 0.08 * eased);
    this.root.scaling.setAll(scale);
    this.root.position.set(0, -(1 - eased) * visibleHeight * 0.18, distance);
    for (const mesh of this.meshes) mesh.visibility = eased;
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.code !== "Escape" || !this.isOpen || !this.view?.closable) return;
    event.preventDefault();
    this.close();
  }

  private clearSheet(): void {
    for (const control of [...this.texture.rootContainer.children]) control.dispose();
  }

  /** Unlit wood, so the board looks the same in the sun and inside the salas. */
  private woodMaterial(): StandardMaterial {
    const material = new StandardMaterial("panelWood", this.scene);
    const textures = new TextureFactory(this.scene).wood("#5e3822", 23);
    textures.normal.dispose();
    const wood = textures.albedo;
    wood.uScale = 2;
    material.emissiveTexture = wood;
    material.diffuseColor = Color3.Black();
    material.specularColor = Color3.Black();
    material.disableLighting = true;
    return material;
  }
}
