import type { Scene } from "@babylonjs/core";
import type { QualityManager } from "./core/QualityManager";
import type { InteriorLighting } from "./InteriorLighting";
import type { MaterialLibrary } from "./MaterialLibrary";
import type { PhotoPass } from "./PhotoPass";
import type { ShadowRig } from "./ShadowRig";

/** Shared services every scene component needs. */
export interface SceneContext {
  scene: Scene;
  materials: MaterialLibrary;
  shadows: ShadowRig;
  quality: QualityManager;
  interior: InteriorLighting;
  /** Draws the photos of the pieces with their true colours (after the post-processing). */
  photos: PhotoPass;
}
