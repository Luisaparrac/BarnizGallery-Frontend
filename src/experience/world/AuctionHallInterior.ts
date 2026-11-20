import { Color3, DynamicTexture, MeshBuilder, StandardMaterial, Vector3, type Material, type Mesh, type TransformNode } from "@babylonjs/core";
import { ArtworkFrame, type WallSpot } from "./ArtworkFrame";
import { HallRoomShell } from "./HallRoomShell";
import { MeshBatcher } from "./MeshBatcher";
import { MeshFactory } from "./MeshFactory";
import type { HallFrame } from "./PlazaHall";
import type { SceneContext } from "./SceneContext";
import type { AuctionBoard, AuctionPiece } from "./WorldTypes";

/** Stored on the clickable meshes of a piece on auction. */
export interface AuctionMetadata {
  auctionId: number;
}

/**
 * Inside of the auction hall: the auctioneer's podium on a dais at the back, a big live board above
 * it, rows of chairs facing the podium and the pieces on auction framed on the side walls (the same
 * frames as the salas). Static parts are merged per material; the board is redrawn once a second
 * while the visitor is near, so the countdowns tick.
 */
export class AuctionHallInterior {
  static readonly CEILING = 4.4;
  /** Most pieces the side walls hold. */
  static readonly CAPACITY = 4;
  /** The board is only redrawn while the camera is this close (metres). */
  private static readonly LIVE_DISTANCE = 30;
  private static readonly BOARD = { width: 5.6, height: 2.3, pixelsWide: 2048, pixelsHigh: 842 };

  readonly frames: ArtworkFrame[] = [];
  private readonly batcher = new MeshBatcher();
  private boardTexture: DynamicTexture | null = null;
  private boardMesh: Mesh | null = null;
  private board: AuctionBoard | null = null;
  private lastDraw = -1;

  constructor(
    private readonly ctx: SceneContext,
    private readonly root: TransformNode,
    private readonly frame: HallFrame,
    private readonly pieces: readonly AuctionPiece[],
  ) {}

  build(): void {
    const { innerHalfWidth: hw, innerFrontZ: fz, innerBackZ: bz } = this.frame;
    const burgundy = this.ctx.materials.varnish("#5e1a1a");
    new HallRoomShell(this.ctx, this.root, this.batcher).build(this.frame, AuctionHallInterior.CEILING, burgundy, [
      [0, -2.6],
      [0, 1.2],
    ]);
    this.buildDais(burgundy);
    this.buildBoard();
    this.buildChairs();
    const spots = this.wallSpots();
    this.pieces.slice(0, AuctionHallInterior.CAPACITY).forEach((piece, index) => {
      const metadata: AuctionMetadata = { auctionId: piece.auctionId };
      const frame = new ArtworkFrame(this.ctx, this.root, piece, spots[index], this.batcher, AuctionHallInterior.CEILING, metadata);
      frame.build();
      this.frames.push(frame);
    });

    this.root.computeWorldMatrix(true);
    this.frames.forEach((frame) => frame.root.computeWorldMatrix(true));
    const merged = this.batcher.merge("auctionHall-interior");
    for (const mesh of merged) {
      mesh.isPickable = false;
      this.ctx.interior.add(mesh);
    }
    this.ctx.photos.addRoom({
      world: this.root.getWorldMatrix(),
      min: new Vector3(-hw, 0, fz),
      max: new Vector3(hw, AuctionHallInterior.CEILING, bz),
      photos: this.frames.flatMap((frame) => (frame.photo ? [frame.photo] : [])),
      occluders: merged.filter((mesh) => !mesh.material?.needAlphaBlending()),
    });
  }

  setBoard(board: AuctionBoard): void {
    this.board = board;
    this.draw();
  }

  /** Redraws the board once a second (the countdowns) while the camera is near the hall. */
  update(timeSeconds: number): void {
    const second = Math.floor(timeSeconds);
    if (second === this.lastDraw || !this.board || !this.boardMesh) return;
    const camera = this.ctx.scene.activeCamera;
    if (camera && Vector3.Distance(camera.globalPosition, this.boardMesh.getAbsolutePosition()) > AuctionHallInterior.LIVE_DISTANCE) return;
    this.lastDraw = second;
    this.draw();
  }

  /** Two pictures on each side wall, facing the middle. */
  private wallSpots(): WallSpot[] {
    const hw = this.frame.innerHalfWidth;
    const skin = 0.02;
    return [
      { x: -hw + skin, z: -2.3, facing: -Math.PI / 2 },
      { x: hw - skin, z: -2.3, facing: Math.PI / 2 },
      { x: -hw + skin, z: 1.7, facing: -Math.PI / 2 },
      { x: hw - skin, z: 1.7, facing: Math.PI / 2 },
    ];
  }

