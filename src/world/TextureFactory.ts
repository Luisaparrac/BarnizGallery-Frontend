import { DynamicTexture, Scene, Texture } from "@babylonjs/core";
import { SeededRandom } from "../core/SeededRandom";
import { ValueNoise } from "../core/ValueNoise";
import { NormalMapBuilder } from "./NormalMapBuilder";

export interface TextureSet {
  albedo: DynamicTexture;
  normal: DynamicTexture;
}

type Painter = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

/** Paints every procedural texture of the world with the 2D canvas (no image files needed). */
export class TextureFactory {
  constructor(private readonly scene: Scene) {}

  private canvasTexture(width: number, height: number, paint: Painter): DynamicTexture {
    const texture = new DynamicTexture("procedural", { width, height }, this.scene, true);
    paint(texture.getContext() as unknown as CanvasRenderingContext2D, width, height);
    texture.update(true);
    texture.wrapU = Texture.WRAP_ADDRESSMODE;
    texture.wrapV = Texture.WRAP_ADDRESSMODE;
    texture.anisotropicFilteringLevel = 8;
    return texture;
  }

  /** Albedo painted by `paint` plus a normal map computed from its brightness. */
  private textureSet(width: number, height: number, paint: Painter, bumpStrength: number): TextureSet {
    const albedo = this.canvasTexture(width, height, paint);
    const source = (albedo.getContext() as unknown as CanvasRenderingContext2D).getImageData(0, 0, width, height);
    const normal = this.canvasTexture(width, height, (ctx) => ctx.putImageData(NormalMapBuilder.fromAlbedo(source, bumpStrength), 0, 0));
    return { albedo, normal };
  }

  /** Warm river-stone cobbles, seamless. */
  cobblestone(): TextureSet {
    return this.textureSet(
      1024,
      1024,
      (ctx) => {
        const random = new SeededRandom(7);
        ctx.fillStyle = "#2f241b";
        ctx.fillRect(0, 0, 1024, 1024);
        const cell = 64;
        for (let y = 0; y < 1024; y += cell) {
          for (let x = 0; x < 1024; x += cell) {
            const offset = (y / cell) % 2 ? cell / 2 : 0;
            const color = `hsl(${26 + random.next() * 12} ${18 + random.next() * 14}% ${46 + random.next() * 20}%)`;
            const px = x + offset + 3 + random.next() * 4;
            const py = y + 3 + random.next() * 4;
            const w = cell - 8 - random.next() * 6;
            const h = cell - 8 - random.next() * 6;
            for (const dx of px + w > 1024 ? [0, -1024] : [0]) {
              const gradient = ctx.createLinearGradient(px + dx, py, px + dx, py + h);
              gradient.addColorStop(0, "rgba(255,238,205,0.22)");
              gradient.addColorStop(0.5, "rgba(0,0,0,0)");
              gradient.addColorStop(1, "rgba(20,10,0,0.28)");
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.roundRect(px + dx, py, w, h, 18);
              ctx.fill();
              ctx.fillStyle = gradient;
              ctx.fill();
            }
          }
        }
      },
      2.6,
    );
  }

  /**
   * Unique paving of the central plaza: limestone flags with a Mopa-Mopa inspired rosette around the fountain.
   * The canvas covers the whole plaza, so `fountainU/fountainV` are the fountain position in 0..1 (v=1 is north).
   */
  plazaPaving(width: number, height: number, fountainU: number, fountainV: number, metersPerPixel: number): TextureSet {
    return this.textureSet(
      width,
      height,
      (ctx) => {
        const random = new SeededRandom(21);
        ctx.fillStyle = "#6f604f";
        ctx.fillRect(0, 0, width, height);
        const flag = 1.2 / metersPerPixel;
        for (let y = 0; y < height; y += flag) {
          for (let x = 0; x < width; x += flag) {
            ctx.fillStyle = `hsl(${34 + random.next() * 8} ${14 + random.next() * 10}% ${70 + random.next() * 10}%)`;
            ctx.fillRect(x + 2, y + 2, flag - 4, flag - 4);
            for (let i = 0; i < 14; i++) {
              ctx.fillStyle = `rgba(80,60,40,${0.03 + random.next() * 0.05})`;
              ctx.fillRect(x + random.next() * flag, y + random.next() * flag, 2 + random.next() * 4, 2 + random.next() * 4);
            }
          }
        }
        this.paintRosette(ctx, fountainU * width, (1 - fountainV) * height, 14 / metersPerPixel);
        this.paintBorder(ctx, width, height, 1.6 / metersPerPixel);
      },
      3.2,
    );
  }

