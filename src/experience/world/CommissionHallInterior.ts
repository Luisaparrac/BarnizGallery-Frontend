import {
  Color3,
  DynamicTexture,
  MeshBuilder,
  StandardMaterial,
  Vector3,
  type Material,
  type Mesh,
  type TransformNode,
} from "@babylonjs/core";
import { MeshBatcher } from "./MeshBatcher";
import { MeshFactory } from "./MeshFactory";
import { PhotoTexture } from "./PhotoTexture";
import type { HallFrame } from "./PlazaHall";
import type { SceneContext } from "./SceneContext";
import type { HallBoard, HallDesign } from "./WorldTypes";

/** Stored on the clickable meshes of the hall, so a click can tell what was picked. */
export interface HallMetadata {
  hallFrame?: number;
  hallBoard?: true;
}

interface DesignSlot {
  mesh: Mesh;
  texture: PhotoTexture;
  label: DynamicTexture;
  /** Where the visitor stands to look at it (local). */
  view: Vector3;
}

/**
 * Inside of the commissions hall: the front desk at the back, the wall of AI designs on the left,
 * the offers chalkboard and the workbench on the right, and the sign. Static parts are merged per
 * material; the design photos are drawn with their true colours by the PhotoPass.
 */
export class CommissionHallInterior {
  static readonly CEILING = 4.4;
  /** Frames on the design wall. */
  static readonly FRAMES = 4;
  private static readonly FRAME_SIZE = 1.3;
  private static readonly DETAIL_DISTANCE = 26;

  private readonly batcher = new MeshBatcher();
  private readonly slots: DesignSlot[] = [];
  /** Varnish colours, shared so the merge makes one mesh per colour. */
  private readonly paints = new Map<string, Material>();
  private boardTexture: DynamicTexture | null = null;

  constructor(
    private readonly ctx: SceneContext,
    private readonly root: TransformNode,
    private readonly frame: HallFrame,
    private readonly insideSign: string,
  ) {}

  /** Where the visitor stands at the front desk (local, on the floor). */
  get counterPoint(): Vector3 {
    return new Vector3(0, 0, this.frame.innerBackZ - 3.6);
  }

  /** Where the visitor stands to read the offers board (local). */
  get boardPoint(): Vector3 {
    return new Vector3(this.frame.innerHalfWidth - 1.9, 0, this.boardZ);
  }

  /** Where the visitor stands in front of each frame of the design wall (local). */
  get framePoints(): Vector3[] {
    return this.slots.map((slot) => slot.view.clone());
  }

  private get boardZ(): number {
    return this.frame.innerFrontZ + 2.6;
  }

  build(): void {
    this.buildRoom();
    this.buildCounter();
    this.buildDesignWall();
    this.buildBoard();
    this.buildWorkbench();
    this.buildSign();
    this.root.computeWorldMatrix(true);
    const merged = this.batcher.merge("hall-interior");
    for (const mesh of merged) {
      mesh.isPickable = false;
      this.ctx.interior.add(mesh);
    }
    const { innerHalfWidth: hw, innerFrontZ: fz, innerBackZ: bz } = this.frame;
    this.ctx.photos.addRoom({
      world: this.root.getWorldMatrix(),
      min: new Vector3(-hw, 0, fz),
      max: new Vector3(hw, CommissionHallInterior.CEILING, bz),
      photos: this.slots.map((slot) => ({ mesh: slot.mesh, texture: slot.texture })),
      occluders: merged,
    });
  }

  /** Puts the visitor's designs (or the examples) in the frames; empty frames show a plain card. */
  setDesigns(designs: readonly HallDesign[], emptyLabel: string): void {
    this.slots.forEach((slot, index) => {
      const design = designs[index];
      if (design) slot.texture.setUrl(design.imageUrl);
      slot.mesh.setEnabled(!!design);
      CommissionHallInterior.paintLabel(slot.label, design?.label ?? emptyLabel);
    });
  }

