import {
  Color4,
  DefaultRenderingPipeline,
  ImageProcessingConfiguration,
  SSAO2RenderingPipeline,
  Texture,
  VolumetricLightScatteringPostProcess,
  type Camera,
  type Mesh,
  type Scene,
} from "@babylonjs/core";
import type { QualityManager } from "../core/QualityManager";

/** Anti-aliasing, tone mapping, bloom, ambient occlusion and sun shafts, scaled by the quality preset. */
export class PostProcessing {
  private pipeline: DefaultRenderingPipeline | null = null;
  private ssao: SSAO2RenderingPipeline | null = null;
  private godRays: VolumetricLightScatteringPostProcess | null = null;

  constructor(
    private readonly scene: Scene,
    private readonly camera: Camera,
    private readonly quality: QualityManager,
    private readonly sunDisc: Mesh,
  ) {
    this.build();
    quality.changed.subscribe(() => this.rebuild());
  }

  private rebuild(): void {
    this.dispose();
    this.build();
  }

  private build(): void {
    const settings = this.quality.settings;
    const pipeline = new DefaultRenderingPipeline("default", true, this.scene, [this.camera]);
    pipeline.samples = settings.msaaSamples;
    pipeline.fxaaEnabled = settings.msaaSamples <= 1;
    pipeline.bloomEnabled = settings.bloom;
    pipeline.bloomThreshold = 0.82;
    pipeline.bloomWeight = 0.28;
    pipeline.bloomKernel = 56;
    pipeline.bloomScale = 0.5;
    pipeline.sharpenEnabled = true;
    pipeline.sharpen.edgeAmount = 0.22;
    pipeline.imageProcessingEnabled = true;

    const processing = pipeline.imageProcessing;
    processing.toneMappingEnabled = true;
    processing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
    processing.exposure = 1.0;
    processing.contrast = 1.12;
    processing.vignetteEnabled = true;
    processing.vignetteWeight = 1.6;
    processing.vignetteStretch = 0.4;
    processing.vignetteColor = new Color4(0.08, 0.03, 0.01, 0);
    processing.vignetteBlendMode = ImageProcessingConfiguration.VIGNETTEMODE_MULTIPLY;
    this.pipeline = pipeline;

    if (settings.ssao) {
      const ssao = new SSAO2RenderingPipeline("ssao", this.scene, { ssaoRatio: 0.6, blurRatio: 1 }, [this.camera]);
      ssao.radius = 2.2;
      ssao.totalStrength = 0.9;
      ssao.expensiveBlur = false;
      ssao.samples = 12;
      ssao.maxZ = 120;
      this.ssao = ssao;
    }

    if (settings.godRays) {
      const rays = new VolumetricLightScatteringPostProcess(
        "godRays",
        0.8,
        this.camera,
        this.sunDisc,
        60,
        Texture.BILINEAR_SAMPLINGMODE,
        this.scene.getEngine(),
        false,
      );
      rays.exposure = 0.16;
      rays.decay = 0.965;
      rays.weight = 0.45;
      rays.density = 0.8;
      this.godRays = rays;
    }
  }

  private dispose(): void {
    this.godRays?.dispose(this.camera);
    this.ssao?.dispose();
    this.pipeline?.dispose();
    this.godRays = this.ssao = this.pipeline = null;
  }
}
