import { FreeCamera, Vector3, type AbstractEngine, type Camera, type Observer, type Scene } from "@babylonjs/core";
import { AdvancedDynamicTexture } from "@babylonjs/gui";
import { UiTheme } from "./UiTheme";

/**
 * Second camera that draws only the UI (panels and HUD) after the world camera. The world's
 * post-processing (bloom, SSAO, tone mapping) is attached to the world camera, so the UI keeps its
 * real colors. The camera never moves: panels are placed in front of it in its own space.
 */
export class UiLayer {
  readonly camera: FreeCamera;
  /** Full-screen texture of the HUD. */
  readonly hudTexture: AdvancedDynamicTexture;
  private readonly resizeObserver: Observer<AbstractEngine>;

  constructor(
    private readonly scene: Scene,
    private readonly worldCamera: Camera,
  ) {
    this.camera = new FreeCamera("uiCamera", Vector3.Zero(), scene);
    this.camera.inputs.clear();
    this.camera.setTarget(new Vector3(0, 0, 1));
    this.camera.layerMask = UiTheme.LAYER_MASK;
    this.camera.fov = 0.8;
    this.camera.minZ = 0.05;
    this.camera.maxZ = 20;
    // The world camera's default mask (0x0FFFFFFF) already leaves out the UI layer.
    scene.activeCameras = [worldCamera, this.camera];
    scene.activeCamera = worldCamera;
    this.usePanelPointer(false);

    this.hudTexture = AdvancedDynamicTexture.CreateFullscreenUI("hud", true, scene);
    if (this.hudTexture.layer) this.hudTexture.layer.layerMask = UiTheme.LAYER_MASK;
    // The quality manager renders the world at a lower or higher resolution; the HUD keeps its
    // size in screen pixels by compensating that scale.
    const engine = scene.getEngine();
    const matchScale = () => (this.hudTexture.renderScale = engine.getHardwareScalingLevel());
    matchScale();
    this.resizeObserver = engine.onResizeObservable.add(matchScale);
  }

  /**
   * Which camera the mouse picks with: the UI camera while a panel is open (its controls live on a
   * mesh in front of it), the world camera otherwise (display cases and doors).
   */
  usePanelPointer(panelOpen: boolean): void {
    this.scene.cameraToUseForPointers = panelOpen ? this.camera : this.worldCamera;
  }

  /** True while the mouse is over a HUD control, so the click must not reach the world. */
  get pointerOverHud(): boolean {
    return this.hudTexture._shouldBlockPointer;
  }

  dispose(): void {
    this.scene.getEngine().onResizeObservable.remove(this.resizeObserver);
    this.hudTexture.dispose();
    this.camera.dispose();
  }
}
