import { Color3, DynamicTexture, Mesh, MeshBuilder, StandardMaterial, TransformNode, Vector3, type Material } from "@babylonjs/core";
import type { MeshBatcher } from "./MeshBatcher";
import { MeshFactory } from "./MeshFactory";
import { PhotoTexture } from "./PhotoTexture";
import type { SceneContext } from "./SceneContext";
import type { WorldPiece } from "./WorldTypes";

/** Data stored on every pickable mesh of a display case, so a click can tell which piece it is. */
export interface PieceMetadata {
  pieceId: number;
}

/**
 * Display case on a wooden plinth, open at the front: glass only on top and on the sides, so nothing
 * stands between the visitor and the photo. Inside, the 2D photo of the piece hangs upright in a
 * clean wooden frame against a wooden back, and a plaque on the plinth shows its title and price.
 * Its front is the local -Z side. The wooden and brass parts go to the sala's batcher (merged per
 * material); only the glass, the photo and the plaque stay separate meshes, because a click on them
 * opens the piece. The photo is also drawn by the PhotoPass, untouched by the post-processing.
 */
export class Vitrina {
  static readonly PLINTH_HEIGHT = 1.0;
  static readonly SIZE = 0.95;
  /** Beyond this distance the glass, photo and plaque are a few pixels through the door: not drawn (LOD). */
  static readonly DETAIL_DISTANCE = 22;

  /** Side of the square photo, in metres. */
  static readonly PHOTO_SIZE = 0.8;

  readonly root: TransformNode;
  private readonly meshes: Mesh[] = [];
  private photoMesh: Mesh | null = null;
  private photoTexture: PhotoTexture | null = null;

  constructor(
    private readonly ctx: SceneContext,
    parent: TransformNode,
    readonly piece: WorldPiece,
    x: number,
    z: number,
    facing: number,
    private readonly batcher: MeshBatcher,
  ) {
    this.root = new TransformNode(`vitrina-${piece.id}`, ctx.scene);
    this.root.parent = parent;
    this.root.position.set(x, 0, z);
    this.root.rotation.y = facing;
  }

  /** World point in front of the case where the visitor stands to look at it. */
  get viewPoint(): Vector3 {
    this.root.computeWorldMatrix(true);
    return Vector3.TransformCoordinates(new Vector3(0, 0, -1.25), this.root.getWorldMatrix());
  }

  /** The photo and its texture, once built (null when the piece has no photo). */
  get photo(): { mesh: Mesh; texture: PhotoTexture } | null {
    return this.photoMesh && this.photoTexture ? { mesh: this.photoMesh, texture: this.photoTexture } : null;
  }