  setBoard(board: HallBoard): void {
    const texture = this.boardTexture;
    if (!texture) return;
    const ctx = texture.getContext() as CanvasRenderingContext2D;
    const { width, height } = texture.getSize();
    ctx.fillStyle = "#1f3a2c";
    ctx.fillRect(0, 0, width, height);
    // Faint chalk smudges, so it reads as a used blackboard.
    ctx.fillStyle = "rgba(255,255,255,0.035)";
    for (let i = 0; i < 18; i++) ctx.fillRect((i * 173) % width, (i * 97) % height, 160, 40);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#f4ecd8";
    ctx.font = "700 74px 'Bricolage Grotesque', Figtree, Arial, sans-serif";
    ctx.fillText(CommissionHallInterior.fit(ctx, board.title, width - 80), width / 2, 100);
    ctx.fillRect(width * 0.2, 152, width * 0.6, 4);
    let y = 330;
    if (board.count !== null) {
      ctx.fillStyle = "#f2c230";
      ctx.font = "800 230px 'Bricolage Grotesque', Figtree, Arial, sans-serif";
      ctx.fillText(String(board.count), width / 2, 320);
      y = 520;
    }
    ctx.fillStyle = "#f4ecd8";
    ctx.font = "600 58px Figtree, Arial, sans-serif";
    board.lines.slice(0, 2).forEach((line, index) => ctx.fillText(CommissionHallInterior.fit(ctx, line, width - 80), width / 2, y + index * 96));
    texture.update();
  }

  // ---------------------------------------------------------------- room

  private buildRoom(): void {
    const m = this.ctx.materials;
    const { innerHalfWidth: hw, innerFrontZ: fz, innerBackZ: bz, doorHalfWidth: dw, doorHeight: dh } = this.frame;
    const width = hw * 2;
    const depth = bz - fz;
    const midZ = (fz + bz) / 2;
    const H = CommissionHallInterior.CEILING;
    const skin = 0.02;

    this.part("floor", width, 0.04, depth, 0, 0.02, midZ, m.woodWarm, 2);
    this.part("ceiling", width, 0.05, depth, 0, H + 0.025, midZ, m.cream, 0);
    for (let x = -hw + 1.2; x < hw - 0.5; x += 2.2) this.part("beam", 0.2, 0.24, depth, x, H - 0.12, midZ, m.woodDark, 2);

    // Workshop walls: warm plaster above an ochre wainscot (the salas use a gallery paint).
    this.part("wallLeft", skin, H, depth, -hw + skin / 2, H / 2, midZ, m.gallery, 3);
    this.part("wallRight", skin, H, depth, hw - skin / 2, H / 2, midZ, m.gallery, 3);
    this.part("wallBack", width, H, skin, 0, H / 2, bz - skin / 2, m.gallery, 3);
    const sideWidth = hw - dw;
    for (const side of [-1, 1]) this.part("wallFront", sideWidth, H, skin, side * (dw + sideWidth / 2), H / 2, fz + skin / 2, m.gallery, 3);
    this.part("wallOverDoor", dw * 2, H - dh, skin, 0, dh + (H - dh) / 2, fz + skin / 2, m.gallery, 3);

    const wain = 1.0;
    const ochre = this.paint("#b9852f");
    this.part("wainLeft", 0.05, wain, depth, -hw + 0.045, wain / 2, midZ, ochre);
    this.part("wainRight", 0.05, wain, depth, hw - 0.045, wain / 2, midZ, ochre);
    this.part("wainBack", width, wain, 0.05, 0, wain / 2, bz - 0.045, ochre);
    for (const side of [-1, 1]) this.part("wainFront", sideWidth, wain, 0.05, side * (dw + sideWidth / 2), wain / 2, fz + 0.045, ochre);
    this.part("railBack", width, 0.06, 0.08, 0, wain + 0.03, bz - 0.06, m.woodDark);
    this.part("railLeft", 0.08, 0.06, depth, -hw + 0.06, wain + 0.03, midZ, m.woodDark);
    this.part("railRight", 0.08, 0.06, depth, hw - 0.06, wain + 0.03, midZ, m.woodDark);

    // Ceiling lamps over the desk, the design wall and the workbench.
    for (const [x, z] of [[0, bz - 2.4], [-hw + 2.2, -1.6], [-hw + 2.2, 1.6], [hw - 2.4, fz + 2.6], [hw - 2.4, bz - 2.6]] as const) {
      const lamp = MeshBuilder.CreateCylinder("hall-lamp", { diameter: 0.46, height: 0.08, tessellation: 20 }, this.ctx.scene);
      lamp.material = m.glowLamp;
      this.place(lamp, x, H - 0.04, z);
      this.batcher.add(lamp);
    }
  }

