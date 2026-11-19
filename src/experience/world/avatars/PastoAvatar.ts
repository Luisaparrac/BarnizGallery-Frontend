import type { AvatarContext } from "../AvatarFactory";
import type { AvatarBody, MotionStyle } from "./AvatarTypes";
import { BarnizPalette as P } from "./BarnizPalette";
import { ProceduralAvatar } from "./ProceduralAvatar";

const SKIN = "#94603f";
const HAIR = "#15100d";
const WOOL = "#33251d";
const FELT = "#2b211c";
const CANVAS = "#ddd0b4";

/**
 * "indigena": a man of the Pastos people of Nariño in a short woven ruana with chumbe-style
 * geometric bands and the Sun of the Pastos on the chest, a woven sash, dark trousers,
 * alpargatas and a felt hat.
 */
export class PastoAvatar extends ProceduralAvatar {
  constructor(context: AvatarContext) {
    super(context, "indigena", 31);
  }

  protected override proportions(): Partial<AvatarBody> {
    return { shoulderWidth: 0.185 };
  }

  protected override motionStyle(): Partial<MotionStyle> {
    return { armSpread: 0.11, runElbow: 0.7 };
  }

  /** Dark trousers and cream alpargatas tied with dark laces. */
  protected buildLegs(): void {
    for (const side of [-1, 1] as const) {
      this.carveLeg(side, P.DARK_CLOTH, CANVAS, "#3b2a1e", 0.08);
      const x = side * this.body.hipWidth;
      const knee = side < 0 ? "kneeL" : "kneeR";
      this.parts.torus(knee, this.atlas.solid(P.BLACK), [x, 0.12, -0.005], 0.1, 0.01, 14);
    }
  }

  /** Trousers and the woven sash (faja) that shows under the short ruana. */
  protected buildHips(): void {
    this.parts.sphere("hips", this.atlas.solid(P.DARK_CLOTH), [0, 0.93, 0], 0.34, [1, 0.62, 0.74], 18);
    const sash = this.atlas.paint(192, 32, (ctx, w, h) => {
      ctx.fillStyle = P.RED;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = P.BLACK;
      ctx.fillRect(0, 0, w, 3);
      ctx.fillRect(0, h - 3, w, 3);
      PastoAvatar.rhombusChain(ctx, 0, 4, w, h - 8, 12, P.CREAM, P.GREEN);
    });
    this.parts.cylinder("hips", sash, [0, 0.95, 0], 0.085, 0.36, 0.34, 32).scaling.z = 0.78;
    // The tied ends hang at the left side.
    for (const offset of [-0.02, 0.02]) {
      this.parts.capsule("hips", sash, [-0.16 + offset, 0.93, 0.05], [-0.17 + offset * 1.5, 0.74, 0.07], 0.022, 0.018);
      this.parts.capsule("hips", this.atlas.solid(P.OCHRE), [-0.17 + offset * 1.5, 0.74, 0.07], [-0.172 + offset * 1.5, 0.69, 0.072], 0.012, 0.008);
    }
  }

  protected buildTorso(): void {
    const shirt = this.atlas.solid(P.WHITE);
    this.parts
      .lathe("spine", shirt, [0, 0, 0], [[0, 0.95], [0.16, 0.97], [0.175, 1.12], [0.18, 1.28], [0.165, 1.36], [0.1, 1.44], [0, 1.45]], { tessellation: 24 })
      .scaling.z = 0.76;
    this.parts.cylinder("spine", shirt, [0, 1.475, 0.005], 0.045, 0.14, 0.118, 18);

    const ruana = this.atlas.paint(256, 128, (ctx, w, h) => {
      ctx.fillStyle = WOOL;
      ctx.fillRect(0, 0, w, h);
      // Woven columns of rhombuses, like the patterns of a chumbe, between thin red lines.
      const columns = 8;
      const column = w / columns;
      for (let i = 0; i < columns; i++) {
        const x = i * column + column * 0.3;
        const width = column * 0.4;
        ctx.fillStyle = P.RED;
        ctx.fillRect(x - 3, 0, 2, h);
        ctx.fillRect(x + width + 1, 0, 2, h);
        PastoAvatar.rhombusColumn(ctx, x, 0, width, h - 16, i % 2 ? P.OCHRE : P.CREAM, i % 2 ? P.RED : P.GREEN);
      }
      // Zigzag border along the hem.
      ctx.fillStyle = P.CREAM;
      ctx.fillRect(0, h - 16, w, 16);
      ctx.fillStyle = P.RED;
      ctx.beginPath();
      ctx.moveTo(0, h - 3);
      for (let x = 0; x <= w; x += 8) ctx.lineTo(x, (x / 8) % 2 ? h - 13 : h - 3);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.fill();
      this.atlas.fibers(ctx, w, h, 0.04, 0.2);
      // The Sun of the Pastos on the chest and on the back (u = 0.25 is the front).
      for (const u of [0.25, 0.75]) PastoAvatar.pastoSun(ctx, u * w, h * 0.45, 20);
    });
    this.carveRuana(ruana, [P.CREAM, P.RED, P.OCHRE], 0.99, 0.14);
  }

