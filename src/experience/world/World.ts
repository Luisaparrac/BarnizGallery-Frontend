import { Color3, Engine, Scene, Vector3, type FreeCamera } from "@babylonjs/core";
import { Signal } from "../../core/Signal";
import { AvatarFactory } from "./AvatarFactory";
import { CameraRig } from "./CameraRig";
import { QualityManager } from "./core/QualityManager";
import { Fountain } from "./Fountain";
import { InputController } from "./InputController";
import { CashierStall } from "./CashierStall";
import { CommissionHall } from "./CommissionHall";
import type { HallMetadata } from "./CommissionHallInterior";
import { DesignFrameInteractable, DoorInteractable, HallDoorInteractable, OffersBoardInteractable, PieceInteractable, StallInteractable, type Interactable } from "./Interactable";
import { InteractionSystem } from "./InteractionSystem";
import { InteriorLighting } from "./InteriorLighting";
import { Kiosk } from "./Kiosk";
import { Lighting } from "./Lighting";
import { MaterialLibrary } from "./MaterialLibrary";
import { PerimeterWall } from "./PerimeterWall";
import { PhotoPass } from "./PhotoPass";
import { PlayerController } from "./PlayerController";
import { Plaza } from "./Plaza";
import { PlazaLayout } from "./PlazaLayout";
import { PostProcessing } from "./PostProcessing";
import { SalaBuilding } from "./SalaBuilding";
import { SalaSlots } from "./SalaSlots";
import type { SceneComponent } from "./SceneComponent";
import type { SceneContext } from "./SceneContext";
import { ShadowRig } from "./ShadowRig";
import { SkyDome } from "./SkyDome";
import { StreetFurniture } from "./StreetFurniture";
import { Terrain } from "./Terrain";
import { Vegetation } from "./Vegetation";
import type { PieceMetadata } from "./Vitrina";
import type { CameraMode, HallBoard, HallDesign, HallTexts, StallKind, WorldPiece, WorldRoom } from "./WorldTypes";

/**
 * Facade over the whole 3D scene: the plaza, one sala per master with the pieces in display cases,
 * the visitor and the render loop. The experience only talks to this class.
 */
export class World {
  readonly engine: Engine;
  readonly scene: Scene;
  /** The world camera (the UI has its own camera on top). */
  readonly camera: FreeCamera;
  readonly player: PlayerController;
  readonly input: InputController;
  readonly interactions = new InteractionSystem();
  readonly salas = new Map<string, SalaBuilding>();
  /** The visitor chose a piece (E in front of a case, or a click on it). */
  readonly pieceSelected = new Signal<WorldPiece>();
  /** The visitor used a counter (the welcome kiosk, the cashier or the commissions hall's front desk). */
  readonly stallUsed = new Signal<StallKind>();
  /** The visitor picked a frame of the commissions hall's design wall (its index). */
  readonly designPicked = new Signal<number>();
  /** The visitor picked the offers board of the commissions hall. */
  readonly offersPicked = new Signal<void>();
  /** Returns true while a click belongs to the UI (a HUD button), so the world ignores it. */
  pointerBlocked: () => boolean = () => false;

  private readonly components: SceneComponent[] = [];
  private readonly pieces = new Map<number, WorldPiece>();
  private readonly quality: QualityManager;
  private readonly avatars: AvatarFactory;
  private readonly photoPass: PhotoPass;
  private hall: CommissionHall | null = null;
  private readonly onResize = () => this.engine.resize();
  private time = 0;

  constructor(
    canvas: HTMLCanvasElement,
    rooms: readonly WorldRoom[],
    hallTexts: HallTexts,
    requestedQuality: string | null,
    avatarCode: string | null = null,
  ) {
    this.quality = new QualityManager(requestedQuality);
    this.engine = new Engine(canvas, true, { stencil: true, antialias: false, powerPreference: "high-performance" }, true);
    this.applyHardwareScaling();
    this.scene = new Scene(this.engine);
    this.scene.collisionsEnabled = true;

    // The camera must exist before the cascaded shadows are created.
    const cameraRig = new CameraRig(this.scene);
    this.camera = cameraRig.camera;
    const lighting = new Lighting(this.scene);
    const sky = new SkyDome(this.scene, lighting);
    this.configureAtmosphere(sky.horizonColor);

    const shadows = new ShadowRig(lighting.sun, this.quality.settings);
    const materials = new MaterialLibrary(this.scene);
    const interior = new InteriorLighting(this.scene, lighting);
    this.photoPass = new PhotoPass(this.scene, this.camera);
    const context: SceneContext = { scene: this.scene, materials, shadows, quality: this.quality, interior, photos: this.photoPass };

    this.buildComponents(context, rooms, hallTexts);

    this.input = new InputController(canvas);
    this.avatars = new AvatarFactory({ scene: this.scene, materials, shadows });
    this.player = new PlayerController(this.scene, this.input, this.avatars.procedural(avatarCode), cameraRig, PlazaLayout.spawn);
    this.player.lookAt(0, 0);

    new PostProcessing(this.scene, cameraRig.camera, this.quality, sky.sunDisc);

    this.input.interactPressed.subscribe(() => this.interactions.activateNearby());
    this.input.clicked.subscribe(({ x, y }) => this.onCanvasClick(x, y));
    this.interactions.activated.subscribe((item) => this.activate(item));
    this.quality.changed.subscribe(() => this.applyHardwareScaling());
    window.addEventListener("resize", this.onResize);
    this.engine.runRenderLoop(() => this.frame());
  }