  // ---------------------------------------------------------------- front desk

  private buildCounter(): void {
    const m = this.ctx.materials;
    const z = this.frame.innerBackZ - 2.1;
    const red = this.paint("#7e2419");
    const green = this.paint("#2f5d3a");
    this.part("deskBody", 4.2, 1.02, 0.85, 0, 0.51, z, m.woodWarm, 2);
    this.part("deskTop", 4.5, 0.08, 1.05, 0, 1.06, z, m.woodDark, 2);
    // Painted front panels, like a barniz chest.
    for (const [i, x] of [-1.4, 0, 1.4].entries()) {
      this.part("deskPanel", 1.15, 0.62, 0.04, x, 0.55, z - 0.44, i === 1 ? green : red);
      this.part("deskPanelBand", 1.15, 0.06, 0.05, x, 0.78, z - 0.45, m.brass);
    }
    // Order book, a bell and a small stack of sketches.
    this.part("orderBook", 0.5, 0.06, 0.36, -0.9, 1.13, z - 0.1, red);
    this.part("orderPage", 0.46, 0.012, 0.32, -0.9, 1.165, z - 0.1, m.cream);
    const bell = MeshBuilder.CreateSphere("hall-bell", { diameter: 0.16, segments: 10, slice: 0.5 }, this.ctx.scene);
    bell.material = m.brass;
    this.place(bell, 0.8, 1.1, z - 0.2);
    this.batcher.add(bell);
    this.part("sketchStack", 0.42, 0.04, 0.3, 1.4, 1.12, z, m.cream);
    this.collider(new Vector3(0, 0.55, z), 4.5, 1.1, 1.1);

    // Shelves behind the desk with finished commissions waiting to be collected.
    const bz = this.frame.innerBackZ;
    for (const y of [1.45, 2.15]) this.part("shelf", 4.4, 0.06, 0.42, 0, y, bz - 0.24, m.woodDark, 2);
    const colors = [red, green, this.paint("#c8922f"), this.paint("#1f4e9c")];
    [-1.7, -0.6, 0.5, 1.6].forEach((x, i) => {
      this.part("parcel", 0.5, 0.3, 0.3, x, 1.63, bz - 0.26, m.kraft, 0);
      this.part("parcelTie", 0.52, 0.04, 0.31, x, 1.63, bz - 0.26, colors[i]);
      const bowl = MeshBuilder.CreateSphere("hall-bowl", { diameter: 0.32, segments: 12, slice: 0.5 }, this.ctx.scene);
      bowl.material = colors[(i + 1) % colors.length];
      this.place(bowl, x + 0.2, 2.18, bz - 0.26).rotation.x = Math.PI;
      this.batcher.add(bowl);
    });
  }

  // ---------------------------------------------------------------- design wall

