import { CascadedShadowGenerator, ShadowGenerator, type AbstractMesh, type DirectionalLight } from "@babylonjs/core";
import type { QualitySettings } from "../core/QualityManager";

/** Cascaded shadow maps for the sun: sharp near the visitor, soft far away. */
export class ShadowRig {
  private readonly generator: CascadedShadowGenerator;

  constructor(sun: DirectionalLight, settings: QualitySettings) {
    this.generator = new CascadedShadowGenerator(settings.shadowMapSize, sun);
    this.generator.numCascades = settings.shadowCascades;
    this.generator.lambda = 0.8;
    this.generator.shadowMaxZ = 170;
    this.generator.stabilizeCascades = true;
    this.generator.cascadeBlendPercentage = 0.12;
    this.generator.autoCalcDepthBounds = false;
    this.generator.usePercentageCloserFiltering = true;
    this.generator.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
    this.generator.bias = 0.0012;
    this.generator.normalBias = 0.025;
    this.generator.darkness = 0.28;
    this.generator.transparencyShadow = false;
  }

  addCaster(mesh: AbstractMesh): void {
    this.generator.addShadowCaster(mesh, true);
  }

  receive(mesh: AbstractMesh): void {
    mesh.receiveShadows = true;
  }
}
