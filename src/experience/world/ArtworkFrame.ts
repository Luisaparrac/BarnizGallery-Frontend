import { Color3, DynamicTexture, MeshBuilder, StandardMaterial, TransformNode, Vector3, type Material, type Mesh } from "@babylonjs/core";
import { GalleryLights } from "./GalleryLights";
import type { MeshBatcher } from "./MeshBatcher";
import { MeshFactory } from "./MeshFactory";
import { PhotoTexture } from "./PhotoTexture";
import type { SceneContext } from "./SceneContext";
import type { WorldPiece } from "./WorldTypes";

/** Data stored on every clickable mesh of a framed piece, so a click can tell which piece it is. */
export interface PieceMetadata {
  pieceId: number;
}

/** Where a picture hangs: a point on the wall's inner face and the rotation that turns it to the room. */
export interface WallSpot {
  x: number;
  z: number;
  facing: number;
}

/**
 * A piece hung on the wall like a painting: its main photo with the real proportion (the longest
 * side about 1.4 m) and its centre at eye height, behind a light mat in a slim dark-wood frame with a
 * gilded lip. Beside it, a plaque with title, master, technique, measures and price; above it, a
 * ceiling spot with a soft visible beam and a warm halo on the wall (emissive, no real lights).
 * Its front is the local -Z side. Frame, mat, spot and glow go to the room's batcher; the photo and
 * the plaque stay separate because a click on them opens the piece.
 */
export class ArtworkFrame {
  /** Longest side of the photo, in metres. */
  static readonly PICTURE_SIZE = 1.4;
  static readonly EYE_HEIGHT = 1.6;
  /** Beyond this distance the photo and plaque are a few pixels through the door: not drawn (LOD). */
  static readonly DETAIL_DISTANCE = 24;
  private static readonly MAT = 0.1;
  private static readonly MOLDING = 0.05;
  /** The frame stands off the wall so it clears the wainscot rail. */
  private static readonly BACK_Z = -0.12;
  /** The plaque beside the picture: 60 × 42 cm, readable from 2 m. */
  private static readonly PLAQUE = { width: 0.6, height: 0.42 };
  /** Space between the frame and its plaque. */
  private static readonly PLAQUE_GAP = 0.14;
  /** Height of the spot that lights the picture; it stays below the master's sign. */
  static readonly LAMP_HEIGHT = 3.15;

  readonly root: TransformNode;
  private photoMesh: Mesh | null = null;
  private photoTexture: PhotoTexture | null = null;
  private readonly meshes: Mesh[] = [];

  constructor(
    private readonly ctx: SceneContext,
    parent: TransformNode,
    readonly piece: WorldPiece,
    spot: WallSpot,
    private readonly batcher: MeshBatcher,
    private readonly ceiling: number,
    /** What a click on the picture reports; by default, the piece. */
    private readonly metadata: object = { pieceId: piece.id } satisfies PieceMetadata,
  ) {
    this.root = new TransformNode(`frame-${piece.id}`, ctx.scene);
    this.root.parent = parent;
    this.root.position.set(spot.x, 0, spot.z);
    this.root.rotation.y = spot.facing;
  }

  /** Width and height of the photo itself. */
  get pictureSize(): { width: number; height: number } {
    return ArtworkFrame.pictureOf(this.piece);
  }

  static pictureOf(piece: WorldPiece): { width: number; height: number } {
    const aspect = piece.photoAspect > 0 ? piece.photoAspect : 1;
    const L = ArtworkFrame.PICTURE_SIZE;
    return aspect >= 1 ? { width: L, height: L / aspect } : { width: L * aspect, height: L };
  }

  /** Outer size of the frame (photo, mat and moulding). */
  static outerOf(piece: WorldPiece): { width: number; height: number } {
    const { width, height } = ArtworkFrame.pictureOf(piece);
    const border = (ArtworkFrame.MAT + ArtworkFrame.MOLDING) * 2;
    return { width: width + border, height: height + border };
  }

