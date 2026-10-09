import { MeshBuilder, TransformNode, Vector3, type Mesh, type PBRMaterial } from "@babylonjs/core";
import type { RoomDefinition } from "../data/RoomDefinition";
import { GableRoof } from "./GableRoof";
import { MeshFactory } from "./MeshFactory";
import { SceneComponent } from "./SceneComponent";
import type { SceneContext } from "./SceneContext";

/**
 * A colonial house dedicated to one master: stone surround door, wrought-iron windows, a wooden balcony
 * with the room's name banner, shutters and a tiled gable roof. The door stays closed until interiors exist.
 */
export class SalaBuilding extends SceneComponent {
  private static readonly WIDTH = 16;
  private static readonly DEPTH = 12;
  private static readonly WALL_HEIGHT = 7.8;
  private static readonly THICKNESS = 0.5;
  private static readonly DOOR_WIDTH = 3.2;
  private static readonly DOOR_HEIGHT = 3.5;

  readonly root: TransformNode;
  private doorPointWorld = Vector3.Zero();
  private recommended = false;
  private beam: Mesh | null = null;
  private ring: Mesh | null = null;

  constructor(
    ctx: SceneContext,
    readonly definition: RoomDefinition,
    private readonly accent: PBRMaterial,
  ) {
    super(ctx);
    this.root = new TransformNode(`sala-${definition.key}`, ctx.scene);
    this.root.position.set(definition.x, 0, definition.z);
    this.root.rotation.y = definition.facing;
  }

  /** World position in front of the door where the visitor can interact. */
  get doorPoint(): Vector3 {
    return this.doorPointWorld;
  }

  get isRecommended(): boolean {
    return this.recommended;
  }

  setRecommended(on: boolean): void {
    this.recommended = on;
    this.beam?.setEnabled(on);
    this.ring?.setEnabled(on);
  }

  build(): void {
    this.root.computeWorldMatrix(true);
    this.buildShell();
    this.buildFacade();
    this.buildBalcony();
    this.buildRoof();
    this.buildRecommendationMarker();
    this.flushDetails(`sala-${this.definition.key}`);
    this.doorPointWorld = Vector3.TransformCoordinates(new Vector3(0, 0, -SalaBuilding.DEPTH / 2 - 2.6), this.root.getWorldMatrix());
  }

  update(_deltaSeconds: number, timeSeconds: number): void {
    if (!this.recommended) return;
    this.materials.translucentGlow.alpha = 0.16 + Math.sin(timeSeconds * 2.2) * 0.05;
    this.ring?.scaling.setAll(1 + Math.sin(timeSeconds * 2.2) * 0.06);
  }

  // ---------------------------------------------------------------- construction helpers

  /** Places a visual-only box (merged later) relative to the building. */
  private part(name: string, w: number, h: number, d: number, x: number, y: number, z: number, material = this.materials.limestone, tile = 1.5): Mesh {
    const mesh = MeshFactory.box(this.scene, `${this.definition.key}-${name}`, w, h, d, material, tile);
    mesh.parent = this.root;
    mesh.position.set(x, y, z);
    return this.detail(mesh);
  }

  private wall(name: string, w: number, h: number, d: number, x: number, y: number, z: number): void {
    const mesh = MeshFactory.box(this.scene, `${this.definition.key}-${name}`, w, h, d, this.materials.plaster, 4);
    mesh.parent = this.root;
    mesh.position.set(x, y, z);
    this.solid(mesh);
  }

  private get frontZ(): number {
    return -SalaBuilding.DEPTH / 2;
  }

  // ---------------------------------------------------------------- structure

  private buildShell(): void {
    const { WIDTH: W, DEPTH: D, WALL_HEIGHT: H, THICKNESS: T } = SalaBuilding;
    this.wall("facade", W, H, T, 0, H / 2, this.frontZ + T / 2);
    this.wall("wallLeft", T, H, D, -W / 2 + T / 2, H / 2, 0);
    this.wall("wallRight", T, H, D, W / 2 - T / 2, H / 2, 0);
    this.wall("wallBack", W, H, T, 0, H / 2, D / 2 - T / 2);
  }

