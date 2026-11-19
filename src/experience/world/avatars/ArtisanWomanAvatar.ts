import type { AvatarContext } from "../AvatarFactory";
import type { AvatarBody, MotionStyle } from "./AvatarTypes";
import { BarnizPalette as P } from "./BarnizPalette";
import { ProceduralAvatar } from "./ProceduralAvatar";

const SKIN = "#a8714f";
const HAIR = "#241612";
const SKIRT = "#2a2236";

/**
 * "artesana": a woman of about 40 with a long braid, an embroidered blouse, a long dark
 * skirt, a red and green shawl and an apron with a geometric Barniz border.
 */
export class ArtisanWomanAvatar extends ProceduralAvatar {
  constructor(context: AvatarContext) {
    super(context, "artesana", 40);
  }

  protected override proportions(): Partial<AvatarBody> {
    return { shoulderWidth: 0.17, hipWidth: 0.085, headSize: 0.225, headHeight: 1.6, neckHeight: 1.46 };
  }

  protected override motionStyle(): Partial<MotionStyle> {
    return { armSpread: 0.1, stride: 0.6, runElbow: 0.9 };
  }

  protected buildLegs(): void {
    for (const side of [-1, 1] as const) this.carveLeg(side, "#2e2421", "#1f1714", P.SOLE, 0.07);
  }

  /** Long skirt with two bands near the hem, and the apron over it. */
  protected buildHips(): void {
    const skirt = this.atlas.paint(128, 128, (ctx, w, h) => {
      ctx.fillStyle = SKIRT;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = P.RED;
      ctx.fillRect(0, h - 16, w, 4);
      ctx.fillStyle = P.OCHRE;
      ctx.fillRect(0, h - 9, w, 2);
      this.atlas.fibers(ctx, w, h, 0.04, 0.2);
    });
    this.parts
      .lathe("hips", skirt, [0, 0, 0], [[0, 0.3], [0.33, 0.3], [0.31, 0.45], [0.265, 0.68], [0.215, 0.86], [0.175, 0.98], [0.155, 1.03], [0, 1.04]], {
        tessellation: 40,
        doubleSided: true,
      })
      .scaling.z = 0.88;

    const apron = this.atlas.paint(128, 128, (ctx, w, h) => {
      ctx.fillStyle = P.CREAM;
      ctx.fillRect(0, 0, w, h);
      // Geometric border: a band of stepped diamonds between two lines, like a Barniz frieze.
      const band = 26;
      ctx.fillStyle = P.BLACK;
      ctx.fillRect(0, h - band - 4, w, 3);
      ctx.fillRect(0, h - 3, w, 3);
      const size = w / 5;
      for (let i = 0; i < 5; i++) {
        const cx = i * size + size / 2;
        const cy = h - band / 2 - 3;
        ctx.fillStyle = i % 2 ? P.GREEN : P.RED;
        ctx.beginPath();
        ctx.moveTo(cx, cy - band / 2 + 2);
        ctx.lineTo(cx + size / 2 - 2, cy);
        ctx.lineTo(cx, cy + band / 2 - 2);
        ctx.lineTo(cx - size / 2 + 2, cy);
        ctx.fill();
        ctx.fillStyle = P.OCHRE;
        ctx.fillRect(cx - 3, cy - 3, 6, 6);
      }
    });
    // A front panel of about ±43°: wider, its far edge reached the silhouette in three-quarter
    // views and the apron looked shifted to one side.
    const arc = 0.24;
    const front = this.parts.lathe("hips", apron, [0, 0, 0], [[0.33, 0.42], [0.326, 0.45], [0.281, 0.68], [0.231, 0.86], [0.191, 0.98], [0.172, 1.01]], {
      tessellation: 40,
      arc,
      doubleSided: true,
    });
    // Turned so the middle of the arc faces forward, then pulled almost flat (an apron is a
    // panel in front of the skirt, it does not wrap around it) and squeezed like the skirt.
    const turn = Math.PI / 2 - arc * Math.PI;
    ProceduralAvatar.reshape(front, (x, y, z) => {
      const rx = x * Math.cos(turn) - z * Math.sin(turn);
      const rz = x * Math.sin(turn) + z * Math.cos(turn);
      const radius = Math.hypot(rx, rz);
      const cos = rz / (radius || 1);
      // Half way between following the skirt (cos) and a flat front plane (1).
      return [rx, y, (radius * (cos + 0.5 * (1 - cos)) + 0.006) * 0.88];
    });
    const red = this.atlas.solid(P.RED);
    this.parts.torus("hips", red, [0, 1.005, 0], 0.32, 0.022, 28).scaling.z = 0.88;
    // The apron's strings are tied in a bow at the back.
    for (const side of [-1, 1]) {
      this.parts.sphere("hips", red, [side * 0.035, 1.0, -0.15], 0.06, [1, 0.6, 0.4], 10).rotation.z = side * 0.4;
      this.parts.capsule("hips", red, [side * 0.01, 0.99, -0.148], [side * 0.03, 0.88, -0.165], 0.012, 0.01);
    }
  }

