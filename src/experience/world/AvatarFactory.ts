import { SceneLoader, TransformNode, type Scene } from "@babylonjs/core";
import type { AvatarModel } from "./AvatarModel";
import { ArtisanAvatar } from "./avatars/ArtisanAvatar";
import { ArtisanWomanAvatar } from "./avatars/ArtisanWomanAvatar";
import { GuineaPigAvatar } from "./avatars/GuineaPigAvatar";
import { PastoAvatar } from "./avatars/PastoAvatar";
import { TravelerAvatar } from "./avatars/TravelerAvatar";
import { GltfAvatar } from "./GltfAvatar";
import type { MaterialLibrary } from "./MaterialLibrary";
import type { ShadowRig } from "./ShadowRig";

/** What an avatar needs from the scene it lives in. */
export interface AvatarContext {
  scene: Scene;
  materials: MaterialLibrary;
  shadows: ShadowRig;
}

/**
 * Creates the visitor's avatar (Factory): the model `public/models/avatars/<code>.glb` when it
 * exists, or the procedural avatar of that code (made in code) when it is missing or fails.
 */
export class AvatarFactory {
  /** Codes of the avatar catalog; each one may have its .glb model. */
  static readonly CODES = ["artesano", "artesana", "viajera", "cuy", "indigena"] as const;

  private static readonly HEIGHT = 1.7;

  /** The avatar made in code for each catalog code; unknown codes get the artisan. */
  private static readonly PROCEDURAL: Record<string, (context: AvatarContext) => AvatarModel> = {
    artesano: (context) => new ArtisanAvatar(context),
    artesana: (context) => new ArtisanWomanAvatar(context),
    viajera: (context) => new TravelerAvatar(context),
    cuy: (context) => new GuineaPigAvatar(context),
    indigena: (context) => new PastoAvatar(context),
  };

  constructor(private readonly context: AvatarContext) {}

  static modelUrl(code: string): string {
    return `${import.meta.env.BASE_URL}models/avatars/${code}.glb`;
  }

  async create(code: string | null): Promise<AvatarModel> {
    if (!code) return this.procedural(null);
    try {
      return (await this.load(code)) ?? this.procedural(code);
    } catch (error) {
      console.warn(`Avatar "${code}": the .glb could not be loaded, using the procedural one.`, error);
      return this.procedural(code);
    }
  }

  procedural(code: string | null): AvatarModel {
    const build = (code && AvatarFactory.PROCEDURAL[code]) || AvatarFactory.PROCEDURAL.artesano;
    return build(this.context);
  }

  /** Null when the file does not exist (the dev server and Vercel answer missing files with index.html). */
  private async load(code: string): Promise<AvatarModel | null> {
    const url = AvatarFactory.modelUrl(code);
    const head = await fetch(url, { method: "HEAD" });
    if (!head.ok || (head.headers.get("content-type") ?? "").includes("html")) return null;

    // The glTF loader is only downloaded when there is a model to load.
    await import("@babylonjs/loaders/glTF");
    const { scene, shadows } = this.context;
    const result = await SceneLoader.ImportMeshAsync(null, "", url, scene);

    const root = new TransformNode(`avatar-${code}`, scene);
    for (const mesh of result.meshes) {
      if (!mesh.parent) mesh.parent = root;
      mesh.isPickable = false;
      if (mesh.getTotalVertices() > 0) {
        shadows.addCaster(mesh);
        shadows.receive(mesh);
      }
    }
    this.normalize(root);
    return new GltfAvatar(root, result.animationGroups);
  }

  /** Scales the model to about 1.7 m and puts its feet on the root's origin. */
  private normalize(root: TransformNode): void {
    const inner = new TransformNode(`${root.name}-fit`, root.getScene());
    for (const child of root.getChildren()) (child as TransformNode).parent = inner;
    inner.parent = root;
    root.computeWorldMatrix(true);
    const { min, max } = inner.getHierarchyBoundingVectors(true);
    const height = max.y - min.y;
    if (height <= 0.01) return;
    const scale = AvatarFactory.HEIGHT / height;
    inner.scaling.setAll(scale);
    inner.position.set(-((min.x + max.x) / 2) * scale, -min.y * scale, -((min.z + max.z) / 2) * scale);
  }
}
