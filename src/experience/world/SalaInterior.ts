import { MeshBuilder, Vector3, type Material, type Mesh, type TransformNode } from "@babylonjs/core";
import { MeshBatcher } from "./MeshBatcher";
import { MeshFactory } from "./MeshFactory";
import type { SceneContext } from "./SceneContext";
import { Vitrina } from "./Vitrina";
import type { WorldRoom } from "./WorldTypes";

/** Inner size of a sala, in the building's local frame (door on the -Z side). */
export interface SalaFrame {
  innerHalfWidth: number;
  innerFrontZ: number;
  innerBackZ: number;
  doorHalfWidth: number;
  doorHeight: number;
}

/** Spots for display cases: x, z and the Y rotation that turns the case front towards the room. */
const CASE_SPOTS: readonly [number, number, number][] = [
  [0, 4.2, 0],
  [-3.9, 4.2, 0],
  [3.9, 4.2, 0],
  [-6.25, 1.9, -Math.PI / 2],
  [6.25, 1.9, Math.PI / 2],
  [-6.25, -1.7, -Math.PI / 2],
  [6.25, -1.7, Math.PI / 2],
  [-2.3, 0.2, 0],
  [2.3, 0.2, 0],
];

/** Inside of a master's sala: wooden floor, beamed ceiling, painted walls, a name sign and the display cases. */
export class SalaInterior {
  static readonly CEILING = 4.4;
  /** Most pieces one sala can show. */
  static readonly CAPACITY = CASE_SPOTS.length;

  readonly vitrinas: Vitrina[] = [];
  /** Static parts of the room and of its cases, merged per material at the end of `build()`. */
  private readonly batcher = new MeshBatcher();

  constructor(
    private readonly ctx: SceneContext,
    private readonly root: TransformNode,
    private readonly room: WorldRoom,
    private readonly frame: SalaFrame,
  ) {}

  build(): void {
    this.buildRoom();
    this.buildSign();
    this.room.pieces.slice(0, SalaInterior.CAPACITY).forEach((piece, index) => {
      const [x, z, facing] = CASE_SPOTS[index];
      const vitrina = new Vitrina(this.ctx, this.root, piece, x, z, facing, this.batcher);
      vitrina.build();
      this.vitrinas.push(vitrina);
      this.ceilingLamp(x, z);
    });
    // The merge bakes world positions, so the case roots must be up to date first.
    this.root.computeWorldMatrix(true);
    this.vitrinas.forEach((vitrina) => vitrina.root.computeWorldMatrix(true));
    const merged = this.batcher.merge(`${this.room.key}-interior`);
    for (const mesh of merged) {
      mesh.isPickable = false;
      this.ctx.interior.add(mesh);
    }
    const { innerHalfWidth: hw, innerFrontZ: fz, innerBackZ: bz } = this.frame;
    this.ctx.photos.addRoom({
      world: this.root.getWorldMatrix(),
      min: new Vector3(-hw, 0, fz),
      max: new Vector3(hw, SalaInterior.CEILING, bz),
      photos: this.vitrinas.flatMap((vitrina) => (vitrina.photo ? [vitrina.photo] : [])),
      occluders: merged,
    });
  }

  private buildRoom(): void {
    const m = this.ctx.materials;
    const { innerHalfWidth: hw, innerFrontZ: fz, innerBackZ: bz, doorHalfWidth: dw, doorHeight: dh } = this.frame;
    const width = hw * 2;
    const depth = bz - fz;
    const midZ = (fz + bz) / 2;
    const H = SalaInterior.CEILING;
    const skin = 0.02;

    this.part("floor", width, 0.04, depth, 0, 0.02, midZ, m.woodWarm, 2);
    this.part("ceiling", width, 0.05, depth, 0, H + 0.025, midZ, m.cream, 0);
    for (let z = fz + 1.4; z < bz - 0.5; z += 2.1) this.part("beam", width, 0.22, 0.2, 0, H - 0.11, z, m.woodDark, 2);

    // Painted wall skins just inside the stone walls, so the sun never lights them.
    this.part("wallLeft", skin, H, depth, -hw + skin / 2, H / 2, midZ, m.gallery, 3);
    this.part("wallRight", skin, H, depth, hw - skin / 2, H / 2, midZ, m.gallery, 3);
    this.part("wallBack", width, H, skin, 0, H / 2, bz - skin / 2, m.gallery, 3);
    const sideWidth = hw - dw;
    for (const side of [-1, 1]) this.part("wallFront", sideWidth, H, skin, side * (dw + sideWidth / 2), H / 2, fz + skin / 2, m.gallery, 3);
    this.part("wallOverDoor", dw * 2, H - dh, skin, 0, dh + (H - dh) / 2, fz + skin / 2, m.gallery, 3);

    // Dark wooden wainscot and a thin rail around the room.
    const wain = 0.95;
    this.part("wainLeft", 0.05, wain, depth, -hw + 0.045, wain / 2, midZ, m.woodDark, 1.2);
    this.part("wainRight", 0.05, wain, depth, hw - 0.045, wain / 2, midZ, m.woodDark, 1.2);
    this.part("wainBack", width, wain, 0.05, 0, wain / 2, bz - 0.045, m.woodDark, 1.2);
    for (const side of [-1, 1]) this.part("wainFront", sideWidth, wain, 0.05, side * (dw + sideWidth / 2), wain / 2, fz + 0.045, m.woodDark, 1.2);
    this.part("railBack", width, 0.06, 0.08, 0, wain + 0.03, bz - 0.06, m.brass);
    this.part("railLeft", 0.08, 0.06, depth, -hw + 0.06, wain + 0.03, midZ, m.brass);
    this.part("railRight", 0.08, 0.06, depth, hw - 0.06, wain + 0.03, midZ, m.brass);
  }

  /** Board above the back cases with the master's name and workshop. */
  private buildSign(): void {
    const sign = MeshBuilder.CreatePlane(`${this.room.key}-insideSign`, { width: 6.4, height: 0.9 }, this.ctx.scene);
    sign.material = this.ctx.materials.signBoard([this.room.masterName, this.room.insideSign], 1536, 216);
    sign.parent = this.root;
    sign.position.set(0, 3.35, this.frame.innerBackZ - 0.05);
    sign.isPickable = false;
    this.ctx.interior.add(sign);
  }

  private ceilingLamp(x: number, z: number): void {
    const lamp = MeshBuilder.CreateCylinder(`${this.room.key}-lamp`, { diameter: 0.42, height: 0.08, tessellation: 20 }, this.ctx.scene);
    lamp.material = this.ctx.materials.glowLamp;
    lamp.parent = this.root;
    lamp.position.set(x, SalaInterior.CEILING - 0.04, z);
    this.batcher.add(lamp);
  }

  private part(name: string, w: number, h: number, d: number, x: number, y: number, z: number, material: Material, tile = 0): Mesh {
    const mesh = MeshFactory.box(this.ctx.scene, `${this.room.key}-${name}`, w, h, d, material, tile);
    mesh.parent = this.root;
    mesh.position.set(x, y, z);
    return this.batcher.add(mesh);
  }
}