  /** Width along the wall of the frame plus its plaque: what the room lays out. */
  static unitWidth(piece: WorldPiece): number {
    return ArtworkFrame.outerOf(piece).width + ArtworkFrame.PLAQUE_GAP + ArtworkFrame.PLAQUE.width;
  }

  /**
   * Where the frame's centre sits from the centre of its unit, along the frame's own x (the plaque
   * is on the visitor's right, so the frame moves left).
   */
  static frameOffsetInUnit(): number {
    return -(ArtworkFrame.PLAQUE_GAP + ArtworkFrame.PLAQUE.width) / 2;
  }

  /** World point in front of the picture where the visitor stands to look at it. */
  get viewPoint(): Vector3 {
    this.root.computeWorldMatrix(true);
    return Vector3.TransformCoordinates(new Vector3(0, 0, -2.1), this.root.getWorldMatrix());
  }

  /** The photo and its texture, once built (null when the piece has no photo). */
  get photo(): { mesh: Mesh; texture: PhotoTexture } | null {
    return this.photoMesh && this.photoTexture ? { mesh: this.photoMesh, texture: this.photoTexture } : null;
  }

  build(): void {
    const m = this.ctx.materials;
    const { width: pw, height: ph } = this.pictureSize;
    const y = ArtworkFrame.EYE_HEIGHT;
    const mat = ArtworkFrame.MAT;
    const molding = ArtworkFrame.MOLDING;
    const back = ArtworkFrame.BACK_Z;
    const innerW = pw + mat * 2;
    const innerH = ph + mat * 2;
    const outerW = innerW + molding * 2;
    const outerH = innerH + molding * 2;

    // Backing board, light mat (paspartú) and the slim moulding with a gilded inner lip.
    this.box("frameBack", outerW, outerH, 0.02, 0, y, back - 0.01, m.woodDark);
    this.box("frameMat", innerW, innerH, 0.012, 0, y, back - 0.03, m.cream);
    for (const side of [-1, 1]) {
      this.box("frameSide", molding, outerH, 0.06, side * (innerW / 2 + molding / 2), y, back - 0.05, m.woodDark, 1.2);
      this.box("frameTop", innerW, molding, 0.06, 0, y + side * (innerH / 2 + molding / 2), back - 0.05, m.woodDark, 1.2);
      this.box("frameLipSide", 0.012, innerH, 0.016, side * (innerW / 2 - 0.006), y, back - 0.042, m.brass);
      this.box("frameLipTop", innerW, 0.012, 0.016, 0, y + side * (innerH / 2 - 0.006), back - 0.042, m.brass);
    }

    const photo = MeshBuilder.CreatePlane(`photo-${this.piece.id}`, { width: pw, height: ph }, this.ctx.scene);
    photo.parent = this.root;
    photo.position.set(0, y, back - 0.038);
    photo.material = this.photoMaterial();
    this.register(photo);
    this.photoMesh = photo;

    this.buildPlaque(outerW);
    this.buildSpot(outerW, outerH);
  }

  // ---------------------------------------------------------------- plaque

  private buildPlaque(outerW: number): void {
    const { width, height } = ArtworkFrame.PLAQUE;
    const x = outerW / 2 + ArtworkFrame.PLAQUE_GAP + width / 2;
    // Centred on the picture's height.
    const y = ArtworkFrame.EYE_HEIGHT;
    this.box("plaqueBoard", width + 0.03, height + 0.03, 0.02, x, y, -0.03, this.ctx.materials.brass);
    const plaque = MeshBuilder.CreatePlane(`plaque-${this.piece.id}`, { width, height }, this.ctx.scene);
    plaque.parent = this.root;
    plaque.position.set(x, y, -0.041);
    plaque.material = this.plaqueMaterial();
    this.register(plaque);
  }

