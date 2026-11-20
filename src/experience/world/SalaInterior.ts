import { Color3, DynamicTexture, MeshBuilder, StandardMaterial, TransformNode, Vector3, type Material, type Mesh } from "@babylonjs/core";
import { ArtworkFrame, type WallSpot } from "./ArtworkFrame";
import { MeshBatcher } from "./MeshBatcher";
import { MeshFactory } from "./MeshFactory";
import type { SceneContext } from "./SceneContext";
import type { WorldRoom } from "./WorldTypes";

/** Inner size of a sala, in the building's local frame (door on the -Z side). */
export interface SalaFrame {
  innerHalfWidth: number;
  innerFrontZ: number;
  innerBackZ: number;
  doorHalfWidth: number;
  doorHeight: number;
}

/**
 * Inside of a master's sala: wooden floor, beamed ceiling, painted walls, a name sign, a bench in the
 * middle and the pieces framed on the left, right and back walls, each under its own spot.
 */
export class SalaInterior {
  static readonly CEILING = 4.4;
  /** Most pieces one sala can show. */
  static readonly CAPACITY = 6;

  readonly frames: ArtworkFrame[] = [];
  /** Where the visitor stands at the WhatsApp lectern (world), or null when the master has no number. */
  contactPoint: Vector3 | null = null;
  /** Static parts of the room and of its frames, merged per material at the end of `build()`. */
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
    this.buildBench();
    if (this.room.whatsapp) this.buildContactLectern();
    const pieces = this.room.pieces.slice(0, SalaInterior.CAPACITY);
    const spots = this.wallSpots(pieces.length);
    pieces.forEach((piece, index) => {
      const frame = new ArtworkFrame(this.ctx, this.root, piece, spots[index], this.batcher, SalaInterior.CEILING);
      frame.build();
      this.frames.push(frame);
    });
    for (const [x, z] of [[0, -2.6], [0, 1.6]] as const) this.ceilingLamp(x, z);
    // The merge bakes world positions, so the frame roots must be up to date first.
    this.root.computeWorldMatrix(true);
    this.frames.forEach((frame) => frame.root.computeWorldMatrix(true));
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
      photos: this.frames.flatMap((frame) => (frame.photo ? [frame.photo] : [])),
      // The spot beams and halos are see-through: they must not hide the photos.
      occluders: merged.filter((mesh) => !mesh.material?.needAlphaBlending()),
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

  /**
   * Where the pictures hang, well spaced, by how many there are: the back wall first, then the side
   * walls (the front wall has the door). The frames face the middle of the room.
   */
  private wallSpots(count: number): WallSpot[] {
    const { innerHalfWidth: hw, innerBackZ: bz } = this.frame;
    const skin = 0.02;
    const back = (x: number): WallSpot => ({ x, z: bz - skin, facing: 0 });
    const left = (z: number): WallSpot => ({ x: -hw + skin, z, facing: -Math.PI / 2 });
    const right = (z: number): WallSpot => ({ x: hw - skin, z, facing: Math.PI / 2 });
    const layouts: WallSpot[][] = [
      [],
      [back(0)],
      [back(-3.4), back(3.4)],
      [back(0), left(0.4), right(0.4)],
      [back(-3.4), back(3.4), left(0.4), right(0.4)],
      [back(0), left(-2.3), left(2.3), right(-2.3), right(2.3)],
      [back(-3.4), back(3.4), left(-2.3), left(2.3), right(-2.3), right(2.3)],
    ];
    return layouts[Math.min(count, layouts.length - 1)];
  }