  private buildFacade(): void {
    const { WIDTH: W, WALL_HEIGHT: H, DOOR_WIDTH: DW, DOOR_HEIGHT: DH } = SalaBuilding;
    const fz = this.frontZ;
    const m = this.materials;

    // Plinth, painted band, corner pilasters and cornice.
    this.part("plinth", W + 0.5, 0.6, 0.3, 0, 0.3, fz - 0.1);
    this.part("band", W, 0.9, 0.06, 0, 1.05, fz - 0.03, this.accent, 0);
    for (const side of [-1, 1]) {
      this.part("pilaster", 0.7, H, 0.7, side * (W / 2 - 0.15), H / 2, fz - 0.08);
      this.part("pilasterBase", 0.9, 0.5, 0.9, side * (W / 2 - 0.15), 0.25, fz - 0.1);
    }
    this.part("cornice", W + 0.3, 0.4, 0.55, 0, H - 0.2, fz - 0.15);
    this.part("corniceLip", W + 0.5, 0.12, 0.8, 0, H - 0.4, fz - 0.28);

    // Door: stone surround, two panelled leaves, studs and brass handles.
    for (const side of [-1, 1]) {
      this.part("doorJamb", 0.44, DH + 0.2, 0.36, side * (DW / 2 + 0.22), (DH + 0.2) / 2, fz - 0.12);
      this.part("doorLeaf", DW / 2 - 0.04, DH - 0.04, 0.08, side * (DW / 4), DH / 2, fz - 0.03, m.woodDark, 2);
      this.part("panelUpper", 1.0, 1.4, 0.05, side * (DW / 4), 2.4, fz - 0.09, m.woodWarm, 2);
      this.part("panelLower", 1.0, 1.0, 0.05, side * (DW / 4), 0.95, fz - 0.09, m.woodWarm, 2);
      const handle = MeshBuilder.CreateSphere(`${this.definition.key}-handle`, { diameter: 0.14, segments: 10 }, this.scene);
      handle.material = m.brass;
      handle.parent = this.root;
      handle.position.set(side * 0.2, 1.65, fz - 0.14);
      this.detail(handle);
    }
    this.part("doorLintel", DW + 1.0, 0.5, 0.42, 0, DH + 0.28, fz - 0.14);
    this.part("keystone", 0.5, 0.7, 0.46, 0, DH + 0.35, fz - 0.16);
    this.part("doorPediment", DW + 1.7, 0.13, 0.7, 0, DH + 0.6, fz - 0.3);
    this.part("stepLow", 5.6, 0.16, 1.7, 0, 0.08, fz - 0.95);
    this.part("stepHigh", 4.4, 0.16, 1.0, 0, 0.24, fz - 0.55);

    // Wall lanterns next to the door.
    for (const side of [-1, 1]) {
      const x = side * 2.7;
      this.part("lampArm", 0.07, 0.07, 0.4, x, 3.0, fz - 0.2, m.iron, 0);
      const glass = MeshBuilder.CreateBox(`${this.definition.key}-lantern`, { width: 0.26, height: 0.42, depth: 0.26 }, this.scene);
      glass.material = m.glowLamp;
      glass.parent = this.root;
      glass.position.set(x, 2.9, fz - 0.42);
      this.detail(glass);
      this.part("lampCap", 0.34, 0.08, 0.34, x, 3.15, fz - 0.42, m.iron, 0);
    }

    // Ground-floor windows with wrought-iron grilles.
    for (const side of [-1, 1]) this.groundWindow(side * 5.2, 2.45);
    // Upper-floor windows with open shutters.
    for (const x of [-4.6, 0, 4.6]) this.upperWindow(x, 6.4);
  }

