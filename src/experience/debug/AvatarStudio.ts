import {
  ArcRotateCamera,
  Color3,
  DirectionalLight,
  Engine,
  HemisphericLight,
  type Mesh,
  ImageProcessingConfiguration,
  MeshBuilder,
  Scene,
  Tools,
  Vector3,
} from "@babylonjs/core";
import type { Stage } from "../Stage";
import { AvatarFactory } from "../world/AvatarFactory";
import type { AvatarModel } from "../world/AvatarModel";
import { QualityManager } from "../world/core/QualityManager";
import { MaterialLibrary } from "../world/MaterialLibrary";
import { ShadowRig } from "../world/ShadowRig";

/**
 * Debug stage (`?debug=avatars`): the five procedural avatars in a row on a cream background.
 * Keys 0, 1 and 2 switch between idle, walk and run, W makes them wave and P downloads the
 * catalog portraits (`<code>.png`, for `public/avatars`).
 */
export class AvatarStudio implements Stage {
  private static readonly BACKGROUND = "#efe4cc";
  private static readonly SPACING = 1.1;
  private static readonly PORTRAIT_SIZE = 512;

  private readonly engine: Engine;
  private readonly scene: Scene;
  private readonly camera: ArcRotateCamera;
  private readonly avatars = new Map<string, AvatarModel>();
  private readonly floor: Mesh;
  private readonly onResize = () => this.engine.resize();
  private readonly onKey = (event: KeyboardEvent) => this.key(event);
  private speed = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, antialias: true }, true);
    this.engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 2));
    this.scene = new Scene(this.engine);
    this.scene.clearColor = Color3.FromHexString(AvatarStudio.BACKGROUND).toColor4(1);
    this.scene.imageProcessingConfiguration.toneMappingEnabled = true;
    this.scene.imageProcessingConfiguration.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
    this.scene.imageProcessingConfiguration.exposure = 1.15;

    this.camera = new ArcRotateCamera("studioCamera", Math.PI / 2, 1.38, 7, new Vector3(0, 1, 0), this.scene);
    this.camera.fov = 0.6;
    this.camera.minZ = 0.05;
    this.camera.wheelPrecision = 60;
    this.camera.attachControl(canvas, true);

    const fill = new HemisphericLight("studioFill", new Vector3(0, 1, 0.3), this.scene);
    fill.intensity = 0.9;
    fill.diffuse = Color3.FromHexString("#fff1dc");
    fill.groundColor = Color3.FromHexString("#7a5a44");
    const key = new DirectionalLight("studioKey", new Vector3(-0.45, -1, -0.8).normalize(), this.scene);
    key.position = new Vector3(4, 8, 8);
    key.intensity = 2.2;
    key.diffuse = Color3.FromHexString("#ffe6c2");
    const shadows = new ShadowRig(key, new QualityManager("high").settings);
    const materials = new MaterialLibrary(this.scene);

    this.floor = MeshBuilder.CreateDisc("studioFloor", { radius: 6, tessellation: 64 }, this.scene);
    this.floor.rotation.x = Math.PI / 2;
    this.floor.material = materials.cream;
    shadows.receive(this.floor);

    const factory = new AvatarFactory({ scene: this.scene, materials, shadows });
    AvatarFactory.CODES.forEach((code, index) => {
      const avatar = factory.procedural(code);
      avatar.root.position.x = (index - (AvatarFactory.CODES.length - 1) / 2) * AvatarStudio.SPACING;
      this.avatars.set(code, avatar);
    });

    (window as unknown as { museoAvatars?: unknown }).museoAvatars = {
      setSpeed: (speed: number) => (this.speed = speed),
      wave: () => this.avatars.forEach((avatar) => avatar.wave()),
      portraits: () => this.portraits(),
      camera: this.camera,
    };
    window.addEventListener("resize", this.onResize);
    window.addEventListener("keydown", this.onKey);
    this.engine.runRenderLoop(() => {
      const delta = Math.min(this.engine.getDeltaTime() / 1000, 0.1);
      this.avatars.forEach((avatar) => avatar.animate(delta, this.speed));
      this.scene.render();
    });
  }

  dispose(): void {
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("keydown", this.onKey);
    this.engine.stopRenderLoop();
    this.scene.dispose();
    this.engine.dispose();
  }

  /** A head-and-shoulders picture of each avatar, alone, as PNG data URLs. */
  async portraits(): Promise<Record<string, string>> {
    const saved = { alpha: this.camera.alpha, beta: this.camera.beta, radius: this.camera.radius, target: this.camera.target.clone() };
    const result: Record<string, string> = {};
    // Only the cream background behind the portrait.
    this.floor.setEnabled(false);
    for (const [code, avatar] of this.avatars) {
      this.avatars.forEach((other) => other.setVisible(other === avatar));
      this.camera.setTarget(new Vector3(avatar.root.position.x, 1.5, 0));
      this.camera.alpha = Math.PI / 2 - 0.3;
      this.camera.beta = 1.5;
      this.camera.radius = 1.75;
      this.scene.render();
      result[code] = await Tools.CreateScreenshotUsingRenderTargetAsync(this.engine, this.camera, AvatarStudio.PORTRAIT_SIZE, "image/png", 4, true);
    }
    this.avatars.forEach((avatar) => avatar.setVisible(true));
    this.floor.setEnabled(true);
    this.camera.setTarget(saved.target);
    Object.assign(this.camera, { alpha: saved.alpha, beta: saved.beta, radius: saved.radius });
    return result;
  }

  private key(event: KeyboardEvent): void {
    if (event.key === "0" || event.key === "1" || event.key === "2") this.speed = [0, 1, 1.8][Number(event.key)];
    if (event.key.toLowerCase() === "w") this.avatars.forEach((avatar) => avatar.wave());
    if (event.key.toLowerCase() === "p") void this.download();
  }

  private async download(): Promise<void> {
    for (const [code, url] of Object.entries(await this.portraits())) {
      const link = document.createElement("a");
      link.href = url;
      link.download = `${code}.png`;
      link.click();
    }
  }
}
