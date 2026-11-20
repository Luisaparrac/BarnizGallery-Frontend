import { MeshBuilder, TransformNode, Vector3, type Mesh, type PBRMaterial } from "@babylonjs/core";
import { CommissionHallInterior } from "./CommissionHallInterior";
import { GableRoof } from "./GableRoof";
import { MeshFactory } from "./MeshFactory";
import { SceneComponent } from "./SceneComponent";
import type { SceneContext } from "./SceneContext";
import { Stall } from "./Stall";
import type { HallBoard, HallDesign, HallTexts } from "./WorldTypes";

/**
 * "Sala de encargos": the workshop where visitors commission a one-of-a-kind piece. It shares the
 * salas' construction (plaster walls, stone trim, tiled gable roof, open double door) but reads as a
 * workshop: one storey, wide workshop windows, a green awning over the door and a big hanging sign.
 * Inside are the front desk, the wall of AI designs, the offers board and a workbench.
 * Its door is the local -Z side.
 */
export class CommissionHall extends SceneComponent {
  private static readonly WIDTH = 14;
  private static readonly DEPTH = 11;
  private static readonly WALL_HEIGHT = 6.2;
  private static readonly THICKNESS = 0.5;
  private static readonly DOOR_WIDTH = 3.4;
  private static readonly DOOR_HEIGHT = 3.5;

  private readonly root: TransformNode;
  private interiorPart: CommissionHallInterior | null = null;

  constructor(
    ctx: SceneContext,
    position: Vector3,
    target: Vector3,
    private readonly texts: HallTexts,
  ) {
    super(ctx);
    this.root = new TransformNode("commissionHall", ctx.scene);
    this.root.position.copyFrom(position);
    this.root.rotation.y = Stall.facingTowards(position, target);
  }

  private get interior(): CommissionHallInterior {
    if (!this.interiorPart) throw new Error("CommissionHall.build() must run first");
    return this.interiorPart;
  }

  /** In front of the open door, outside. */
  get doorPoint(): Vector3 {
    return this.toWorld(new Vector3(0, 0, this.frontZ - 2.4));
  }

  get counterPoint(): Vector3 {
    return this.toWorld(this.interior.counterPoint);
  }

  get boardPoint(): Vector3 {
    return this.toWorld(this.interior.boardPoint);
  }

  get framePoints(): Vector3[] {
    return this.interior.framePoints.map((point) => this.toWorld(point));
  }

  build(): void {
    this.root.computeWorldMatrix(true);
    this.buildShell();
    this.buildFacade();
    this.buildRoof();
    this.flushDetails("commissionHall");
    const { WIDTH: W, DEPTH: D, THICKNESS: T, DOOR_WIDTH: DW, DOOR_HEIGHT: DH } = CommissionHall;
    this.interiorPart = new CommissionHallInterior(
      this.ctx,
      this.root,
      { innerHalfWidth: W / 2 - T, innerFrontZ: this.frontZ + T, innerBackZ: D / 2 - T, doorHalfWidth: DW / 2, doorHeight: DH },
      this.texts.inside,
    );
    this.interiorPart.build();
  }

  setDesigns(designs: readonly HallDesign[], emptyLabel: string): void {
    this.interior.setDesigns(designs, emptyLabel);
  }

  setBoard(board: HallBoard): void {
    this.interior.setBoard(board);
  }

  // ---------------------------------------------------------------- structure

  private get frontZ(): number {
    return -CommissionHall.DEPTH / 2;
  }

  private buildShell(): void {
    const { WIDTH: W, DEPTH: D, WALL_HEIGHT: H, THICKNESS: T, DOOR_WIDTH: DW, DOOR_HEIGHT: DH } = CommissionHall;
    const sideWidth = (W - DW) / 2;
    for (const side of [-1, 1]) this.wall(sideWidth, H, T, side * (DW / 2 + sideWidth / 2), H / 2, this.frontZ + T / 2);
    this.wall(DW, H - DH, T, 0, DH + (H - DH) / 2, this.frontZ + T / 2);
    this.wall(T, H, D, -W / 2 + T / 2, H / 2, 0);
    this.wall(T, H, D, W / 2 - T / 2, H / 2, 0);
    this.wall(W, H, T, 0, H / 2, D / 2 - T / 2);
  }

