import { Color3, DynamicTexture, MeshBuilder, StandardMaterial, TransformNode, Vector3, type Material, type Mesh } from "@babylonjs/core";
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
 * Glass display case on a wooden plinth. Inside stands the 2D photo of the piece on a small easel,
 * and a brass-framed plaque on the front shows its title and price. Its front is the local -Z side.
 * The wooden and brass parts go to the sala's batcher (merged per material); only the glass, the
 * photo and the plaque stay separate meshes, because a click on them opens the piece.
 */
export class Vitrina {
  static readonly PLINTH_HEIGHT = 1.0;
  static readonly SIZE = 0.95;
  /** Beyond this distance the glass, photo and plaque are a few pixels through the door: not drawn (LOD). */
  static readonly DETAIL_DISTANCE = 22;

  readonly root: TransformNode;
  private readonly meshes: Mesh[] = [];

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

  build(): void {
    const m = this.ctx.materials;
    const S = Vitrina.SIZE;
    const P = Vitrina.PLINTH_HEIGHT;
    const glassHeight = 1.15;

    this.box("plinth", S, P - 0.08, S, 0, (P - 0.08) / 2 + 0.08, 0, m.woodDark, 1.2);
    this.box("plinthBase", S + 0.1, 0.08, S + 0.1, 0, 0.04, 0, m.woodWarm, 1.2);
    this.box("plinthTop", S + 0.06, 0.05, S + 0.06, 0, P + 0.025, 0, m.brass);
    this.box("glass", S - 0.05, glassHeight, S - 0.05, 0, P + 0.05 + glassHeight / 2, 0, m.glass, 0, true);
    this.box("glassCap", S + 0.02, 0.05, S + 0.02, 0, P + 0.075 + glassHeight, 0, m.woodDark, 1.2);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) this.box("glassEdge", 0.025, glassHeight, 0.025, sx * (S / 2 - 0.03), P + 0.05 + glassHeight / 2, sz * (S / 2 - 0.03), m.brass);
    }

    // The photo stands on a small easel, slightly leaned back.
    const photoSize = 0.72;
    const photoY = P + 0.2 + photoSize / 2;
    this.box("easelFoot", 0.34, 0.14, 0.22, 0, P + 0.12, 0.1, m.cream);
    this.box("photoBacking", photoSize + 0.05, photoSize + 0.05, 0.025, 0, photoY, 0.03, m.woodDark).rotation.x = -0.1;
    const photo = MeshBuilder.CreatePlane(`photo-${this.piece.id}`, { size: photoSize }, this.ctx.scene);
    photo.parent = this.root;
    photo.position.set(0, photoY, 0.012);
    photo.rotation.x = -0.1;
    photo.material = this.photoMaterial();
    this.register(photo, true);

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

  /** The photo is self-lit so it always reads clearly, like a backlit print. */
  private photoMaterial(): StandardMaterial {
    const material = new StandardMaterial(`photoMat-${this.piece.id}`, this.ctx.scene);
    material.disableLighting = true;
    material.diffuseColor = Color3.Black();
    material.specularColor = Color3.Black();
    if (this.piece.photoUrl) {
      // Babylon adds the emissive texture to emissiveColor, so the colour stays black.
      material.emissiveTexture = PhotoTexture.create(this.ctx.scene, `photoTex-${this.piece.id}`, this.piece.photoUrl);
    } else {
      material.emissiveColor = Color3.FromHexString("#d9cfbf");
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