  // ---------------------------------------------------------------- podium

  /** A dais across the back, a curtain behind and the auctioneer's lectern with the gavel. */
  private buildDais(burgundy: Material): void {
    const m = this.ctx.materials;
    const bz = this.frame.innerBackZ;
    const z = bz - 1.5;
    this.part("dais", 6.4, 0.3, 2.6, 0, 0.15, bz - 1.3, m.woodDark, 2);
    this.part("daisEdge", 6.5, 0.05, 0.06, 0, 0.3, bz - 2.6, m.brass);
    this.part("daisStep", 2.4, 0.15, 0.45, 0, 0.075, bz - 2.85, m.woodDark, 2);
    // Curtain panels behind the board.
    for (const x of [-3.6, 3.6]) this.part("curtain", 1.0, 3.9, 0.08, x, 2.25, bz - 0.08, burgundy);
    // The lectern: a tapered wooden stand with a brass band and the gavel on its sound block.
    this.part("lectern", 1.2, 1.05, 0.7, 0, 0.3 + 0.525, z, m.woodWarm, 2);
    this.part("lecternTop", 1.35, 0.06, 0.82, 0, 0.3 + 1.08, z, m.woodDark, 2);
    this.part("lecternBand", 1.22, 0.08, 0.72, 0, 0.3 + 0.86, z, m.brass);
    this.part("lecternPanel", 0.8, 0.5, 0.03, 0, 0.3 + 0.5, z - 0.36, burgundy);
    const block = MeshBuilder.CreateCylinder("auction-block", { diameter: 0.18, height: 0.04, tessellation: 20 }, this.ctx.scene);
    block.material = m.woodDark;
    this.place(block, 0.3, 0.3 + 1.13, z - 0.1);
    this.batcher.add(block);
    const head = MeshBuilder.CreateCylinder("auction-gavelHead", { diameter: 0.07, height: 0.17, tessellation: 14 }, this.ctx.scene);
    head.material = m.woodDark;
    this.place(head, -0.15, 0.3 + 1.15, z - 0.12).rotation.z = Math.PI / 2;
    this.batcher.add(head);
    this.part("gavelHandle", 0.025, 0.025, 0.26, -0.15, 0.3 + 1.15, z + 0.02, m.woodWarm);
    const collider = MeshBuilder.CreateBox("auction-daisCollider", { width: 6.4, height: 1.2, depth: 2.6 }, this.ctx.scene);
    this.place(collider, 0, 0.6, bz - 1.3);
    collider.isVisible = false;
    collider.isPickable = false;
    collider.checkCollisions = true;
  }

  // ---------------------------------------------------------------- board

  private buildBoard(): void {
    const { width, height, pixelsWide, pixelsHigh } = AuctionHallInterior.BOARD;
    const bz = this.frame.innerBackZ;
    const y = 2.95;
    this.part("boardFrame", width + 0.16, height + 0.16, 0.06, 0, y, bz - 0.06, this.ctx.materials.woodDark, 2);
    const board = MeshBuilder.CreatePlane("auction-board", { width, height }, this.ctx.scene);
    this.place(board, 0, y, bz - 0.1);
    board.isPickable = false;
    const texture = new DynamicTexture("auction-boardTex", { width: pixelsWide, height: pixelsHigh }, this.ctx.scene, true);
    texture.anisotropicFilteringLevel = this.ctx.scene.getEngine().getCaps().maxAnisotropy || 8;
    const material = new StandardMaterial("auction-boardMat", this.ctx.scene);
    material.disableLighting = true;
    material.emissiveTexture = texture;
    material.emissiveColor = Color3.Black();
    material.diffuseColor = Color3.Black();
    material.specularColor = Color3.Black();
    board.material = material;
    this.ctx.interior.add(board);
    this.boardTexture = texture;
    this.boardMesh = board;
  }

