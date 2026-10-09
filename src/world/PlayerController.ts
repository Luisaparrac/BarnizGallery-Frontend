import { MeshBuilder, Vector3, type Mesh, type Scene } from "@babylonjs/core";
import { Signal } from "../core/Signal";
import type { CameraMode } from "../model/models";
import type { ArtisanAvatar } from "./ArtisanAvatar";
import type { CameraRig } from "./CameraRig";
import type { InputController } from "./InputController";

/** Moves the artisan with collisions and drives the camera; the single owner of the player's state. */
export class PlayerController {
  readonly modeChanged = new Signal<CameraMode>();

  private static readonly WALK_SPEED = 4.2;
  private static readonly RUN_SPEED = 7.6;

  private readonly collider: Mesh;
  private enabled = false;
  private facing = 0;

  constructor(
    scene: Scene,
    private readonly input: InputController,
    private readonly avatar: ArtisanAvatar,
    private readonly cameraRig: CameraRig,
    spawn: Vector3,
  ) {
    this.collider = MeshBuilder.CreateBox("playerCollider", { size: 0.5 }, scene);
    this.collider.isVisible = false;
    this.collider.isPickable = false;
    this.collider.ellipsoid = new Vector3(0.4, 0.9, 0.4);
    this.collider.position.set(spawn.x, 0.9, spawn.z);

    this.input.toggleViewPressed.subscribe(() => this.toggleMode());
    this.applyMode();
  }

  get mode(): CameraMode {
    return this.cameraRig.mode;
  }

  get position(): Vector3 {
    return new Vector3(this.collider.position.x, 0, this.collider.position.z);
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.input.setEnabled(enabled);
  }

  setMode(mode: CameraMode): void {
    if (mode === this.cameraRig.mode) return;
    this.cameraRig.setMode(mode);
    this.applyMode();
    this.modeChanged.emit(mode);
  }

  toggleMode(): void {
    this.setMode(this.mode === "FIRST_PERSON" ? "THIRD_PERSON" : "FIRST_PERSON");
  }

  teleport(x: number, z: number): void {
    this.collider.position.set(x, 0.9, z);
  }

  lookAt(x: number, z: number): void {
    this.cameraRig.yaw = Math.atan2(x - this.collider.position.x, z - this.collider.position.z);
    this.facing = this.cameraRig.yaw;
    this.avatar.root.rotation.y = this.facing;
  }

  update(deltaSeconds: number): void {
    let animationSpeed = 0;
    if (this.enabled) {
      const look = this.input.consumeLook();
      this.cameraRig.rotate(look.dx, look.dy);
      this.cameraRig.zoom(this.input.consumeWheel());
      animationSpeed = this.move(deltaSeconds);
    }

    const position = this.collider.position;
    this.avatar.root.position.set(position.x, 0, position.z);
    const difference = Math.atan2(Math.sin(this.facing - this.avatar.root.rotation.y), Math.cos(this.facing - this.avatar.root.rotation.y));
    this.avatar.root.rotation.y += difference * Math.min(1, deltaSeconds * 12);
    this.avatar.animate(deltaSeconds, animationSpeed);
    this.cameraRig.follow(this.position, this.collider);
  }

  private move(deltaSeconds: number): number {
    const { forward, strafe, run } = this.input.moveAxes();
    if (!forward && !strafe) return 0;
    const yaw = this.cameraRig.yaw;
    let dx = Math.sin(yaw) * forward + Math.cos(yaw) * strafe;
    let dz = Math.cos(yaw) * forward - Math.sin(yaw) * strafe;
    const length = Math.hypot(dx, dz) || 1;
    dx /= length;
    dz /= length;
    const speed = run ? PlayerController.RUN_SPEED : PlayerController.WALK_SPEED;
    this.collider.moveWithCollisions(new Vector3(dx * speed * deltaSeconds, 0, dz * speed * deltaSeconds));
    this.collider.position.y = 0.9;
    this.facing = Math.atan2(dx, dz);
    return run ? 1.8 : 1;
  }

  private applyMode(): void {
    this.avatar.setVisible(this.mode === "THIRD_PERSON");
  }
}