  get cameraMode(): CameraMode {
    return this.player.mode;
  }

  /** Lets the visitor move and look around, or freezes the world while a panel is open. */
  setPlaying(playing: boolean): void {
    this.player.setEnabled(playing);
  }

  /**
   * The world starts with the visitor's avatar made in code; this swaps it for the .glb model of
   * that code when one exists.
   */
  async useAvatar(code: string | null): Promise<void> {
    if (!code) return;
    const model = await this.avatars.gltf(code);
    if (model) this.player.setAvatar(model);
  }

  /** Stops rendering and frees the GPU and every listener. */
  dispose(): void {
    window.removeEventListener("resize", this.onResize);
    this.input.dispose();
    this.engine.stopRenderLoop();
    this.photoPass.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }

  private buildComponents(context: SceneContext, rooms: readonly WorldRoom[], hallTexts: HallTexts): void {
    const stalls = [new Kiosk(context), new CashierStall(context)];
    const hall = new CommissionHall(context, PlazaLayout.commissionHall, PlazaLayout.center, hallTexts);
    this.hall = hall;
    this.components.push(new Terrain(context), new Plaza(context), new PerimeterWall(context), new Fountain(context), ...stalls, hall, new Vegetation(context), new StreetFurniture(context));

    SalaSlots.assign(rooms).forEach(({ room, slot }, index) => {
      const accent = index % 2 === 0 ? context.materials.paintRed : context.materials.paintGreen;
      const sala = new SalaBuilding(context, room, slot, accent);
      this.salas.set(room.key, sala);
      this.components.push(sala);
    });

    this.components.forEach((component) => component.build());

    this.salas.forEach((sala) => {
      sala.setRecommended(sala.room.recommended);
      this.interactions.register(new DoorInteractable(sala.doorPoint, sala));
      for (const vitrina of sala.interior.vitrinas) {
        this.pieces.set(vitrina.piece.id, vitrina.piece);
        this.interactions.register(new PieceInteractable(vitrina.viewPoint, vitrina));
      }
    });
    stalls.forEach((stall) => this.interactions.register(new StallInteractable(stall.standPoint, stall.kind)));

    this.interactions.register(new HallDoorInteractable(hall.doorPoint, 3));
    this.interactions.register(new StallInteractable(hall.counterPoint, "commissions", 1.8));
    this.interactions.register(new OffersBoardInteractable(hall.boardPoint));
    hall.framePoints.forEach((point, index) => this.interactions.register(new DesignFrameInteractable(point, index)));
  }

  /** Fills the design wall of the commissions hall (the visitor's designs, or examples). */
  setCommissionDesigns(designs: readonly HallDesign[], emptyLabel: string): void {
    this.hall?.setDesigns(designs, emptyLabel);
  }

  /** Writes the offers chalkboard of the commissions hall. */
  setCommissionBoard(board: HallBoard): void {
    this.hall?.setBoard(board);
  }

  private activate(item: Interactable): void {
    if (item instanceof PieceInteractable) this.pieceSelected.emit(item.vitrina.piece);
    else if (item instanceof StallInteractable) this.stallUsed.emit(item.kind);
    else if (item instanceof DesignFrameInteractable) this.designPicked.emit(item.index);
    else if (item instanceof OffersBoardInteractable) this.offersPicked.emit();
  }

  /** A click on a display case opens the piece; any other click captures the mouse to look around. */
  private onCanvasClick(x: number, y: number): void {
    if (this.pointerBlocked()) return;
    const hit = this.scene.pick(x, y, (mesh) => mesh.isPickable && mesh.isEnabled(), false, this.camera);
    const metadata = hit?.pickedMesh?.metadata as (Partial<PieceMetadata> & HallMetadata) | null | undefined;
    if (metadata && hit && hit.distance < 7) {
      const piece = metadata.pieceId !== undefined ? this.pieces.get(metadata.pieceId) : undefined;
      if (piece) return this.pieceSelected.emit(piece);
      if (metadata.hallFrame !== undefined) return this.designPicked.emit(metadata.hallFrame);
      if (metadata.hallBoard) return this.offersPicked.emit();
    }
    this.input.requestPointerLock();
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
    this.photoPass.update(this.player.position, this.player.mode === "THIRD_PERSON");
    this.scene.render();
  }

  /** Lights up the salas of these rooms (by key) as recommended and turns the others off. */
  setRecommendedRooms(keys: Set<string>): void {
    this.salas.forEach((sala, key) => {
      sala.room.recommended = keys.has(key);
      sala.setRecommended(keys.has(key));
    });
  }

  /** Used by the debug console and the automated tour to place the visitor. */
  teleportPlayer(position: Vector3, lookAt?: Vector3): void {
    this.player.teleport(position.x, position.z);
    if (lookAt) this.player.lookAt(lookAt.x, lookAt.z);
  }
}