  private draw(): void {
    const texture = this.boardTexture;
    const board = this.board;
    if (!texture || !board) return;
    const ctx = texture.getContext() as CanvasRenderingContext2D;
    const { width, height } = texture.getSize();
    ctx.fillStyle = "#16100d";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#c9a227";
    ctx.lineWidth = 6;
    ctx.strokeRect(18, 18, width - 36, height - 36);

    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = "#f2c230";
    ctx.font = "800 92px 'Bricolage Grotesque', Figtree, Arial, sans-serif";
    ctx.fillText(board.title, width / 2, 100);
    // A red dot that blinks: the board is live.
    if (Math.floor(Date.now() / 1000) % 2 === 0) {
      ctx.fillStyle = "#e0402f";
      ctx.beginPath();
      ctx.arc(width / 2 - ctx.measureText(board.title).width / 2 - 50, 100, 18, 0, Math.PI * 2);
      ctx.fill();
    }

    const left = 80;
    const columns = [left, 1050, 1480, 1840];
    ctx.textAlign = "left";
    ctx.fillStyle = "#b7a58f";
    ctx.font = "600 46px Figtree, Arial, sans-serif";
    board.columns.forEach((label, index) => {
      ctx.textAlign = index === 3 ? "right" : "left";
      ctx.fillText(label, index === 3 ? width - left : columns[index], 200);
    });
    ctx.fillStyle = "#4a3a30";
    ctx.fillRect(left, 236, width - left * 2, 3);

    if (!board.rows.length) {
      ctx.textAlign = "center";
      ctx.fillStyle = "#f4ecd8";
      ctx.font = "500 64px Figtree, Arial, sans-serif";
      ctx.fillText(board.empty, width / 2, 480);
      texture.update();
      return;
    }
    const rowHeight = 140;
    board.rows.slice(0, 4).forEach((row, index) => {
      const y = 316 + index * rowHeight;
      const live = row.status === "ACTIVE";
      ctx.textAlign = "left";
      ctx.fillStyle = live ? "#fffdf8" : "#a8998a";
      ctx.font = "700 58px Figtree, Arial, sans-serif";
      ctx.fillText(AuctionHallInterior.fit(ctx, row.title, columns[1] - columns[0] - 40), columns[0], y);
      ctx.fillStyle = live ? "#f2c230" : "#a8998a";
      ctx.font = "800 60px Figtree, Arial, sans-serif";
      ctx.fillText(row.bid, columns[1], y);
      ctx.fillStyle = live ? "#fffdf8" : "#a8998a";
      ctx.font = "600 56px 'Courier New', monospace";
      ctx.fillText(this.timeText(row, board), columns[2], y);
      ctx.textAlign = "right";
      ctx.font = "700 58px Figtree, Arial, sans-serif";
      ctx.fillText(String(row.bids), width - left, y);
      if (index < board.rows.length - 1) {
        ctx.fillStyle = "#2c211b";
        ctx.fillRect(left, y + rowHeight / 2, width - left * 2, 2);
      }
    });
    texture.update();
  }

  private timeText(row: AuctionBoard["rows"][number], board: AuctionBoard): string {
    if (row.status === "FINISHED" || row.status === "CANCELLED" || !row.until) return board.ended;
    const left = Math.max(0, Date.parse(row.until) - Date.now());
    const total = Math.floor(left / 1000);
    const days = Math.floor(total / 86400);
    const pad = (value: number) => String(value).padStart(2, "0");
    const clock = `${pad(Math.floor((total % 86400) / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
    const text = days > 0 ? `${days}d ${clock}` : clock;
    return row.status === "SCHEDULED" ? `${board.opens} ${text}` : text;
  }

  private static fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let cut = text;
    while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
    return `${cut.trimEnd()}…`;
  }

  // ---------------------------------------------------------------- chairs

  /** Two rows of chairs facing the podium. */
  private buildChairs(): void {
    const m = this.ctx.materials;
    for (const z of [-1.0, 0.4]) {
      for (const x of [-2.4, -1.2, 1.2, 2.4]) {
        this.part("chairSeat", 0.5, 0.06, 0.48, x, 0.47, z, m.woodWarm, 1);
        this.part("chairBack", 0.5, 0.5, 0.05, x, 0.76, z - 0.22, m.woodDark, 1);
        for (const [dx, dz] of [[0.21, 0.2], [-0.21, 0.2], [0.21, -0.2], [-0.21, -0.2]] as const) this.part("chairLeg", 0.04, 0.46, 0.04, x + dx, 0.23, z + dz, m.woodDark);
      }
      // One collider per side, so the aisle in the middle stays free.
      for (const side of [-1, 1]) {
        const collider = MeshBuilder.CreateBox("auction-chairsCollider", { width: 1.8, height: 1.0, depth: 0.6 }, this.ctx.scene);
        this.place(collider, side * 1.8, 0.5, z);
        collider.isVisible = false;
        collider.isPickable = false;
        collider.checkCollisions = true;
      }
    }
  }

  // ---------------------------------------------------------------- helpers

  private place(mesh: Mesh, x: number, y: number, z: number): Mesh {
    mesh.parent = this.root;
    mesh.position.set(x, y, z);
    return mesh;
  }

  private part(name: string, w: number, h: number, d: number, x: number, y: number, z: number, material: Material, tile = 0): Mesh {
    const mesh = MeshFactory.box(this.ctx.scene, `auction-${name}`, w, h, d, material, tile);
    return this.batcher.add(this.place(mesh, x, y, z));
  }
}