  protected buildArms(): void {
    for (const side of [-1, 1] as const) this.carveArm(side, P.WHITE, SKIN, P.WHITE, 0.05);
  }

  protected buildHead(): void {
    this.carveHead(SKIN);
    const y = this.body.headHeight;
    const hair = this.atlas.solid(HAIR);
    this.parts.sphere("head", hair, [0, y + 0.012, -0.028], this.body.headSize + 0.012, [0.94, 1.02, 0.93], 20);
    for (const side of [-1, 1]) {
      this.parts.capsule("head", hair, [side * 0.022, y + 0.036, 0.104], [side * 0.062, y + 0.036, 0.094], 0.007, 0.006);
    }
  }

  /** Dark felt hat with a rounded crown and a woven band. */
  protected buildHeadwear(): void {
    const y = this.body.headHeight;
    const felt = this.atlas.solid(FELT);
    this.parts.lathe(
      "head",
      felt,
      [0, y, 0],
      [
        [0, 0.082],
        [0.15, 0.08],
        [0.215, 0.072],
        [0.228, 0.08],
        [0.215, 0.088],
        [0.15, 0.093],
        [0.128, 0.094],
        [0.13, 0.15],
        [0.118, 0.195],
        [0.08, 0.215],
        [0, 0.218],
      ],
      { tessellation: 40, doubleSided: true },
    );
    const band = this.atlas.paint(96, 16, (ctx, w, h) => {
      ctx.fillStyle = P.RED;
      ctx.fillRect(0, 0, w, h);
      PastoAvatar.rhombusChain(ctx, 0, 2, w, h - 4, 8, P.OCHRE, P.GREEN);
    });
    this.parts.cylinder("head", band, [0, y + 0.112, 0], 0.03, 0.266, 0.262, 32);
  }

  // ---------------------------------------------------------------- woven patterns

  /** A horizontal chain of rhombuses with a dot in the middle of each one. */
  private static rhombusChain(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, count: number, color: string, dot: string): void {
    const size = width / count;
    for (let i = 0; i < count; i++) {
      const cx = x + i * size + size / 2;
      const cy = y + height / 2;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.lineTo(cx + size / 2, cy);
      ctx.lineTo(cx, y + height);
      ctx.lineTo(cx - size / 2, cy);
      ctx.fill();
      ctx.fillStyle = dot;
      ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
    }
  }

  /** A vertical column of stacked rhombuses. */
  private static rhombusColumn(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, color: string, dot: string): void {
    const count = Math.max(1, Math.round(height / width));
    const size = height / count;
    for (let i = 0; i < count; i++) {
      const cx = x + width / 2;
      const cy = y + i * size + size / 2;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(cx, cy - size / 2);
      ctx.lineTo(x + width, cy);
      ctx.lineTo(cx, cy + size / 2);
      ctx.lineTo(x, cy);
      ctx.fill();
      ctx.fillStyle = dot;
      ctx.fillRect(cx - 2, cy - 2, 4, 4);
    }
  }

  /** The eight-armed Sun of the Pastos: a ring of hooked rays around a small center. */
  private static pastoSun(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = P.OCHRE;
    for (let i = 0; i < 8; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 4);
      ctx.fillRect(-2.5, -radius, 5, radius * 0.6);
      ctx.fillRect(-2.5, -radius, radius * 0.35, 5);
      ctx.restore();
    }
    ctx.fillStyle = P.RED;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = P.CREAM;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