  private buildDesignWall(): void {
    const m = this.ctx.materials;
    const hw = this.frame.innerHalfWidth;
    const size = CommissionHallInterior.FRAME_SIZE;
    const rim = 0.04;
    const x = -hw + 0.07;
    const y = 2.15;
    const span = 2.35;
    const firstZ = -((CommissionHallInterior.FRAMES - 1) * span) / 2 + 0.4;
    for (let index = 0; index < CommissionHallInterior.FRAMES; index++) {
      const z = firstZ + index * span;
      // Frame around the image, hanging on the left wall and facing +x.
      for (const side of [-1, 1]) {
        this.part("designFrameV", 0.05, size + rim * 2, rim, x, y, z + side * (size / 2 + rim / 2), m.woodDark);
        this.part("designFrameH", 0.05, rim, size, x, y + side * (size / 2 + rim / 2), z, m.woodDark);
      }
      this.part("designBack", 0.02, size + rim * 2, size + rim * 2, x - 0.03, y, z, m.cream, 0);
      this.part("designPin", 0.04, 0.06, 0.06, x + 0.02, y + size / 2 + rim + 0.06, z, m.brass);

      const image = MeshBuilder.CreatePlane(`hall-design-${index}`, { size }, this.ctx.scene);
      this.place(image, x + 0.005, y, z).rotation.y = -Math.PI / 2;
      const texture = new PhotoTexture(this.ctx.scene, `hall-designTex-${index}`, null);
      image.material = this.imageMaterial(`hall-designMat-${index}`, texture);
      this.clickable(image, { hallFrame: index });

      const plaque = MeshBuilder.CreatePlane(`hall-designLabel-${index}`, { width: 1.2, height: 0.26 }, this.ctx.scene);
      this.place(plaque, x + 0.01, y - size / 2 - 0.28, z).rotation.y = -Math.PI / 2;
      const label = new DynamicTexture(`hall-designLabelTex-${index}`, { width: 640, height: 140 }, this.ctx.scene, true);
      plaque.material = CommissionHallInterior.selfLit(`hall-designLabelMat-${index}`, label, this.ctx);
      this.clickable(plaque, { hallFrame: index });

      this.slots.push({ mesh: image, texture, label, view: new Vector3(x + 1.7, 0, z) });
    }
  }

  // ---------------------------------------------------------------- offers board

  private buildBoard(): void {
    const m = this.ctx.materials;
    const x = this.frame.innerHalfWidth - 0.07;
    const z = this.boardZ;
    const y = 2.0;
    const w = 2.4;
    const h = 1.65;
    for (const side of [-1, 1]) {
      this.part("boardFrameV", 0.07, h + 0.16, 0.08, x, y, z + side * (w / 2 + 0.04), m.woodWarm, 2);
      this.part("boardFrameH", 0.07, 0.08, w, x, y + side * (h / 2 + 0.04), z, m.woodWarm, 2);
    }
    this.part("chalkLedge", 0.16, 0.05, w, x - 0.06, y - h / 2 - 0.08, z, m.woodWarm, 2);
    this.part("chalk", 0.03, 0.03, 0.14, x - 0.08, y - h / 2 - 0.04, z - 0.6, m.cream, 0);

    const board = MeshBuilder.CreatePlane("hall-offersBoard", { width: w, height: h }, this.ctx.scene);
    this.place(board, x - 0.01, y, z).rotation.y = Math.PI / 2;
    this.boardTexture = new DynamicTexture("hall-offersBoardTex", { width: 1024, height: 704 }, this.ctx.scene, true);
    board.material = CommissionHallInterior.selfLit("hall-offersBoardMat", this.boardTexture, this.ctx);
    this.clickable(board, { hallBoard: true });
  }

  // ---------------------------------------------------------------- workbench

