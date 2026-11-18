import { MeshBuilder, Vector3, type Mesh, type Scene } from "@babylonjs/core";
import type { MaterialLibrary } from "./MaterialLibrary";
import { MeshBatcher } from "./MeshBatcher";
import type { SceneContext } from "./SceneContext";

/**
 * Base class of every piece of the world (Template Method): subclasses implement `build()`
 * and may react to the render loop in `update()`.
 */
export abstract class SceneComponent {
  protected readonly batcher = new MeshBatcher();

  protected constructor(protected readonly ctx: SceneContext) {}

  protected get scene(): Scene {
    return this.ctx.scene;
  }

  protected get materials(): MaterialLibrary {
    return this.ctx.materials;
  }

  abstract build(): void;

  update(_deltaSeconds: number, _timeSeconds: number): void {}

  /** A walls/props mesh that blocks the player; it stays a separate mesh so collisions stay cheap. */
  protected solid(mesh: Mesh, castShadow = true): Mesh {
    mesh.checkCollisions = true;
    this.ctx.shadows.receive(mesh);
    if (castShadow) this.ctx.shadows.addCaster(mesh);
    return mesh;
  }

  /** Invisible box that only blocks the player (benches, planters...). */
  protected collider(name: string, center: Vector3, width: number, height: number, depth: number): Mesh {
    const box = MeshBuilder.CreateBox(name, { width, height, depth }, this.scene);
    box.position.copyFrom(center);
    box.isVisible = false;
    box.isPickable = false;
    box.checkCollisions = true;
    return box;
  }

  /** Non-colliding detail: queued and merged by material in `flushDetails`. */
  protected detail(mesh: Mesh): Mesh {
    mesh.isPickable = false;
    return this.batcher.add(mesh);
  }

  protected flushDetails(prefix: string, castShadow = true): void {
    for (const mesh of this.batcher.merge(prefix)) {
      this.ctx.shadows.receive(mesh);
      if (castShadow) this.ctx.shadows.addCaster(mesh);
    }
  }
}