  /** Texture of 1500 × 1050 px for a 60 × 42 cm plaque: the text reads from 2 m. */
  private plaqueMaterial(): StandardMaterial {
    const width = 1500;
    const height = 1050;
    const texture = new DynamicTexture(`plaqueTex-${this.piece.id}`, { width, height }, this.ctx.scene, true);
    texture.anisotropicFilteringLevel = this.ctx.scene.getEngine().getCaps().maxAnisotropy || 8;
    const ctx = texture.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = "#f6efe1";
    ctx.fillRect(0, 0, width, height);
    const pad = 76;
    const maxWidth = width - pad * 2;
    ctx.textBaseline = "alphabetic";
    let y = pad + 118;
    ctx.fillStyle = "#1e130e";
    ctx.font = "700 132px 'Bricolage Grotesque', Figtree, Arial, sans-serif";
    for (const line of ArtworkFrame.wrap(ctx, this.piece.title, maxWidth, 2)) {
      ctx.fillText(line, pad, y);
      y += 140;
    }
    y += 2;
    ctx.fillStyle = "#6b4f3a";
    ctx.font = "italic 600 96px Figtree, Arial, sans-serif";
    ctx.fillText(ArtworkFrame.wrap(ctx, this.piece.masterName, maxWidth, 1)[0] ?? "", pad, y);
    y += 38;
    ctx.fillStyle = "#c9a227";
    ctx.fillRect(pad, y, 180, 7);
    y += 110;
    ctx.fillStyle = "#3d2a20";
    ctx.font = "500 90px Figtree, Arial, sans-serif";
    for (const line of ArtworkFrame.wrap(ctx, this.piece.technique, maxWidth, 2)) {
      ctx.fillText(line, pad, y);
      y += 102;
    }
    if (this.piece.dimensions) ctx.fillText(this.piece.dimensions, pad, y);
    ctx.fillStyle = "#7a1f1a";
    ctx.font = "700 118px Figtree, Arial, sans-serif";
    ctx.fillText(ArtworkFrame.wrap(ctx, this.piece.caption, maxWidth, 1)[0] ?? "", pad, height - pad);
    texture.update();

    // Self-lit, so it stays readable in any light.
    const material = new StandardMaterial(`plaqueMat-${this.piece.id}`, this.ctx.scene);
    material.disableLighting = true;
    material.emissiveTexture = texture;
    material.emissiveColor = Color3.Black();
    material.diffuseColor = Color3.Black();
    material.specularColor = Color3.Black();
    return material;
  }

