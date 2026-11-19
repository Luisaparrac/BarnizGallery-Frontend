import { DynamicTexture, Texture, type Scene } from "@babylonjs/core";
import { SeededRandom } from "../../../art/SeededRandom";

/** A rectangle of the atlas in UV space (v grows upwards, as Babylon reads it). */
export interface AtlasRegion {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

/** Paints one region; the top of the region is the top of the mesh it covers (v = 1). */
export type RegionPainter = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

/**
 * One texture per avatar with every color and pattern it wears (solid swatches, stripes,
 * borders). All its parts share one material, so each moving group can be merged into a
 * single mesh. Every region gets a faint wood grain, like a varnished carving.
 */
export class AvatarAtlas {
  private static readonly SIZE = 1024;
  private static readonly GUTTER = 4;
  private static readonly SWATCH = 24;

  readonly texture: DynamicTexture;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly swatches = new Map<string, AtlasRegion>();
  private readonly random: SeededRandom;
  private cursorX = 0;
  private cursorY = 0;
  private rowHeight = 0;

  constructor(scene: Scene, name: string, seed: number) {
    const size = AvatarAtlas.SIZE;
    this.texture = new DynamicTexture(`${name}-atlas`, { width: size, height: size }, scene, true);
    this.texture.wrapU = Texture.CLAMP_ADDRESSMODE;
    this.texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    this.texture.anisotropicFilteringLevel = 4;
    this.ctx = this.texture.getContext() as unknown as CanvasRenderingContext2D;
    this.ctx.fillStyle = "#808080";
    this.ctx.fillRect(0, 0, size, size);
    this.random = new SeededRandom(seed);
  }

  /** A plain color (shared by every part that asks for the same one). */
  solid(color: string): AtlasRegion {
    const cached = this.swatches.get(color);
    if (cached) return cached;
    const region = this.paint(AvatarAtlas.SWATCH, AvatarAtlas.SWATCH, (ctx, width, height) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, width, height);
    });
    this.swatches.set(color, region);
    return region;
  }

  /** A free region painted by the avatar itself (borders, woven bands, faces of the costume). */
  paint(width: number, height: number, painter: RegionPainter, grain = true): AtlasRegion {
    const gutter = AvatarAtlas.GUTTER;
    const outerW = width + gutter * 2;
    const outerH = height + gutter * 2;
    if (this.cursorX + outerW > AvatarAtlas.SIZE) {
      this.cursorX = 0;
      this.cursorY += this.rowHeight;
      this.rowHeight = 0;
    }
    if (this.cursorY + outerH > AvatarAtlas.SIZE) throw new Error("The avatar atlas is full");
    const x = this.cursorX + gutter;
    const y = this.cursorY + gutter;
    this.cursorX += outerW;
    this.rowHeight = Math.max(this.rowHeight, outerH);

    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();
    ctx.translate(x, y);
    painter(ctx, width, height);
    if (grain) this.grain(width, height);
    ctx.restore();
    this.extendEdges(x, y, width, height);

    // The UVs stay half a pixel inside, so filtering never reads the neighbours.
    const size = AvatarAtlas.SIZE;
    return {
      u0: (x + 0.5) / size,
      u1: (x + width - 0.5) / size,
      v0: 1 - (y + height - 0.5) / size,
      v1: 1 - (y + 0.5) / size,
    };
  }

  /** Short dark fibers over a painted region, for wool and woven cloth. */
  fibers(ctx: CanvasRenderingContext2D, width: number, height: number, density = 0.05, alpha = 0.12): void {
    const count = Math.ceil(width * height * density);
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = `rgba(0,0,0,${this.random.next() * alpha})`;
      ctx.fillRect(this.random.next() * width, this.random.next() * height, 1, 2);
    }
  }

  /** Uploads the painted canvas; call it once, after the last region. */
  commit(): void {
    this.texture.update(true);
  }

  /** Fine streaks and a soft light-to-dark gradient, like the grain under a varnish. */
  private grain(width: number, height: number): void {
    const ctx = this.ctx;
    const count = Math.ceil((width * height) / 90);
    for (let i = 0; i < count; i++) {
      const light = this.random.next() > 0.5;
      ctx.fillStyle = light ? `rgba(255,240,215,${this.random.next() * 0.06})` : `rgba(30,15,5,${this.random.next() * 0.07})`;
      ctx.fillRect(this.random.next() * width, this.random.next() * height, 1, 2 + this.random.next() * 5);
    }
  }

  /** Copies the border pixels into the gutter so mipmaps do not bleed other colors in. */
  private extendEdges(x: number, y: number, width: number, height: number): void {
    const ctx = this.ctx;
    const canvas = ctx.canvas as unknown as CanvasImageSource;
    const g = AvatarAtlas.GUTTER;
    ctx.drawImage(canvas, x, y, width, 1, x, y - g, width, g);
    ctx.drawImage(canvas, x, y + height - 1, width, 1, x, y + height, width, g);
    ctx.drawImage(canvas, x, y - g, 1, height + g * 2, x - g, y - g, g, height + g * 2);
    ctx.drawImage(canvas, x + width - 1, y - g, 1, height + g * 2, x + width, y - g, g, height + g * 2);
  }
}
