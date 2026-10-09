import type { Scene } from "@babylonjs/core";
import type { QualityManager } from "../core/QualityManager";
import type { MaterialLibrary } from "./MaterialLibrary";
import type { ShadowRig } from "./ShadowRig";

/** Shared services every scene component needs. */
export interface SceneContext {
  scene: Scene;
  materials: MaterialLibrary;
  shadows: ShadowRig;
  quality: QualityManager;
}
