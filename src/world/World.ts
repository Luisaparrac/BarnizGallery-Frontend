import { Color3, Engine, Scene, Vector3 } from "@babylonjs/core";
import type { QualityManager } from "../core/QualityManager";
import { RoomCatalog } from "../data/RoomCatalog";
import { ArtisanAvatar } from "./ArtisanAvatar";
import { CameraRig } from "./CameraRig";
import { Fountain } from "./Fountain";
import { InputController } from "./InputController";
import { DoorInteractable, KioskInteractable } from "./Interactable";
import { InteractionSystem } from "./InteractionSystem";
import { Kiosk } from "./Kiosk";
import { Lighting } from "./Lighting";
import { MaterialLibrary } from "./MaterialLibrary";
import { PerimeterWall } from "./PerimeterWall";
import { PlayerController } from "./PlayerController";
import { Plaza } from "./Plaza";
import { PlazaLayout } from "./PlazaLayout";
import { PostProcessing } from "./PostProcessing";
import { SalaBuilding } from "./SalaBuilding";
import type { SceneComponent } from "./SceneComponent";
import type { SceneContext } from "./SceneContext";
import { ShadowRig } from "./ShadowRig";
import { SkyDome } from "./SkyDome";
import { StreetFurniture } from "./StreetFurniture";
import { Terrain } from "./Terrain";
import { Vegetation } from "./Vegetation";

/** Facade over the whole 3D scene: builds it, runs the render loop and exposes what the UI needs. */
export class World {
  readonly engine: Engine;
  readonly scene: Scene;
  readonly player: PlayerController;
  readonly input: InputController;
  readonly interactions = new InteractionSystem();
  readonly salas = new Map<string, SalaBuilding>();

  private readonly components: SceneComponent[] = [];
  private time = 0;

  constructor(canvas: HTMLCanvasElement, private readonly quality: QualityManager) {
    this.engine = new Engine(canvas, true, { stencil: true, antialias: false, powerPreference: "high-performance" }, true);
    this.applyHardwareScaling();
    this.scene = new Scene(this.engine);
    this.scene.collisionsEnabled = true;

    // The camera must exist before the cascaded shadows are created.
    const cameraRig = new CameraRig(this.scene);
    const lighting = new Lighting(this.scene);
    const sky = new SkyDome(this.scene, lighting);
    this.configureAtmosphere(sky.horizonColor);

    const shadows = new ShadowRig(lighting.sun, quality.settings);
    const materials = new MaterialLibrary(this.scene);
    const context: SceneContext = { scene: this.scene, materials, shadows, quality };

    this.buildComponents(context);

    this.input = new InputController(canvas);
    const avatar = new ArtisanAvatar(this.scene, materials, shadows);
    this.player = new PlayerController(this.scene, this.input, avatar, cameraRig, PlazaLayout.spawn);
    this.player.lookAt(0, 0);

    new PostProcessing(this.scene, cameraRig.camera, quality, sky.sunDisc);

    this.input.interactPressed.subscribe(() => this.interactions.activateNearby());
    quality.changed.subscribe(() => this.applyHardwareScaling());
    window.addEventListener("resize", () => this.engine.resize());
    this.engine.runRenderLoop(() => this.frame());
  }

  /** Makes the given salas glow (kiosk recommendations). */
  setRecommendedRooms(keys: string[]): void {
    this.salas.forEach((sala, key) => sala.setRecommended(keys.includes(key)));
  }

  private buildComponents(context: SceneContext): void {
    this.components.push(new Terrain(context), new Plaza(context), new PerimeterWall(context), new Fountain(context), new Kiosk(context), new Vegetation(context), new StreetFurniture(context));

    RoomCatalog.rooms.forEach((room, index) => {
      const accent = index % 2 === 0 ? context.materials.paintRed : context.materials.paintGreen;
      const sala = new SalaBuilding(context, room, accent);
      this.salas.set(room.key, sala);
      this.components.push(sala);
    });

    this.components.forEach((component) => component.build());

    this.salas.forEach((sala) => this.interactions.register(new DoorInteractable(sala.doorPoint, sala)));
    this.interactions.register(new KioskInteractable(PlazaLayout.kioskPoint));
  }

  private configureAtmosphere(horizon: Color3): void {
    this.scene.clearColor = horizon.toColor4(1);
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogColor = horizon;
    this.scene.fogDensity = 0.0017;
    this.scene.ambientColor = new Color3(0.3, 0.26, 0.24);
  }

  private applyHardwareScaling(): void {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.engine.setHardwareScalingLevel(this.quality.settings.hardwareScaling / ratio);
  }

  private frame(): void {
    const delta = Math.min(this.engine.getDeltaTime() / 1000, 0.1);
    this.time += delta;
    this.quality.trackFrame(delta);
    this.player.update(delta);
    this.components.forEach((component) => component.update(delta, this.time));
    this.interactions.update(this.player.position);
    this.scene.render();
  }

  /** Vector used by tests and the debug console to place the player. */
  teleportPlayer(position: Vector3): void {
    this.player.teleport(position.x, position.z);
  }
}
