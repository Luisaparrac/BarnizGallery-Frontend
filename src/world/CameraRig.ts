import { FreeCamera, Ray, Vector3, type AbstractMesh, type Scene } from "@babylonjs/core";
import type { CameraMode } from "../model/models";

/** One camera that behaves as a first-person eye or a third-person follow camera with wall avoidance. */
export class CameraRig {
  readonly camera: FreeCamera;
  mode: CameraMode = "THIRD_PERSON";
  yaw = 0;

  private pitch = 0.25;
  private distance = 4.6;

  private static readonly EYE_HEIGHT = 1.62;
  private static readonly TARGET_HEIGHT = 1.55;

  constructor(private readonly scene: Scene) {
    this.camera = new FreeCamera("camera", new Vector3(0, CameraRig.EYE_HEIGHT, 0), scene);
    this.camera.inputs.clear();
    this.camera.minZ = 0.1;
    this.camera.maxZ = 5200;
    this.camera.fov = 0.95;
    scene.activeCamera = this.camera;
  }

  setMode(mode: CameraMode): void {
    this.mode = mode;
    this.pitch = mode === "FIRST_PERSON" ? 0 : 0.25;
  }

  rotate(dx: number, dy: number): void {
    this.yaw += dx * 0.0022;
    this.pitch += dy * 0.0022;
    const first = this.mode === "FIRST_PERSON";
    this.pitch = Math.min(first ? 1.3 : 1.15, Math.max(first ? -1.3 : -0.12, this.pitch));
  }

  zoom(wheelDelta: number): void {
    if (this.mode !== "THIRD_PERSON") return;
    this.distance = Math.min(9, Math.max(2.4, this.distance + wheelDelta * 0.004));
  }

  /** Positions the camera around the player's feet. `ignore` is the player's own collider. */
  follow(feet: Vector3, ignore: AbstractMesh): void {
    const camera = this.camera;
    if (this.mode === "FIRST_PERSON") {
      camera.position.set(feet.x, CameraRig.EYE_HEIGHT, feet.z);
      camera.rotation.set(this.pitch, this.yaw, 0);
      return;
    }
    const target = new Vector3(feet.x, CameraRig.TARGET_HEIGHT, feet.z);
    const cosPitch = Math.cos(this.pitch);
    const direction = new Vector3(Math.sin(this.yaw) * cosPitch, -Math.sin(this.pitch), Math.cos(this.yaw) * cosPitch);
    let distance = this.distance;
    const hit = this.scene.pickWithRay(new Ray(target, direction.scale(-1), distance + 0.3), (mesh) => mesh.checkCollisions && mesh !== ignore && mesh.isEnabled());
    if (hit?.hit && hit.distance < distance + 0.3) distance = Math.max(0.8, hit.distance - 0.3);
    camera.position.copyFrom(target.subtract(direction.scale(distance)));
    camera.position.y = Math.max(0.4, camera.position.y);
    camera.setTarget(target);
  }
}
