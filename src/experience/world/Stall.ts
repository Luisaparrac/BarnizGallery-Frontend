import { MeshBuilder, TransformNode, Vector3, type Mesh, type PBRMaterial } from "@babylonjs/core";
import { MeshFactory } from "./MeshFactory";
import { SceneComponent } from "./SceneComponent";
import type { SceneContext } from "./SceneContext";
import type { StallKind } from "./WorldTypes";

/** What changes from one stall to another. */
export interface StallOptions {
  kind: StallKind;
  position: Vector3;
  /** Rotation around y; at 0 the counter faces -z (south). */
  facing: number;
  /** Two lines of the hanging sign. */
  sign: [string, string];
  /** Back wall and the awning cloth. */
  wall: PBRMaterial;
  awning: PBRMaterial;
  /** Every other flap of the valance (the wall's color when left out). */
  trim?: PBRMaterial;
}

/**
 * A wooden market stall of the plaza (Template Method): counter, posts, back wall with shelves,
 * striped awning with a scalloped valance and a hanging sign; each stall puts its own wares on
 * it in `buildWares`. Everything hangs from one node, so a stall can stand anywhere and face
 * any direction. Pieces are placed in the stall's own space: x along the counter, -z is the
 * front where the visitor stands.
 */
export abstract class Stall extends SceneComponent {
  /** Distance from the stall's center to where the visitor stands in front of it. */
  private static readonly STAND_DISTANCE = 3.5;

  protected readonly root: TransformNode;

  protected constructor(
    ctx: SceneContext,
    readonly options: StallOptions,
  ) {
    super(ctx);
    this.root = new TransformNode(`stall-${options.kind}`, ctx.scene);
    this.root.position.copyFrom(options.position);
    this.root.rotation.y = options.facing;
  }

  /** The yaw that makes a stall at `position` face `target` (its front is local -z). */
  static facingTowards(position: Vector3, target: Vector3): number {
    return Math.atan2(position.x - target.x, position.z - target.z);
  }

  /** Where the visitor stands to use the stall: in front of the counter. */
  get standPoint(): Vector3 {
    return this.toWorld(0, -Stall.STAND_DISTANCE);
  }

  get kind(): StallKind {
    return this.options.kind;
  }

  build(): void {
    this.root.computeWorldMatrix(true);
    this.buildCounter();
    this.buildFrame();
    this.buildAwning();
    this.buildSign();
    this.buildWares();
    this.flushDetails(`stall-${this.options.kind}`);
  }

  /** The stall's own goods on the counter and the shelves. */
  protected abstract buildWares(): void;

  // ---------------------------------------------------------------- steps

  private buildCounter(): void {
    const m = this.materials;
    this.solid(this.place(MeshFactory.box(this.scene, "stallCounter", 5.2, 1.15, 1.7, m.woodWarm, 2), 0, 0.575, 0));
    this.detail(this.place(MeshFactory.box(this.scene, "counterTop", 5.5, 0.1, 2.0, m.woodDark, 2), 0, 1.2, 0));
    for (let i = -2; i <= 2; i++) {
      this.detail(this.place(MeshFactory.box(this.scene, "counterPanel", 0.85, 0.7, 0.05, m.woodDark, 2), i * 1.0, 0.58, -0.86));
    }
  }

  private buildFrame(): void {
    const m = this.materials;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) this.detail(this.place(MeshFactory.box(this.scene, "post", 0.2, 3.3, 0.2, m.woodDark, 2), sx * 2.55, 1.65, sz * 0.9));
    }
    this.detail(this.place(MeshFactory.box(this.scene, "backWall", 5.1, 2.3, 0.14, this.options.wall), 0, 2.35, 0.9));
    for (const shelfY of [1.9, 2.55]) this.detail(this.place(MeshFactory.box(this.scene, "shelf", 4.3, 0.07, 0.4, m.woodWarm, 2), 0, shelfY, 0.68));
  }

  /** A slightly tilted striped cloth with a scalloped valance. */
  private buildAwning(): void {
    const awning = MeshBuilder.CreateBox("awning", { width: 6.2, height: 0.08, depth: 3.4 }, this.scene);
    awning.material = this.options.awning;
    this.detail(this.place(awning, 0, 3.4, -0.15)).rotation.x = -0.2;
    for (let i = 0; i < 20; i++) {
      const flap = MeshBuilder.CreateCylinder("valance", { diameter: 0.31, height: 0.06, tessellation: 12 }, this.scene);
      flap.material = i % 2 ? this.materials.cream : (this.options.trim ?? this.options.wall);
      this.detail(this.place(flap, -3.0 + i * 0.315, 3.12, -1.85)).rotation.x = Math.PI / 2;
    }
  }

  private buildSign(): void {
    const sign = MeshBuilder.CreatePlane("stallSign", { width: 3.9, height: 0.98 }, this.scene);
    sign.material = this.materials.signBoard(this.options.sign, 768, 192);
    sign.isPickable = false;
    this.place(sign, 0, 2.55, -1.0);
    for (const sx of [-1, 1]) {
      const chain = MeshBuilder.CreateCylinder("chain", { diameter: 0.03, height: 0.7, tessellation: 6 }, this.scene);
      chain.material = this.materials.iron;
      this.detail(this.place(chain, sx * 1.8, 3.0, -1.0));
    }
  }

  // ---------------------------------------------------------------- helpers

  /** Hangs a mesh from the stall at a point of its own space. */
  protected place(mesh: Mesh, x: number, y: number, z: number): Mesh {
    mesh.parent = this.root;
    mesh.position.set(x, y, z);
    return mesh;
  }

  /** A point of the stall's own space (on the ground) in world space. */
  private toWorld(x: number, z: number): Vector3 {
    return Vector3.TransformCoordinates(new Vector3(x, 0, z), this.root.getWorldMatrix());
  }
}
