import { FreeCamera, Vector3, type Scene } from "@babylonjs/core";
import { MotionPreference } from "../MotionPreference";

/** A fixed point of view of the lobby: where the camera stands and what it looks at. */
export interface CameraShot {
  position: Vector3;
  target: Vector3;
}

/** The lobby camera: it does not walk, it glides from one shot to the next. */
export class LobbyCamera {
  readonly camera: FreeCamera;

  private from: CameraShot;
  private to: CameraShot;
  private readonly target: Vector3;
  private progress = 1;
  private seconds = 1;
  private arrived: (() => void) | null = null;

  constructor(scene: Scene, shot: CameraShot) {
    this.camera = new FreeCamera("lobbyCamera", shot.position.clone(), scene);
    this.camera.inputs.clear();
    this.camera.minZ = 0.1;
    this.camera.maxZ = 200;
    this.camera.fov = 0.95;
    this.target = shot.target.clone();
    this.camera.setTarget(this.target);
    scene.activeCamera = this.camera;
    this.from = this.to = LobbyCamera.copy(shot);
  }

  /** Glides to a shot; resolves when it gets there. With reduced motion it cuts to it. */
  moveTo(shot: CameraShot, seconds: number): Promise<void> {
    this.arrived?.();
    this.from = { position: this.camera.position.clone(), target: this.target.clone() };
    this.to = LobbyCamera.copy(shot);
    this.seconds = MotionPreference.reduced ? 0.01 : Math.max(0.01, seconds);
    this.progress = 0;
    return new Promise((resolve) => (this.arrived = resolve));
  }

  update(deltaSeconds: number): void {
    if (this.progress >= 1) return;
    this.progress = Math.min(1, this.progress + deltaSeconds / this.seconds);
    // Ease in and out, so the camera starts and stops gently.
    const t = this.progress < 0.5 ? 4 * this.progress ** 3 : 1 - (-2 * this.progress + 2) ** 3 / 2;
    this.camera.position.copyFrom(Vector3.Lerp(this.from.position, this.to.position, t));
    Vector3.LerpToRef(this.from.target, this.to.target, t, this.target);
    this.camera.setTarget(this.target);
    if (this.progress === 1) {
      const done = this.arrived;
      this.arrived = null;
      done?.();
    }
  }

  private static copy(shot: CameraShot): CameraShot {
    return { position: shot.position.clone(), target: shot.target.clone() };
  }
}