  /** Splits a text into at most `lines` lines that fit; the last one ends with an ellipsis if cut. */
  private static wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, lines: number): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    const result: string[] = [];
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth || !current) current = next;
      else {
        result.push(current);
        current = word;
      }
    }
    if (current) result.push(current);
    if (result.length <= lines) return result;
    const kept = result.slice(0, lines);
    let last = `${kept[lines - 1]} ${result.slice(lines).join(" ")}`;
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    kept[lines - 1] = `${last.trimEnd()}…`;
    return kept;
  }

  // ---------------------------------------------------------------- spot

  /**
   * A spot on a short wall arm above the picture, its visible beam and the halo it leaves on the wall.
   * The lamp hangs below the master's sign, so the beam never crosses a sign or another picture.
   */
  private buildSpot(outerW: number, outerH: number): void {
    const m = this.ctx.materials;
    const lights = GalleryLights.for(this.ctx.scene);
    const lampY = Math.min(ArtworkFrame.LAMP_HEIGHT, this.ceiling - 0.9);
    const lamp = new Vector3(0, lampY, -0.7);
    const target = new Vector3(0, ArtworkFrame.EYE_HEIGHT + 0.15, ArtworkFrame.BACK_Z);

    // Wall plate and arm.
    this.box("spotPlate", 0.14, 0.2, 0.03, 0, lampY + 0.12, -0.015, m.iron, 0);
    this.box("spotArm", 0.035, 0.035, 0.66, 0, lampY + 0.12, -0.36, m.iron, 0);
    this.box("spotDrop", 0.03, 0.12, 0.03, 0, lampY + 0.06, lamp.z, m.iron, 0);
    const toWall = target.subtract(lamp);
    const tilt = Math.atan2(-toWall.z, -toWall.y);
    const head = MeshBuilder.CreateCylinder(`spotHead-${this.piece.id}`, { diameterTop: 0.09, diameterBottom: 0.15, height: 0.18, tessellation: 16 }, this.ctx.scene);
    head.material = m.iron;
    this.place(head, lamp.x, lamp.y, lamp.z).rotation.x = tilt;
    this.batcher.add(head);
    const bulb = MeshBuilder.CreateDisc(`spotBulb-${this.piece.id}`, { radius: 0.065, tessellation: 16 }, this.ctx.scene);
    bulb.material = m.glowLamp;
    const bulbPoint = lamp.add(toWall.normalize().scale(0.095));
    this.place(bulb, bulbPoint.x, bulbPoint.y, bulbPoint.z).rotation.x = tilt - Math.PI / 2;
    this.batcher.add(bulb);

    // The beam: an open cone from the lamp to the picture, about as wide as the frame.
    const length = toWall.length();
    const beam = MeshBuilder.CreateCylinder(
      `spotBeam-${this.piece.id}`,
      { diameterTop: 0.12, diameterBottom: Math.min(outerW, outerH) * 0.95, height: length, tessellation: 28, cap: 0 },
      this.ctx.scene,
    );
    beam.material = lights.beam;
    const middle = lamp.add(target).scale(0.5);
    this.place(beam, middle.x, middle.y, middle.z).rotation.x = Math.atan2(lamp.z - target.z, lamp.y - target.y);
    this.batcher.add(beam);

    // The warm pool of light on the wall around the frame (it ends below the lamp).
    const size = Math.min(Math.max(outerW, outerH) * 1.8, (lampY - ArtworkFrame.EYE_HEIGHT) * 2);
    const halo = MeshBuilder.CreatePlane(`spotHalo-${this.piece.id}`, { width: Math.max(outerW * 1.6, size), height: size }, this.ctx.scene);
    halo.material = lights.halo;
    this.place(halo, 0, ArtworkFrame.EYE_HEIGHT + 0.1, -0.025);
    this.batcher.add(halo);
  }

  // ---------------------------------------------------------------- helpers

  /**
   * Copy of the photo the world camera draws (seen from outside the sala). Inside, the PhotoPass draws
   * it again on top with its true colours. Self-lit, so it reads the same in any light.
   */
  private photoMaterial(): StandardMaterial {
    const material = new StandardMaterial(`photoMat-${this.piece.id}`, this.ctx.scene);
    material.disableLighting = true;
    material.diffuseColor = Color3.Black();
    material.specularColor = Color3.Black();
    const placeholder = Color3.FromHexString("#d9cfbf");
    material.emissiveColor = placeholder;
    if (this.piece.photoUrl) {
      this.photoTexture = new PhotoTexture(this.ctx.scene, `photoTex-${this.piece.id}`, this.piece.photoUrl, "exact");
      // Babylon adds the emissive texture to emissiveColor, so the colour goes black once it is there.
      this.photoTexture.changed.subscribe((texture) => {
        material.emissiveTexture = texture;
        material.emissiveColor = texture ? Color3.Black() : placeholder;
      });
    }
    return material;
  }

  private box(name: string, w: number, h: number, d: number, x: number, y: number, z: number, material: Material, tile = 0): Mesh {
    const mesh = MeshFactory.box(this.ctx.scene, `${name}-${this.piece.id}`, w, h, d, material, tile);
    return this.batcher.add(this.place(mesh, x, y, z));
  }

  private place(mesh: Mesh, x: number, y: number, z: number): Mesh {
    mesh.parent = this.root;
    mesh.position.set(x, y, z);
    return mesh;
  }

  /** A clickable mesh (photo or plaque): opens the piece and hides far away. */
  private register(mesh: Mesh): void {
    mesh.isPickable = true;
    mesh.metadata = this.metadata;
    mesh.addLODLevel(ArtworkFrame.DETAIL_DISTANCE, null);
    this.ctx.interior.add(mesh);
    this.meshes.push(mesh);
  }
}