  private groundWindow(x: number, centerY: number): void {
    const fz = this.frontZ;
    const m = this.materials;
    const w = 1.7;
    const h = 2.0;
    const pane = MeshBuilder.CreatePlane(`${this.definition.key}-pane`, { width: w, height: h }, this.scene);
    pane.material = m.glowWarm;
    pane.parent = this.root;
    pane.position.set(x, centerY, fz - 0.02);
    this.detail(pane);
    this.part("winSill", w + 0.7, 0.16, 0.5, x, centerY - h / 2 - 0.1, fz - 0.2);
    this.part("winHead", w + 0.6, 0.3, 0.3, x, centerY + h / 2 + 0.15, fz - 0.12);
    for (const side of [-1, 1]) this.part("winJamb", 0.24, h, 0.26, x + side * (w / 2 + 0.06), centerY, fz - 0.1);
    this.part("mullionV", 0.06, h, 0.08, x, centerY, fz - 0.06, m.woodDark, 0);
    this.part("mullionH", w, 0.06, 0.08, x, centerY + 0.15, fz - 0.06, m.woodDark, 0);
    for (let i = -3; i <= 3; i++) this.part("grille", 0.03, h, 0.03, x + i * 0.24, centerY, fz - 0.16, m.iron, 0);
    this.part("grilleRail", w, 0.04, 0.04, x, centerY + 0.3, fz - 0.16, m.iron, 0);
    this.part("grilleRail", w, 0.04, 0.04, x, centerY - 0.5, fz - 0.16, m.iron, 0);
  }

  private upperWindow(x: number, centerY: number): void {
    const fz = this.frontZ;
    const m = this.materials;
    const w = 1.5;
    const h = 2.1;
    const pane = MeshBuilder.CreatePlane(`${this.definition.key}-upperPane`, { width: w, height: h }, this.scene);
    pane.material = m.glowWarm;
    pane.parent = this.root;
    pane.position.set(x, centerY, fz - 0.02);
    this.detail(pane);
    this.part("upperFrameTop", w + 0.3, 0.14, 0.14, x, centerY + h / 2 + 0.07, fz - 0.08, m.woodDark, 0);
    for (const side of [-1, 1]) this.part("upperFrameSide", 0.12, h, 0.14, x + side * (w / 2 + 0.03), centerY, fz - 0.08, m.woodDark, 0);
    this.part("upperMullion", 0.05, h, 0.08, x, centerY, fz - 0.06, m.woodDark, 0);
    this.part("upperTransom", w, 0.05, 0.08, x, centerY + 0.5, fz - 0.06, m.woodDark, 0);

    // Shutters swung open (hinged at the frame, pointing away from the wall).
    const angle = 1.0;
    for (const side of [-1, 1]) {
      const hinge = new Vector3(x + side * (w / 2 + 0.08), centerY, fz - 0.12);
      const length = 0.74;
      const shutter = MeshFactory.box(this.scene, `${this.definition.key}-shutter`, length, h, 0.05, this.accent, 0);
      shutter.parent = this.root;
      shutter.position.set(hinge.x + side * Math.cos(angle) * (length / 2), centerY, hinge.z - Math.sin(angle) * (length / 2));
      shutter.rotation.y = side * angle;
      this.detail(shutter);
      for (let slat = 0; slat < 6; slat++) {
        const louver = MeshFactory.box(this.scene, `${this.definition.key}-louver`, length - 0.12, 0.04, 0.07, this.accent, 0);
        louver.parent = this.root;
        louver.position.set(shutter.position.x, centerY - h / 2 + 0.25 + slat * 0.34, shutter.position.z);
        louver.rotation.y = side * angle;
        this.detail(louver);
      }
    }
  }

  // ---------------------------------------------------------------- balcony

  private buildBalcony(): void {
    const fz = this.frontZ;
    const m = this.materials;
    const projection = 1.45;
    const width = 15.2;
    const frontZ = fz - projection;

    this.part("balconySlab", width, 0.22, projection, 0, 5.11, fz - projection / 2, m.woodDark, 2);
    this.part("balconyBoard", 14.9, 0.64, 0.1, 0, 4.7, frontZ - 0.01, m.woodDark, 2);
    for (let x = -6.6; x <= 6.7; x += 2.2) this.part("corbel", 0.26, 0.6, 0.7, x, 4.78, fz - 0.4, m.woodDark, 2);

    // Name banner on the hanging board (a plane, so the lettering reads correctly from the plaza).
    const { master, label } = this.definition;
    const banner = MeshBuilder.CreatePlane(`${this.definition.key}-banner`, { width: 14.4, height: 0.56 }, this.scene);
    banner.material = m.signBoard([`SALA ${label.toUpperCase()}  ·  ${master}`], 3072, 128);
    banner.parent = this.root;
    banner.position.set(0, 4.7, frontZ - 0.07);
    banner.isPickable = false;

    // Railing: handrail, bottom rail, posts and wrought-iron balusters.
    this.part("handrail", width, 0.09, 0.14, 0, 6.2, frontZ + 0.1, m.woodDark, 2);
    this.part("bottomRail", width - 0.2, 0.07, 0.08, 0, 5.3, frontZ + 0.1, m.woodDark, 2);
    for (let x = -7.5; x <= 7.55; x += 1.0) this.part("railPost", 0.13, 1.0, 0.13, x, 5.72, frontZ + 0.1, m.woodDark, 2);
    for (let x = -7.4; x <= 7.45; x += 0.2) this.part("baluster", 0.035, 0.84, 0.035, x, 5.75, frontZ + 0.1, m.iron, 0);
    for (const side of [-1, 1]) {
      this.part("railSide", 0.13, 1.0, projection, side * 7.55, 5.72, fz - projection / 2, m.woodDark, 2);
      this.part("handrailSide", 0.14, 0.09, projection, side * 7.55, 6.2, fz - projection / 2, m.woodDark, 2);
    }
  }

