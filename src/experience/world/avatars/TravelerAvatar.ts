import type { AvatarContext } from "../AvatarFactory";
import type { AvatarBody, MotionStyle } from "./AvatarTypes";
import { BarnizPalette as P } from "./BarnizPalette";
import { ProceduralAvatar } from "./ProceduralAvatar";

const SKIN = "#c08a64";
const HAIR = "#5a3722";
const JEANS = "#3f5f8a";
const BOOTS = "#6a4026";
const JACKET = P.OCHRE;

/**
 * "viajera": a young woman visiting Pasto, in a light ochre jacket, jeans, boots, a small
 * green backpack and a red cap with her ponytail through it.
 */
export class TravelerAvatar extends ProceduralAvatar {
  constructor(context: AvatarContext) {
    super(context, "viajera", 22);
  }

  protected override proportions(): Partial<AvatarBody> {
    return { shoulderWidth: 0.168, hipWidth: 0.088, headSize: 0.222, headHeight: 1.61, neckHeight: 1.47 };
  }

  protected override motionStyle(): Partial<MotionStyle> {
    return { armSpread: 0.07, bounce: 1.15 };
  }

  protected buildLegs(): void {
    const boot = this.atlas.solid(BOOTS);
    for (const side of [-1, 1] as const) {
      this.carveLeg(side, JEANS, BOOTS, P.SOLE, 0.072);
      const x = side * this.body.hipWidth;
      const knee = side < 0 ? "kneeL" : "kneeR";
      this.parts.cylinder(knee, boot, [x, 0.2, -0.004], 0.22, 0.118, 0.13, 16);
      this.parts.torus(knee, this.atlas.solid(P.SOLE), [x, 0.31, -0.004], 0.128, 0.012, 16);
    }
  }

  protected buildHips(): void {
    this.parts.sphere("hips", this.atlas.solid(JEANS), [0, 0.93, 0], 0.31, [1, 0.6, 0.72], 18);
    this.parts.torus("hips", this.atlas.solid("#3b2416"), [0, 0.985, 0], 0.29, 0.016, 28).scaling.z = 0.74;
  }

  /** Cream T-shirt under an open jacket, and the backpack. */
  protected buildTorso(): void {
    const tee = this.atlas.solid(P.CREAM);
    this.parts
      .lathe("spine", tee, [0, 0, 0], [[0, 0.95], [0.145, 0.97], [0.15, 1.08], [0.16, 1.2], [0.165, 1.3], [0.12, 1.4], [0.06, 1.445], [0, 1.45]], { tessellation: 28 })
      .scaling.z = 0.74;

    // The jacket goes almost all around; the gap at the front shows the T-shirt.
    const arc = 0.86;
    const jacket = this.atlas.paint(128, 96, (ctx, w, h) => {
      ctx.fillStyle = JACKET;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(60,30,0,0.35)";
      ctx.fillRect(0, 0, w, 6);
      ctx.fillRect(0, h - 8, w, 8);
      ctx.fillRect(0, 0, 3, h);
      ctx.fillRect(w - 3, 0, 3, h);
    });
    const shell = this.parts.lathe(
      "spine",
      jacket,
      [0, 0, 0],
      [[0.172, 0.93], [0.172, 1.0], [0.178, 1.12], [0.188, 1.24], [0.188, 1.33], [0.15, 1.41], [0.1, 1.45], [0.085, 1.48]],
      { tessellation: 36, arc, doubleSided: true },
    );
    const turn = Math.PI / 2 - (1 + arc) * Math.PI;
    ProceduralAvatar.reshape(shell, (x, y, z) => [x * Math.cos(turn) - z * Math.sin(turn), y, (x * Math.sin(turn) + z * Math.cos(turn)) * 0.78]);
    this.parts.torus("spine", this.atlas.solid(JACKET), [0, 1.455, -0.01], 0.17, 0.03, 20).scaling.z = 0.8;

    // Small backpack with a red flap and its straps over the shoulders.
    const green = this.atlas.solid(P.GREEN);
    const flap = this.atlas.paint(64, 64, (ctx, w, h) => {
      ctx.fillStyle = P.RED;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = P.OCHRE;
      ctx.fillRect(0, h - 10, w, 3);
      ctx.fillStyle = P.BLACK;
      ctx.fillRect(0, h - 5, w, 2);
    });
    this.parts.sphere("spine", green, [0, 1.17, -0.2], 0.3, [0.95, 1.05, 0.5], 18);
    this.parts.sphere("spine", flap, [0, 1.26, -0.215], 0.24, [1.05, 0.55, 0.45], 16);
    this.parts.sphere("spine", this.atlas.solid(P.OCHRE), [0, 1.2, -0.268], 0.04, [1, 1, 0.5], 8);
    const strap = this.atlas.solid("#3b2416");
    for (const side of [-1, 1]) {
      this.parts.capsule("spine", strap, [side * 0.075, 1.3, -0.2], [side * 0.092, 1.465, -0.03], 0.014);
      this.parts.capsule("spine", strap, [side * 0.092, 1.465, -0.03], [side * 0.072, 1.38, 0.1], 0.014);
      this.parts.capsule("spine", strap, [side * 0.072, 1.38, 0.1], [side * 0.064, 1.12, 0.128], 0.014);
    }
  }

  protected buildArms(): void {
    for (const side of [-1, 1] as const) this.carveArm(side, JACKET, SKIN, "#a87422", 0.05);
  }

  protected buildHead(): void {
    this.carveHead(SKIN);
    const y = this.body.headHeight;
    const hair = this.atlas.solid(HAIR);
    this.parts.sphere("head", hair, [0, y + 0.012, -0.018], this.body.headSize + 0.014, [0.95, 1.0, 0.95], 22);
    // Ponytail through the back of the cap.
    this.parts.capsule("head", hair, [0, y + 0.03, -0.11], [0, y - 0.13, -0.15], 0.034, 0.018);
    for (const side of [-1, 1]) {
      this.parts.capsule("head", hair, [side * 0.022, y + 0.032, 0.1], [side * 0.056, y + 0.036, 0.093], 0.005, 0.004);
    }
  }

  /** Red cap with a curved visor. */
  protected buildHeadwear(): void {
    const y = this.body.headHeight;
    const red = this.atlas.solid(P.RED);
    this.parts.lathe("head", red, [0, y + 0.022, -0.008], [[0.124, 0], [0.123, 0.035], [0.108, 0.08], [0.065, 0.112], [0, 0.12]], {
      tessellation: 32,
      doubleSided: true,
    });
    const visor = this.parts.sphere("head", this.atlas.solid(P.DEEP_RED), [0, y + 0.03, 0.125], 0.2, [0.85, 0.07, 0.82], 18);
    visor.rotation.x = -0.12;
    this.parts.sphere("head", this.atlas.solid(P.OCHRE), [0, y + 0.142, -0.008], 0.022, [1, 0.5, 1], 8);
  }
}