  build(): void {
    const m = this.ctx.materials;
    const S = Vitrina.SIZE;
    const P = Vitrina.PLINTH_HEIGHT;
    const glassHeight = 1.15;

    this.box("plinth", S, P - 0.08, S, 0, (P - 0.08) / 2 + 0.08, 0, m.woodDark, 1.2);
    this.box("plinthBase", S + 0.1, 0.08, S + 0.1, 0, 0.04, 0, m.woodWarm, 1.2);
    this.box("plinthTop", S + 0.06, 0.05, S + 0.06, 0, P + 0.025, 0, m.brass);
    // Glass on the sides and on top only: the front is open.
    const glassBottom = P + 0.05;
    const inner = S - 0.05;
    const panes = [
      this.pane(0.012, glassHeight, inner, -(inner / 2), glassBottom + glassHeight / 2, 0),
      this.pane(0.012, glassHeight, inner, inner / 2, glassBottom + glassHeight / 2, 0),
      this.pane(inner, 0.012, inner, 0, glassBottom + glassHeight, 0),
    ];
    const glass = Mesh.MergeMeshes(panes, true, true)!;
    glass.name = `glass-${this.piece.id}`;
    glass.material = m.glass;
    glass.parent = this.root;
    this.register(glass, true);
    this.box("glassCap", S + 0.02, 0.05, S + 0.02, 0, P + 0.075 + glassHeight, 0, m.woodDark, 1.2);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) this.box("glassEdge", 0.025, glassHeight, 0.025, sx * (S / 2 - 0.03), P + 0.05 + glassHeight / 2, sz * (S / 2 - 0.03), m.brass);
    }
    // Wooden back, so the photo reads against a calm dark ground.
    this.box("caseBack", inner, glassHeight, 0.02, 0, glassBottom + glassHeight / 2, S / 2 - 0.045, m.woodDark, 1.2);

    // The photo hangs upright in a thin warm-wood frame, centred at eye height, on a short post.
    const photoSize = Vitrina.PHOTO_SIZE;
    const photoY = glassBottom + glassHeight / 2;
    const photoZ = 0.1;
    const rim = 0.022;
    const outer = photoSize + rim * 2;
    for (const side of [-1, 1]) {
      this.box("frameSide", rim, outer, 0.03, side * (photoSize / 2 + rim / 2), photoY, photoZ, m.woodWarm, 1.2);
      this.box("frameEdge", photoSize, rim, 0.03, 0, photoY + side * (photoSize / 2 + rim / 2), photoZ, m.woodWarm, 1.2);
    }
    this.box("frameBack", outer, outer, 0.015, 0, photoY, photoZ + 0.022, m.woodDark);
    const postHeight = photoY - outer / 2 - glassBottom;
    this.box("photoPost", 0.05, postHeight, 0.05, 0, glassBottom + postHeight / 2, photoZ + 0.02, m.brass);

    const photo = MeshBuilder.CreatePlane(`photo-${this.piece.id}`, { size: photoSize }, this.ctx.scene);
    photo.parent = this.root;
    photo.position.set(0, photoY, photoZ);
    photo.material = this.photoMaterial();
    this.register(photo, true);
    this.photoMesh = photo;

    // Plaque with title and price on the front of the plinth.
    const plaque = MeshBuilder.CreatePlane(`plaque-${this.piece.id}`, { width: 0.78, height: 0.3 }, this.ctx.scene);
    plaque.parent = this.root;
    plaque.position.set(0, P - 0.3, -S / 2 - 0.006);
    plaque.material = this.plaqueMaterial();
    this.register(plaque, true);

    // Invisible collider so the visitor walks around the case.
    const collider = MeshBuilder.CreateBox(`vitrinaCollider-${this.piece.id}`, { width: S + 0.1, height: 2.2, depth: S + 0.1 }, this.ctx.scene);
    collider.parent = this.root;
    collider.position.y = 1.1;
    collider.isVisible = false;
    collider.isPickable = false;
    collider.checkCollisions = true;
  }

  private box(name: string, w: number, h: number, d: number, x: number, y: number, z: number, material: Material, tile = 0, pickable = false): Mesh {
    const mesh = MeshFactory.box(this.ctx.scene, `${name}-${this.piece.id}`, w, h, d, material, tile);
    mesh.parent = this.root;
    mesh.position.set(x, y, z);
    if (!pickable) return this.batcher.add(mesh);
    return this.register(mesh, pickable);
  }

  private register(mesh: Mesh, pickable: boolean): Mesh {
    mesh.isPickable = pickable;
    if (pickable) {
      mesh.metadata = { pieceId: this.piece.id } satisfies PieceMetadata;
      mesh.addLODLevel(Vitrina.DETAIL_DISTANCE, null);
    }
    this.ctx.interior.add(mesh);
    this.meshes.push(mesh);
    return mesh;
  }

  /** One glass pane in the case's local frame (merged with the others). */
  private pane(w: number, h: number, d: number, x: number, y: number, z: number): Mesh {
    const mesh = MeshBuilder.CreateBox(`pane-${this.piece.id}`, { width: w, height: h, depth: d }, this.ctx.scene);
    mesh.position.set(x, y, z);
    return mesh;
  }

  /**
   * Copy of the photo the world camera draws (seen from outside the sala). Inside, the PhotoPass draws
   * it again on top with its true colours; this copy is kept a little dimmer so its bloom does not
   * leave a halo around the frame. Unlit, so it reads the same in any light.
   */
  private photoMaterial(): StandardMaterial {
    const material = new StandardMaterial(`photoMat-${this.piece.id}`, this.ctx.scene);
    material.disableLighting = true;
    material.specularColor = Color3.Black();
    const placeholder = Color3.FromHexString("#d9cfbf");
    const dim = new Color3(0.78, 0.78, 0.78);
    material.diffuseColor = placeholder;
    if (this.piece.photoUrl) {
      this.photoTexture = new PhotoTexture(this.ctx.scene, `photoTex-${this.piece.id}`, this.piece.photoUrl);
      // Without lighting the colour is diffuseColor × diffuseTexture.
      this.photoTexture.changed.subscribe((texture) => {
        material.diffuseTexture = texture;
        material.diffuseColor = texture ? dim : placeholder;
      });
    }
    return material;
  }

  private plaqueMaterial(): StandardMaterial {
    const width = 780;
    const height = 300;
    const texture = new DynamicTexture(`plaqueTex-${this.piece.id}`, { width, height }, this.ctx.scene, true);
    const ctx = texture.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = "#f3ead8";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#b58a3a";
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, width - 14, height - 14);
    ctx.fillStyle = "#241612";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 64px Figtree, Arial, sans-serif";
    ctx.fillText(Vitrina.fit(ctx, this.piece.title, width - 70), width / 2, height * 0.38);
    ctx.fillStyle = "#6b4f3a";
    ctx.font = "500 50px Figtree, Arial, sans-serif";
    ctx.fillText(Vitrina.fit(ctx, this.piece.caption, width - 70), width / 2, height * 0.72);
    texture.update();

    // Self-lit like the photo, so the label stays readable in any light.
    const material = new StandardMaterial(`plaqueMat-${this.piece.id}`, this.ctx.scene);
    material.disableLighting = true;
    material.emissiveTexture = texture;
    material.emissiveColor = Color3.Black();
    return material;
  }

  /** Shortens a text with an ellipsis until it fits the plaque. */
  private static fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let cut = text;
    while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
    return `${cut.trimEnd()}…`;
  }
}