  /** The master's bench: tools, mopa-mopa resin, brushes and a plate half covered with varnish. */
  private buildWorkbench(): void {
    const m = this.ctx.materials;
    const x = this.frame.innerHalfWidth - 1.0;
    const z = this.frame.innerBackZ - 2.4;
    const top = 0.92;
    const red = this.paint("#7e2419");
    const green = this.paint("#2f5d3a");
    const ochre = this.paint("#c8922f");
    this.part("benchTop", 1.2, 0.08, 2.8, x, top, z, m.woodWarm, 2);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.part("benchLeg", 0.1, top, 0.1, x + sx * 0.5, top / 2, z + sz * 1.3, m.woodDark, 2);
    this.part("benchShelf", 1.1, 0.04, 2.6, x, 0.25, z, m.woodDark, 2);
    this.collider(new Vector3(x, 0.5, z), 1.3, 1.0, 3.0);

    // The plate in progress: bare wood with half its face already varnished in red and gold.
    const plate = MeshBuilder.CreateCylinder("hall-plate", { diameter: 0.62, height: 0.05, tessellation: 36 }, this.ctx.scene);
    plate.material = m.woodWarm;
    this.place(plate, x - 0.05, top + 0.065, z - 0.2);
    this.batcher.add(plate);
    const half = MeshBuilder.CreateCylinder("hall-plateVarnish", { diameter: 0.58, height: 0.012, tessellation: 36, arc: 0.5 }, this.ctx.scene);
    half.material = red;
    this.place(half, x - 0.05, top + 0.096, z - 0.2);
    this.batcher.add(half);
    const goldBand = MeshBuilder.CreateTorus("hall-plateBand", { diameter: 0.44, thickness: 0.018, tessellation: 32 }, this.ctx.scene);
    goldBand.material = m.brass;
    this.place(goldBand, x - 0.05, top + 0.1, z - 0.2);
    this.batcher.add(goldBand);

    // Mopa-mopa resin: balls in three colours and a sheet stretched thin.
    [red, green, ochre].forEach((material, i) => {
      const ball = MeshBuilder.CreateSphere("hall-resin", { diameter: 0.14, segments: 10 }, this.ctx.scene);
      ball.material = material;
      this.place(ball, x + 0.3, top + 0.1, z + 0.55 + i * 0.18);
      this.batcher.add(ball);
    });
    this.part("resinSheet", 0.3, 0.006, 0.24, x - 0.2, top + 0.045, z + 0.65, green);
    // Knife, burnisher and a ruler.
    this.part("knifeHandle", 0.04, 0.03, 0.14, x + 0.35, top + 0.055, z - 0.75, m.woodDark);
    this.part("knifeBlade", 0.03, 0.01, 0.12, x + 0.35, top + 0.055, z - 0.88, m.iron, 0);
    this.part("ruler", 0.05, 0.01, 0.5, x - 0.4, top + 0.045, z - 0.9, m.brass);
    // Brushes standing in a jar.
    const jar = MeshBuilder.CreateCylinder("hall-brushJar", { diameterTop: 0.15, diameterBottom: 0.17, height: 0.18, tessellation: 14 }, this.ctx.scene);
    jar.material = ochre;
    this.place(jar, x + 0.3, top + 0.13, z + 1.15);
    this.batcher.add(jar);
    for (let i = 0; i < 5; i++) {
      const brush = MeshBuilder.CreateCylinder("hall-brush", { diameter: 0.016, height: 0.34, tessellation: 6 }, this.ctx.scene);
      brush.material = m.woodDark;
      const angle = (i / 5) * Math.PI * 2;
      this.place(brush, x + 0.3 + Math.cos(angle) * 0.03, top + 0.27, z + 1.15 + Math.sin(angle) * 0.03).rotation.set(Math.sin(angle) * 0.12, 0, Math.cos(angle) * 0.12);
      this.batcher.add(brush);
    }
    // A stool and a lamp for the night shift.
    const stool = MeshBuilder.CreateCylinder("hall-stool", { diameter: 0.42, height: 0.06, tessellation: 18 }, this.ctx.scene);
    stool.material = m.woodDark;
    this.place(stool, x - 1.0, 0.62, z);
    this.batcher.add(stool);
    for (const [dx, dz] of [[0.13, 0.13], [-0.13, 0.13], [0.13, -0.13], [-0.13, -0.13]] as const) this.part("stoolLeg", 0.04, 0.6, 0.04, x - 1.0 + dx, 0.3, z + dz, m.woodDark);
    this.part("lampPost", 0.03, 0.5, 0.03, x + 0.45, top + 0.29, z + 0.15, m.iron, 0);
    const shade = MeshBuilder.CreateCylinder("hall-benchLamp", { diameterTop: 0.08, diameterBottom: 0.22, height: 0.14, tessellation: 14 }, this.ctx.scene);
    shade.material = m.glowLamp;
    this.place(shade, x + 0.38, top + 0.52, z + 0.15);
    this.batcher.add(shade);
  }