  /**
   * A lectern by the entrance with "Contact the master on WhatsApp": a click or E opens the chat.
   * It stands on the right of the door, turned towards the visitor coming in.
   */
  private buildContactLectern(): void {
    const m = this.ctx.materials;
    const x = 3.3;
    const z = this.frame.innerFrontZ + 1.6;
    // Turned towards the doorway (the sign faces local -Z of its pivot).
    const turn = 0.5;
    const lectern = MeshBuilder.CreateBox(`${this.room.key}-lecternPost`, { width: 0.12, height: 1.05, depth: 0.12 }, this.ctx.scene);
    lectern.material = m.woodDark;
    lectern.parent = this.root;
    lectern.position.set(x, 0.52, z);
    this.batcher.add(lectern);
    this.part("lecternFoot", 0.5, 0.05, 0.4, x, 0.025, z, m.woodDark, 1);

    const width = 0.62;
    const height = 0.42;
    const pivot = new TransformNode(`${this.room.key}-contactPivot`, this.ctx.scene);
    pivot.parent = this.root;
    pivot.position.set(x, 1.2, z);
    pivot.rotation.y = turn;
    const board = MeshBuilder.CreatePlane(`${this.room.key}-contact`, { width, height }, this.ctx.scene);
    board.parent = pivot;
    board.position.set(0, 0, -0.05);
    // Sloped like a reading desk.
    board.rotation.x = 0.5;
    const texture = new DynamicTexture(`${this.room.key}-contactTex`, { width: 1240, height: 840 }, this.ctx.scene, true);
    const ctx = texture.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = "#1d7a45";
    ctx.fillRect(0, 0, 1240, 840);
    ctx.strokeStyle = "#c9a227";
    ctx.lineWidth = 18;
    ctx.strokeRect(9, 9, 1222, 822);
    // A chat bubble, drawn (not a logo).
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(620, 230, 120, 0, Math.PI * 2);
    ctx.moveTo(530, 310);
    ctx.lineTo(500, 380);
    ctx.lineTo(590, 340);
    ctx.fill();
    ctx.fillStyle = "#1d7a45";
    for (const dx of [-50, 0, 50]) {
      ctx.beginPath();
      ctx.arc(620 + dx, 230, 16, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 84px 'Bricolage Grotesque', Figtree, Arial, sans-serif";
    const words = this.room.contactLabel.split(" ");
    const half = Math.ceil(words.length / 2);
    ctx.fillText(words.slice(0, half).join(" "), 620, 480);
    ctx.fillText(words.slice(half).join(" "), 620, 580);
    ctx.font = "italic 500 64px Figtree, Arial, sans-serif";
    ctx.fillText(this.room.masterName, 620, 720);
    texture.update();
    const material = new StandardMaterial(`${this.room.key}-contactMat`, this.ctx.scene);
    material.disableLighting = true;
    material.emissiveTexture = texture;
    material.emissiveColor = Color3.Black();
    material.diffuseColor = Color3.Black();
    material.specularColor = Color3.Black();
    board.material = material;
    board.isPickable = true;
    board.metadata = { contactRoom: this.room.key };
    this.ctx.interior.add(board);
    // The wooden board sits right behind the sign, following its slope.
    const backing = this.part("lecternBoard", width + 0.06, height + 0.06, 0.03, 0, 0, 0.02, m.woodWarm, 1);
    backing.parent = board;

    // The merge bakes world positions: the pivot and the sign must be up to date first.
    this.root.computeWorldMatrix(true);
    pivot.computeWorldMatrix(true);
    board.computeWorldMatrix(true);
    const front = new Vector3(x - Math.sin(turn) * 1.3, 0, z - Math.cos(turn) * 1.3);
    this.contactPoint = Vector3.TransformCoordinates(front, this.root.getWorldMatrix());
  }

  /** A wooden bench in the middle, facing the back wall. */
  private buildBench(): void {
    const m = this.ctx.materials;
    const z = -0.6;
    this.part("benchSeat", 2.6, 0.08, 0.55, 0, 0.46, z, m.woodWarm, 2);
    this.part("benchApron", 2.5, 0.12, 0.5, 0, 0.36, z, m.woodDark, 2);
    for (const side of [-1, 1]) this.part("benchLeg", 0.1, 0.42, 0.48, side * 1.1, 0.21, z, m.woodDark, 2);
    const collider = MeshBuilder.CreateBox(`${this.room.key}-benchCollider`, { width: 2.7, height: 0.9, depth: 0.7 }, this.ctx.scene);
    collider.parent = this.root;
    collider.position.set(0, 0.45, z);
    collider.isVisible = false;
    collider.isPickable = false;
    collider.checkCollisions = true;
  }

  /** Board above the back pictures with the master's name and workshop. */
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
