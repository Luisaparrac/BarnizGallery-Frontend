/** 2D value noise with fractal Brownian motion, used for terrain and foliage. */
export class ValueNoise {
  private readonly perm: Uint8Array;

  constructor(seed = 1) {
    this.perm = new Uint8Array(512);
    const base = Array.from({ length: 256 }, (_, i) => i);
    let s = seed >>> 0;
    for (let i = 255; i > 0; i--) {
      s = (s * 1664525 + 1013904223) >>> 0;
      const j = s % (i + 1);
      [base[i], base[j]] = [base[j], base[i]];
    }
    for (let i = 0; i < 512; i++) this.perm[i] = base[i & 255];
  }

  private lattice(ix: number, iy: number): number {
    return this.perm[(this.perm[ix & 255] + iy) & 255] / 255;
  }

  /** Smoothly interpolated noise in [0, 1]. */
  sample(x: number, y: number): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const u = fx * fx * (3 - 2 * fx);
    const v = fy * fy * (3 - 2 * fy);
    const a = this.lattice(ix, iy);
    const b = this.lattice(ix + 1, iy);
    const c = this.lattice(ix, iy + 1);
    const d = this.lattice(ix + 1, iy + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  /** Sum of octaves, normalised to [0, 1]. */
  fbm(x: number, y: number, octaves = 5, lacunarity = 2, gain = 0.5): number {
    let amplitude = 0.5;
    let frequency = 1;
    let sum = 0;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += this.sample(x * frequency, y * frequency) * amplitude;
      norm += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }
    return sum / norm;
  }
}
