import { Signal } from "./Signal";

export type QualityLevel = "low" | "medium" | "high";

export interface QualitySettings {
  shadowMapSize: number;
  shadowCascades: number;
  msaaSamples: number;
  bloom: boolean;
  ssao: boolean;
  godRays: boolean;
  /** Divisor applied to the device pixel ratio (1 = native resolution). */
  hardwareScaling: number;
}

const PRESETS: Record<QualityLevel, QualitySettings> = {
  low: { shadowMapSize: 1024, shadowCascades: 2, msaaSamples: 1, bloom: false, ssao: false, godRays: false, hardwareScaling: 1.5 },
  medium: { shadowMapSize: 2048, shadowCascades: 3, msaaSamples: 4, bloom: true, ssao: false, godRays: false, hardwareScaling: 1 },
  high: { shadowMapSize: 4096, shadowCascades: 4, msaaSamples: 4, bloom: true, ssao: true, godRays: true, hardwareScaling: 1 },
};

const ORDER: QualityLevel[] = ["low", "medium", "high"];

/**
 * Holds the active graphics preset and lowers it automatically when the frame rate stays low.
 * Override with `?quality=low|medium|high` in the URL.
 */
export class QualityManager {
  readonly changed = new Signal<QualityLevel>();
  private current: QualityLevel;
  private readonly locked: boolean;
  private slowSeconds = 0;
  private frames = 0;
  private elapsed = 0;

  constructor(requested: string | null) {
    const forced = ORDER.find((level) => level === requested);
    this.locked = !!forced;
    this.current = forced ?? "high";
  }

  get level(): QualityLevel {
    return this.current;
  }

  get settings(): QualitySettings {
    return PRESETS[this.current];
  }

  /** Call once per frame; steps the preset down after ~4 s below 28 fps. */
  trackFrame(dtSeconds: number): void {
    if (this.locked || this.current === "low") return;
    this.frames++;
    this.elapsed += dtSeconds;
    if (this.elapsed < 1) return;
    const fps = this.frames / this.elapsed;
    this.frames = 0;
    this.elapsed = 0;
    this.slowSeconds = fps < 28 ? this.slowSeconds + 1 : 0;
    if (this.slowSeconds >= 4) {
      this.slowSeconds = 0;
      this.current = ORDER[ORDER.indexOf(this.current) - 1];
      this.changed.emit(this.current);
    }
  }
}