  private paintRosette(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number): void {
    const palette = { red: "#8c2a1f", green: "#2f5d3a", gold: "#c8922f", black: "#1d1512", cream: "#eadcb8" };
    const ring = (inner: number, outer: number, color: string) => {
      ctx.beginPath();
      ctx.arc(cx, cy, outer, 0, Math.PI * 2);
      ctx.arc(cx, cy, inner, 0, Math.PI * 2, true);
      ctx.fillStyle = color;
      ctx.fill();
    };
    ring(radius * 0.97, radius, palette.black);
    ring(radius * 0.86, radius * 0.97, palette.cream);
    // Outer garland: 32 leaf-shaped petals alternating green and red.
    for (let i = 0; i < 32; i++) {
      const angle = (i / 32) * Math.PI * 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.fillStyle = i % 2 ? palette.green : palette.red;
      ctx.beginPath();
      ctx.moveTo(radius * 0.7, 0);
      ctx.quadraticCurveTo(radius * 0.8, radius * 0.06, radius * 0.9, 0);
      ctx.quadraticCurveTo(radius * 0.8, -radius * 0.06, radius * 0.7, 0);
      ctx.fill();
      ctx.restore();
    }
    ring(radius * 0.66, radius * 0.68, palette.gold);
    // Main rosette: 16 large petals.
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.fillStyle = i % 2 ? palette.red : palette.green;
      ctx.beginPath();
      ctx.moveTo(radius * 0.3, 0);
      ctx.bezierCurveTo(radius * 0.4, radius * 0.17, radius * 0.56, radius * 0.1, radius * 0.64, 0);
      ctx.bezierCurveTo(radius * 0.56, -radius * 0.1, radius * 0.4, -radius * 0.17, radius * 0.3, 0);
      ctx.fill();
      ctx.strokeStyle = palette.gold;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
    ring(radius * 0.27, radius * 0.3, palette.black);
    ring(radius * 0.2, radius * 0.27, palette.gold);
    // Centre disc is hidden under the fountain basin; keep it dark.
    ring(0, radius * 0.2, palette.black);
  }

  private paintBorder(ctx: CanvasRenderingContext2D, width: number, height: number, band: number): void {
    ctx.fillStyle = "#1d1512";
    ctx.fillRect(0, 0, width, band);
    ctx.fillRect(0, height - band, width, band);
    ctx.fillRect(0, 0, band, height);
    ctx.fillRect(width - band, 0, band, height);
    ctx.strokeStyle = "#c8922f";
    ctx.lineWidth = band * 0.12;
    ctx.strokeRect(band * 0.5, band * 0.5, width - band, height - band);
    // Greca-style stepped motif along the border.
    const step = band * 0.55;
    ctx.fillStyle = "#8c2a1f";
    for (let x = band; x < width - band; x += step * 2) {
      ctx.fillRect(x, band * 0.28, step, band * 0.2);
      ctx.fillRect(x, height - band * 0.48, step, band * 0.2);
    }
    for (let y = band; y < height - band; y += step * 2) {
      ctx.fillRect(band * 0.28, y, band * 0.2, step);
      ctx.fillRect(width - band * 0.48, y, band * 0.2, step);
    }
  }