  /** Embroidered blouse, the shawl over the shoulders and the braid down the back. */
  protected buildTorso(): void {
    const blouse = this.atlas.paint(128, 96, (ctx, w, h) => {
      ctx.fillStyle = P.WHITE;
      ctx.fillRect(0, 0, w, h);
      // Little embroidered flowers around the neckline.
      for (let i = 0; i < 8; i++) {
        const x = i * (w / 8) + w / 16;
        ctx.fillStyle = i % 2 ? P.GREEN : P.RED;
        for (let k = 0; k < 4; k++) {
          ctx.beginPath();
          ctx.arc(x + Math.cos((k * Math.PI) / 2) * 3, 10 + Math.sin((k * Math.PI) / 2) * 3, 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = P.OCHRE;
        ctx.fillRect(x - 1.5, 8.5, 3, 3);
      }
    });
    this.parts
      .lathe("spine", blouse, [0, 0, 0], [[0, 0.97], [0.15, 0.98], [0.155, 1.06], [0.168, 1.17], [0.175, 1.26], [0.162, 1.34], [0.12, 1.41], [0.06, 1.445], [0, 1.45]], {
        tessellation: 28,
      })
      .scaling.z = 0.8;

    const shawl = this.atlas.paint(192, 96, (ctx, w, h) => {
      ctx.fillStyle = P.RED;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = P.GREEN;
      for (let x = 0; x < w; x += w / 12) ctx.fillRect(x, 0, 4, h);
      ctx.fillRect(0, 30, w, 3);
      ctx.fillRect(0, h - 12, w, 12);
      ctx.fillStyle = P.OCHRE;
      ctx.fillRect(0, h - 15, w, 2);
      this.atlas.fibers(ctx, w, h);
    });
    // The shawl falls loose and long over the sides and the back and opens at the front,
    // where its two ends cross over the chest (not the bell of a ruana).
    this.carveCape(
      shawl,
      [
        [0.255, 0.98],
        [0.255, 1.12],
        [0.255, 1.26],
        [0.258, 1.35],
        [0.25, 1.395],
        [0.226, 1.428],
        [0.15, 1.447],
        [0.085, 1.452],
      ],
      { lift: 0, frontLift: 0.36, depth: 0.8, top: 1.41, fringe: [P.RED, P.GREEN], fringeLength: 0.06 },
    );
    for (const side of [-1, 1]) {
      const end = this.parts.capsule("spine", shawl, [side * 0.11, 1.37, 0.14], [-side * 0.15, 1.08, 0.165 + side * 0.006], 0.045, 0.042);
      end.scaling.z = 0.26;
      // The end that crosses on top ends in a short fringe at the hip.
      for (let k = -2; k <= 2; k++) {
        const x = -side * 0.15 + k * 0.012;
        this.parts.capsule("spine", this.atlas.solid(k % 2 ? P.GREEN : P.RED), [x, 1.05, 0.17], [x, 0.99, 0.172], 0.006, 0.005);
      }
    }

    // Braid: from the nape over the shawl down to the waist, tied with a red ribbon.
    const hair = this.atlas.solid(HAIR);
    const path: [number, number, number][] = [
      [0, 1.53, -0.085],
      [0, 1.45, -0.16],
      [0, 1.37, -0.215],
      [0, 1.28, -0.235],
      [0, 1.19, -0.245],
      [0, 1.1, -0.245],
      [0, 1.02, -0.235],
    ];
    for (let i = 0; i < path.length - 1; i++) {
      const [x0, y0, z0] = path[i];
      const [, y1, z1] = path[i + 1];
      const steps = 2;
      for (let k = 0; k < steps; k++) {
        const t = k / steps;
        const r = 0.034 - ((i * steps + k) / (path.length * steps)) * 0.012;
        const wiggle = (i * steps + k) % 2 ? 0.012 : -0.012;
        this.parts.sphere("spine", hair, [x0 + wiggle, y0 + (y1 - y0) * t, z0 + (z1 - z0) * t], r * 2, [1, 1.25, 0.85], 10);
      }
    }
    const [, endY, endZ] = path[path.length - 1];
    this.parts.torus("spine", this.atlas.solid(P.RED), [0, endY + 0.005, endZ], 0.045, 0.014, 14);
    this.parts.capsule("spine", hair, [0, endY - 0.005, endZ], [0, endY - 0.075, endZ + 0.01], 0.02, 0.012);
  }

  protected buildArms(): void {
    for (const side of [-1, 1] as const) this.carveArm(side, P.WHITE, SKIN, P.RED, 0.047);
  }

  protected buildHead(): void {
    this.carveHead(SKIN);
    const y = this.body.headHeight;
    const hair = this.atlas.solid(HAIR);
    // Hair parted in the middle and pulled back into the braid.
    this.parts.sphere("head", hair, [0, y + 0.022, -0.014], this.body.headSize + 0.016, [0.95, 1.0, 0.95], 22);
    this.parts.sphere("head", hair, [0, y - 0.035, -0.08], 0.1, [1.1, 0.9, 0.9], 12);
    for (const side of [-1, 1]) {
      this.parts.capsule("head", hair, [side * 0.022, y + 0.034, 0.1], [side * 0.058, y + 0.035, 0.092], 0.006, 0.005);
      this.parts.sphere("head", this.atlas.solid(P.OCHRE), [side * 0.104, y - 0.035, -0.002], 0.022, [1, 1, 1], 8);
    }
  }

  protected buildHeadwear(): void {}
}