  private buildFacade(): void {
    const { WIDTH: W, WALL_HEIGHT: H, DOOR_WIDTH: DW, DOOR_HEIGHT: DH } = CommissionHall;
    const fz = this.frontZ;
    const m = this.materials;
    const green = m.paintGreen;

    // Stone plinth, a green painted band, corner pilasters and a cornice.
    this.part("plinth", W + 0.5, 0.6, 0.3, 0, 0.3, fz - 0.1);
    this.part("band", W, 0.9, 0.06, 0, 1.05, fz - 0.03, green, 0);
    for (const side of [-1, 1]) {
      this.part("pilaster", 0.7, H, 0.7, side * (W / 2 - 0.15), H / 2, fz - 0.08);
      this.part("pilasterBase", 0.9, 0.5, 0.9, side * (W / 2 - 0.15), 0.25, fz - 0.1);
    }
    this.part("cornice", W + 0.3, 0.4, 0.55, 0, H - 0.2, fz - 0.15);

    // Open double door: wooden surround and two leaves swung into the hall.
    for (const side of [-1, 1]) {
      this.part("doorPost", 0.36, DH + 0.2, 0.4, side * (DW / 2 + 0.18), (DH + 0.2) / 2, fz - 0.12, m.woodDark, 2);
      const leafWidth = DW / 2 - 0.04;
      const leafZ = fz + CommissionHall.THICKNESS + leafWidth / 2 + 0.02;
      this.part("doorLeaf", leafWidth, DH - 0.04, 0.08, side * (DW / 2 - 0.08), DH / 2, leafZ, m.woodWarm, 2).rotation.y = Math.PI / 2;
      this.part("doorStripe", leafWidth - 0.2, 0.12, 0.09, side * (DW / 2 - 0.08), DH * 0.62, leafZ, green, 0).rotation.y = Math.PI / 2;
    }
    this.part("doorBeam", DW + 0.9, 0.36, 0.44, 0, DH + 0.2, fz - 0.14, m.woodDark, 2);
    this.part("stepLow", 5.8, 0.16, 1.7, 0, 0.08, fz - 0.95);
    this.part("stepHigh", 4.6, 0.16, 1.0, 0, 0.24, fz - 0.55);

    // Green awning over the door on two wooden brackets.
    const awning = MeshBuilder.CreateBox("hall-awning", { width: DW + 2.4, height: 0.08, depth: 1.6 }, this.scene);
    awning.material = m.awningGreen;
    this.place(awning, 0, DH + 0.95, fz - 0.78).rotation.x = -0.28;
    this.detail(awning);
    for (let i = 0; i < 18; i++) {
      const flap = MeshBuilder.CreateCylinder("hall-valance", { diameter: 0.33, height: 0.06, tessellation: 12 }, this.scene);
      flap.material = i % 2 ? m.cream : green;
      this.place(flap, -(DW + 2.2) / 2 + i * ((DW + 2.2) / 17), DH + 0.62, fz - 1.55).rotation.x = Math.PI / 2;
      this.detail(flap);
    }
    for (const side of [-1, 1]) this.part("awningBracket", 0.12, 0.12, 1.5, side * (DW / 2 + 1.0), DH + 0.82, fz - 0.75, m.woodDark, 0).rotation.x = -0.28;

    // Big hanging sign over the awning.
    const sign = MeshBuilder.CreatePlane("hall-facadeSign", { width: 8.4, height: 1.3 }, this.scene);
    sign.material = m.signBoard(this.texts.facade, 1536, 238);
    this.place(sign, 0, DH + 1.95, fz - 0.2);
    sign.isPickable = false;
    this.part("signBoard", 8.7, 1.5, 0.12, 0, DH + 1.95, fz - 0.12, m.woodDark, 2);

    // Wide workshop windows with wooden frames on both sides of the door.
    for (const side of [-1, 1]) this.workshopWindow(side * 4.4, 2.3);

    // Wall lanterns.
    for (const side of [-1, 1]) {
      const x = side * (DW / 2 + 0.75);
      this.part("lampArm", 0.07, 0.07, 0.4, x, 3.0, fz - 0.2, m.iron, 0);
      const glass = MeshBuilder.CreateBox("hall-lantern", { width: 0.26, height: 0.42, depth: 0.26 }, this.scene);
      glass.material = m.glowLamp;
      this.place(glass, x, 2.9, fz - 0.42);
      this.detail(glass);
      this.part("lampCap", 0.34, 0.08, 0.34, x, 3.15, fz - 0.42, m.iron, 0);
    }
  }