  /** Speckled mineral surface (plaster, limestone). */
  speckled(base: string, seed: number, bumpStrength = 1.4): TextureSet {
    return this.textureSet(
      512,
      512,
      (ctx) => {
        const random = new SeededRandom(seed);
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 3500; i++) {
          const dark = random.next() > 0.45;
          ctx.fillStyle = dark ? `rgba(90,70,45,${0.02 + random.next() * 0.05})` : `rgba(255,250,235,${0.03 + random.next() * 0.05})`;
          const size = 2 + random.next() * 16;
          ctx.fillRect(random.next() * 512, random.next() * 512, size, size);
        }
        // Stains running down from the top edge.
        for (let i = 0; i < 18; i++) {
          const x = random.next() * 512;
          const gradient = ctx.createLinearGradient(0, 0, 0, 160 + random.next() * 200);
          gradient.addColorStop(0, "rgba(80,60,40,0.10)");
          gradient.addColorStop(1, "rgba(80,60,40,0)");
          ctx.fillStyle = gradient;
          ctx.fillRect(x, 0, 6 + random.next() * 24, 360);
        }
      },
      bumpStrength,
    );
  }

  wood(base: string, seed = 11): TextureSet {
    return this.textureSet(
      512,
      512,
      (ctx) => {
        const random = new SeededRandom(seed);
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 260; i++) {
          ctx.strokeStyle = `rgba(20,10,5,${0.08 + random.next() * 0.2})`;
          ctx.lineWidth = 0.8 + random.next() * 2.2;
          const y = random.next() * 512;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.bezierCurveTo(150, y + (random.next() - 0.5) * 14, 360, y + (random.next() - 0.5) * 14, 512, y + (random.next() - 0.5) * 6);
          ctx.stroke();
        }
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = "rgba(25,12,6,0.35)";
          ctx.beginPath();
          ctx.ellipse(random.next() * 512, random.next() * 512, 6 + random.next() * 8, 3 + random.next() * 4, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      },
      2.2,
    );
  }

  /** Spanish clay roof tiles (teja): barrel-shaped columns in overlapping rows. */
  roofTiles(): TextureSet {
    return this.textureSet(
      512,
      512,
      (ctx) => {
        const random = new SeededRandom(33);
        const column = 32;
        const row = 64;
        for (let y = 0; y < 512; y += row) {
          for (let x = 0; x < 512; x += column) {
            const hue = 14 + random.next() * 10;
            const light = 36 + random.next() * 12;
            ctx.fillStyle = `hsl(${hue} 58% ${light}%)`;
            ctx.fillRect(x, y, column, row);
            const barrel = ctx.createLinearGradient(x, 0, x + column, 0);
            barrel.addColorStop(0, "rgba(30,8,0,0.55)");
            barrel.addColorStop(0.5, "rgba(255,200,150,0.18)");
            barrel.addColorStop(1, "rgba(30,8,0,0.55)");
            ctx.fillStyle = barrel;
            ctx.fillRect(x, y, column, row);
            const overlap = ctx.createLinearGradient(0, y, 0, y + row);
            overlap.addColorStop(0, "rgba(255,210,170,0.15)");
            overlap.addColorStop(0.82, "rgba(0,0,0,0)");
            overlap.addColorStop(1, "rgba(20,5,0,0.7)");
            ctx.fillStyle = overlap;
            ctx.fillRect(x, y, column, row);
            if (random.next() > 0.82) {
              ctx.fillStyle = "rgba(70,95,45,0.28)";
              ctx.fillRect(x + random.next() * 10, y + random.next() * 40, 8 + random.next() * 14, 6 + random.next() * 10);
            }
          }
        }
      },
      3,
    );
  }

  /** Striped wool of the artisan's ruana. */
  wool(): TextureSet {
    return this.textureSet(
      256,
      256,
      (ctx) => {
        const stripes = ["#8c2a1f", "#1d1512", "#c8922f", "#1d1512", "#8c2a1f", "#2f5d3a"];
        const width = 256 / stripes.length;
        stripes.forEach((color, i) => {
          ctx.fillStyle = color;
          ctx.fillRect(i * width, 0, width + 1, 256);
        });
        const random = new SeededRandom(5);
        for (let i = 0; i < 2600; i++) {
          ctx.fillStyle = `rgba(255,255,255,${random.next() * 0.07})`;
          ctx.fillRect(random.next() * 256, random.next() * 256, 1, 3);
          ctx.fillStyle = `rgba(0,0,0,${random.next() * 0.1})`;
          ctx.fillRect(random.next() * 256, random.next() * 256, 1, 3);
        }
      },
      1.6,
    );
  }

  straw(): TextureSet {
    return this.textureSet(
      256,
      256,
      (ctx) => {
        const random = new SeededRandom(9);
        ctx.fillStyle = "#d9b877";
        ctx.fillRect(0, 0, 256, 256);
        for (let y = 0; y < 256; y += 3) {
          ctx.strokeStyle = `rgba(120,80,30,${0.15 + random.next() * 0.25})`;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(256, y + (random.next() - 0.5) * 2);
          ctx.stroke();
        }
      },
      2,
    );
  }

  /** Red and cream awning cloth. */
  stripedCloth(): TextureSet {
    return this.textureSet(
      256,
      256,
      (ctx) => {
        for (let i = 0; i < 8; i++) {
          ctx.fillStyle = i % 2 ? "#eadcb8" : "#8c2a1f";
          ctx.fillRect(i * 32, 0, 32, 256);
        }
        const random = new SeededRandom(2);
        for (let i = 0; i < 2000; i++) {
          ctx.fillStyle = `rgba(0,0,0,${random.next() * 0.06})`;
          ctx.fillRect(random.next() * 256, random.next() * 256, 2, 1);
        }
      },
      1.2,
    );
  }

  /** Painted board with one or two lines of lettering. */
  sign(lines: string[], width = 768, height = 192): DynamicTexture {
    return this.canvasTexture(width, height, (ctx) => {
      const wood = ctx.createLinearGradient(0, 0, 0, height);
      wood.addColorStop(0, "#3a2016");
      wood.addColorStop(1, "#24130c");
      ctx.fillStyle = wood;
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "#c8922f";
      ctx.lineWidth = Math.max(3, height * 0.03);
      ctx.strokeRect(height * 0.07, height * 0.07, width - height * 0.14, height * 0.86);
      ctx.fillStyle = "#f3dfae";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const serif = '"Cormorant Garamond", Georgia, serif';
      if (lines.length === 1) {
        ctx.font = `600 ${Math.round(height * 0.44)}px ${serif}`;
        ctx.fillText(lines[0], width / 2, height / 2);
      } else {
        ctx.font = `600 ${Math.round(height * 0.34)}px ${serif}`;
        ctx.fillText(lines[0], width / 2, height * 0.4);
        ctx.font = `500 ${Math.round(height * 0.21)}px ${serif}`;
        ctx.fillStyle = "#e6c98a";
        ctx.fillText(lines[1], width / 2, height * 0.72);
      }
    });
  }

  /** Soft ripples used as the fountain water's bump map. */
  waterRipples(): DynamicTexture {
    return this.canvasTexture(256, 256, (ctx, width, height) => {
      const noise = new ValueNoise(4);
      const image = ctx.createImageData(width, height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const value = noise.fbm((x / width) * 8, (y / height) * 8, 4);
          const i = (y * width + x) * 4;
          image.data[i] = image.data[i + 1] = image.data[i + 2] = value * 255;
          image.data[i + 3] = 255;
        }
      }
      ctx.putImageData(NormalMapBuilder.fromAlbedo(image, 5), 0, 0);
    });
  }

  /** Soft round sprite for the fountain spray. */
  dropSprite(): DynamicTexture {
    const texture = this.canvasTexture(64, 64, (ctx) => {
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
    });
    texture.hasAlpha = true;
    return texture;
  }
}