  // ---------------------------------------------------------------- roof

  private buildRoof(): void {
    const { WIDTH: W, DEPTH: D, WALL_HEIGHT: H } = SalaBuilding;
    const m = this.materials;
    const roof = new GableRoof({ width: W, depth: D, eaveHeight: H, pitch: 0.44, frontOverhang: 0.95, sideOverhang: 0.55, tileMeters: 2.4 });
    m.roofTile.backFaceCulling = false;
    m.roofTile.twoSidedLighting = true;

    const slopes = roof.createSlopes(this.scene, m.roofTile);
    slopes.parent = this.root;
    this.detail(slopes);
    const ends = roof.createGableEnds(this.scene, m.plaster);
    ends.parent = this.root;
    this.detail(ends);

    const { halfWidth: hw, halfDepth: hd } = roof;
    // Eave fascia and rafter tails on both long sides.
    for (const side of [-1, 1]) {
      this.part("fascia", hw * 2, 0.22, 0.08, 0, roof.eaveEdgeHeight - 0.06, side * hd, m.woodDark, 2);
      for (let x = -hw + 0.4; x <= hw - 0.3; x += 0.7) {
        this.part("rafterTail", 0.1, 0.13, 0.7, x, roof.heightAt(hd - 0.45) - 0.14, side * (hd - 0.4), m.woodDark, 0);
      }
    }

    // Ridge cap.
    const ridge = MeshBuilder.CreateCylinder(`${this.definition.key}-ridge`, { diameter: 0.36, height: hw * 2 + 0.2, tessellation: 14 }, this.scene);
    ridge.material = m.roofTile;
    ridge.rotation.z = Math.PI / 2;
    ridge.parent = this.root;
    ridge.position.set(0, roof.ridgeHeight + 0.04, 0);
    this.detail(ridge);

    // Chimney.
    const chimneyY = roof.heightAt(2.6);
    this.part("chimney", 1.0, 2.8, 1.0, -4.5, chimneyY + 0.9, 2.6, m.limestone, 1.5);
    this.part("chimneyCap", 1.3, 0.2, 1.3, -4.5, chimneyY + 2.4, 2.6, m.limestone, 1.5);
  }

  // ---------------------------------------------------------------- recommendation marker

  /** A soft golden column and ring in front of the door, shown when the kiosk recommends this room. */
  private buildRecommendationMarker(): void {
    const fz = this.frontZ;
    const beam = MeshBuilder.CreateCylinder(`${this.definition.key}-beam`, { diameter: 3.4, height: 9, tessellation: 28, cap: 0 }, this.scene);
    beam.material = this.materials.translucentGlow;
    beam.parent = this.root;
    beam.position.set(0, 4.5, fz - 3.2);
    beam.isPickable = false;
    beam.setEnabled(false);
    this.beam = beam;

    const ring = MeshBuilder.CreateTorus(`${this.definition.key}-ring`, { diameter: 3.4, thickness: 0.12, tessellation: 40 }, this.scene);
    ring.material = this.materials.glowWarm;
    ring.parent = this.root;
    ring.position.set(0, 0.12, fz - 3.2);
    ring.isPickable = false;
    ring.setEnabled(false);
    this.ring = ring;
  }
}
