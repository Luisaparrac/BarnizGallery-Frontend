import { MeshBuilder, type Material, type Mesh, type TransformNode } from "@babylonjs/core";
import type { MeshBatcher } from "./MeshBatcher";
import { MeshFactory } from "./MeshFactory";
import type { HallFrame } from "./PlazaHall";
import type { SceneContext } from "./SceneContext";

/**
 * The bare room of a plaza hall (Builder): wooden floor, beamed ceiling, plaster walls around the
 * doorway, a painted wainscot with a rail and the ceiling lamps. Every part goes to the hall's
 * batcher, so the whole room merges into a few meshes.
 */
export class HallRoomShell {
  constructor(
    private readonly ctx: SceneContext,
    private readonly root: TransformNode,
    private readonly batcher: MeshBatcher,
  ) {}

  build(frame: HallFrame, ceiling: number, wainscot: Material, lamps: readonly (readonly [number, number])[]): void {
    const m = this.ctx.materials;
    const { innerHalfWidth: hw, innerFrontZ: fz, innerBackZ: bz, doorHalfWidth: dw, doorHeight: dh } = frame;
    const width = hw * 2;
    const depth = bz - fz;
    const midZ = (fz + bz) / 2;
    const H = ceiling;
    const skin = 0.02;

    this.part("floor", width, 0.04, depth, 0, 0.02, midZ, m.woodWarm, 2);
    this.part("ceiling", width, 0.05, depth, 0, H + 0.025, midZ, m.cream, 0);
    for (let x = -hw + 1.2; x < hw - 0.5; x += 2.2) this.part("beam", 0.2, 0.24, depth, x, H - 0.12, midZ, m.woodDark, 2);

    this.part("wallLeft", skin, H, depth, -hw + skin / 2, H / 2, midZ, m.gallery, 3);
    this.part("wallRight", skin, H, depth, hw - skin / 2, H / 2, midZ, m.gallery, 3);
    this.part("wallBack", width, H, skin, 0, H / 2, bz - skin / 2, m.gallery, 3);
    const sideWidth = hw - dw;
    for (const side of [-1, 1]) this.part("wallFront", sideWidth, H, skin, side * (dw + sideWidth / 2), H / 2, fz + skin / 2, m.gallery, 3);
    this.part("wallOverDoor", dw * 2, H - dh, skin, 0, dh + (H - dh) / 2, fz + skin / 2, m.gallery, 3);

    const wain = 1.0;
    this.part("wainLeft", 0.05, wain, depth, -hw + 0.045, wain / 2, midZ, wainscot);
    this.part("wainRight", 0.05, wain, depth, hw - 0.045, wain / 2, midZ, wainscot);
    this.part("wainBack", width, wain, 0.05, 0, wain / 2, bz - 0.045, wainscot);
    for (const side of [-1, 1]) this.part("wainFront", sideWidth, wain, 0.05, side * (dw + sideWidth / 2), wain / 2, fz + 0.045, wainscot);
    this.part("railBack", width, 0.06, 0.08, 0, wain + 0.03, bz - 0.06, m.woodDark);
    this.part("railLeft", 0.08, 0.06, depth, -hw + 0.06, wain + 0.03, midZ, m.woodDark);
    this.part("railRight", 0.08, 0.06, depth, hw - 0.06, wain + 0.03, midZ, m.woodDark);

    for (const [x, z] of lamps) {
      const lamp = MeshBuilder.CreateCylinder("hall-lamp", { diameter: 0.46, height: 0.08, tessellation: 20 }, this.ctx.scene);
      lamp.material = m.glowLamp;
      lamp.parent = this.root;
      lamp.position.set(x, H - 0.04, z);
      this.batcher.add(lamp);
    }
  }

  private part(name: string, w: number, h: number, d: number, x: number, y: number, z: number, material: Material, tile = 1): Mesh {
    const mesh = MeshFactory.box(this.ctx.scene, `hall-${name}`, w, h, d, material, tile);
    mesh.parent = this.root;
    mesh.position.set(x, y, z);
    return this.batcher.add(mesh);
  }
}