  private buildSign(): void {
    const sign = MeshBuilder.CreatePlane("hall-insideSign", { width: 6.8, height: 0.62 }, this.ctx.scene);
    sign.material = this.ctx.materials.signBoard([this.insideSign], 2048, 186);
    this.place(sign, 0, 3.35, this.frame.innerBackZ - 0.05);
    sign.isPickable = false;
    this.ctx.interior.add(sign);
  }

  // ---------------------------------------------------------------- helpers

  private paint(hex: string): Material {
    let material = this.paints.get(hex);
    if (!material) {
      material = this.ctx.materials.varnish(hex);
      this.paints.set(hex, material);
    }
    return material;
  }

  private imageMaterial(name: string, texture: PhotoTexture): StandardMaterial {
    const material = new StandardMaterial(name, this.ctx.scene);
    material.disableLighting = true;
    material.diffuseColor = Color3.Black();
    material.specularColor = Color3.Black();
    const placeholder = Color3.FromHexString("#e7e1d6");
    material.emissiveColor = placeholder;
    texture.changed.subscribe((value) => {
      material.emissiveTexture = value;
      material.emissiveColor = value ? Color3.Black() : placeholder;
    });
    return material;
  }

  private static selfLit(name: string, texture: DynamicTexture, ctx: SceneContext): StandardMaterial {
    const material = new StandardMaterial(name, ctx.scene);
    material.disableLighting = true;
    material.emissiveTexture = texture;
    material.emissiveColor = Color3.Black();
    material.diffuseColor = Color3.Black();
    material.specularColor = Color3.Black();
    return material;
  }

  private static paintLabel(texture: DynamicTexture, text: string): void {
    const ctx = texture.getContext() as CanvasRenderingContext2D;
    const { width, height } = texture.getSize();
    ctx.fillStyle = "#f3ead8";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#b58a3a";
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, width - 10, height - 10);
    ctx.fillStyle = "#241612";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "600 52px Figtree, Arial, sans-serif";
    ctx.fillText(CommissionHallInterior.fit(ctx, text, width - 60), width / 2, height / 2 + 2);
    texture.update();
  }

  private static fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let cut = text;
    while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
    return `${cut.trimEnd()}…`;
  }

  private clickable(mesh: Mesh, metadata: HallMetadata): void {
    mesh.isPickable = true;
    mesh.metadata = metadata;
    mesh.addLODLevel(CommissionHallInterior.DETAIL_DISTANCE, null);
    this.ctx.interior.add(mesh);
  }

  private collider(center: Vector3, width: number, height: number, depth: number): void {
    const box = MeshBuilder.CreateBox("hall-collider", { width, height, depth }, this.ctx.scene);
    this.place(box, center.x, center.y, center.z);
    box.isVisible = false;
    box.isPickable = false;
    box.checkCollisions = true;
  }

  private place(mesh: Mesh, x: number, y: number, z: number): Mesh {
    mesh.parent = this.root;
    mesh.position.set(x, y, z);
    return mesh;
  }

  private part(name: string, w: number, h: number, d: number, x: number, y: number, z: number, material: Material, tile = 1): Mesh {
    const mesh = MeshFactory.box(this.ctx.scene, `hall-${name}`, w, h, d, material, tile);
    return this.batcher.add(this.place(mesh, x, y, z));
  }
}