  private workshopWindow(x: number, centerY: number): void {
    const fz = this.frontZ;
    const m = this.materials;
    const w = 3.0;
    const h = 2.1;
    const pane = MeshBuilder.CreatePlane("hall-pane", { width: w, height: h }, this.scene);
    pane.material = m.glowWarm;
    this.place(pane, x, centerY, fz - 0.02);
    this.detail(pane);
    this.part("winSill", w + 0.5, 0.14, 0.45, x, centerY - h / 2 - 0.08, fz - 0.18);
    this.part("winHead", w + 0.4, 0.22, 0.22, x, centerY + h / 2 + 0.11, fz - 0.1, m.woodDark, 0);
    for (const side of [-1, 1]) this.part("winJamb", 0.16, h, 0.2, x + side * (w / 2 + 0.06), centerY, fz - 0.08, m.woodDark, 0);
    for (const offset of [-0.75, 0, 0.75]) this.part("mullion", 0.06, h, 0.08, x + offset, centerY, fz - 0.06, m.woodDark, 0);
    this.part("transom", w, 0.06, 0.08, x, centerY + 0.4, fz - 0.06, m.woodDark, 0);
    // A flower box under each window.
    this.part("flowerBox", w - 0.2, 0.3, 0.36, x, centerY - h / 2 - 0.32, fz - 0.3, m.woodWarm, 2);
    this.part("flowers", w - 0.3, 0.16, 0.26, x, centerY - h / 2 - 0.12, fz - 0.3, m.flowerBed, 1);
  }

  private buildRoof(): void {
    const { WIDTH: W, DEPTH: D, WALL_HEIGHT: H } = CommissionHall;
    const m = this.materials;
    const roof = new GableRoof({ width: W, depth: D, eaveHeight: H, pitch: 0.42, frontOverhang: 0.9, sideOverhang: 0.5, tileMeters: 2.4 });
    m.roofTile.backFaceCulling = false;
    m.roofTile.twoSidedLighting = true;
    const slopes = roof.createSlopes(this.scene, m.roofTile);
    slopes.parent = this.root;
    this.detail(slopes);
    const ends = roof.createGableEnds(this.scene, m.plaster);
    ends.parent = this.root;
    this.detail(ends);
    const { halfWidth: hw, halfDepth: hd } = roof;
    for (const side of [-1, 1]) this.part("fascia", hw * 2, 0.22, 0.08, 0, roof.eaveEdgeHeight - 0.06, side * hd, m.woodDark, 2);
    const ridge = MeshBuilder.CreateCylinder("hall-ridge", { diameter: 0.36, height: hw * 2 + 0.2, tessellation: 14 }, this.scene);
    ridge.material = m.roofTile;
    ridge.rotation.z = Math.PI / 2;
    this.place(ridge, 0, roof.ridgeHeight + 0.04, 0);
    this.detail(ridge);
    // A workshop chimney for the varnish stove.
    const chimneyY = roof.heightAt(2.2);
    this.part("chimney", 0.9, 2.4, 0.9, 4.2, chimneyY + 0.8, 2.2, m.limestone, 1.5);
    this.part("chimneyCap", 1.2, 0.2, 1.2, 4.2, chimneyY + 2.1, 2.2, m.limestone, 1.5);
  }

  // ---------------------------------------------------------------- helpers

  private toWorld(local: Vector3): Vector3 {
    this.root.computeWorldMatrix(true);
    return Vector3.TransformCoordinates(local, this.root.getWorldMatrix());
  }

  private place(mesh: Mesh, x: number, y: number, z: number): Mesh {
    mesh.parent = this.root;
    mesh.position.set(x, y, z);
    return mesh;
  }

  private part(name: string, w: number, h: number, d: number, x: number, y: number, z: number, material: PBRMaterial = this.materials.limestone, tile = 1.5): Mesh {
    return this.detail(this.place(MeshFactory.box(this.scene, `hall-${name}`, w, h, d, material, tile), x, y, z));
  }

  private wall(w: number, h: number, d: number, x: number, y: number, z: number): void {
    this.solid(this.place(MeshFactory.box(this.scene, "hall-wall", w, h, d, this.materials.plaster, 4), x, y, z));
  }
}
