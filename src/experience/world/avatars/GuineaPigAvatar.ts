import type { AvatarContext } from "../AvatarFactory";
import type { AtlasRegion } from "./AvatarAtlas";
import type { AvatarBody, MotionStyle } from "./AvatarTypes";
import { BarnizPalette as P } from "./BarnizPalette";
import { ProceduralAvatar } from "./ProceduralAvatar";

const SKIN = "#b98462";
const FUR = "#8a5530";
const FUR_DARK = "#5e3720";
const FUR_WHITE = "#f1e6d2";
const PINK = "#e3a29a";

/**
 * "cuy": a person in a full guinea-pig costume, like the ones of the Pasto carnival: a round
 * brown and white furry body, a hood with round ears and its own little eyes, the face of the
 * wearer showing, paws and a red scarf with a Barniz pattern.
 */
export class GuineaPigAvatar extends ProceduralAvatar {
  constructor(context: AvatarContext) {
    super(context, "cuy", 7);
  }

  protected override proportions(): Partial<AvatarBody> {
    return { shoulderWidth: 0.21, hipWidth: 0.1, shoulderHeight: 1.35, neckHeight: 1.44, headHeight: 1.57, headSize: 0.22 };
  }

  protected override motionStyle(): Partial<MotionStyle> {
    return { armSpread: 0.2, bounce: 1.7, stride: 0.85 };
  }

  /** Short furry legs and big paw slippers with three toes. */
  protected buildLegs(): void {
    const fur = this.atlas.solid(FUR);
    const white = this.atlas.solid(FUR_WHITE);
    for (const side of [-1, 1] as const) {
      const x = side * this.body.hipWidth;
      const leg = side < 0 ? "legL" : "legR";
      const knee = side < 0 ? "kneeL" : "kneeR";
      this.parts.capsule(leg, fur, [x, this.body.hipHeight, 0], [x, this.body.kneeHeight, 0], 0.115, 0.098);
      this.parts.capsule(knee, fur, [x, this.body.kneeHeight, 0], [x, 0.13, 0], 0.098, 0.085);
      this.parts.sphere(knee, fur, [x, 0.07, 0.04], 0.2, [0.85, 0.6, 1.4], 16);
      for (const toe of [-1, 0, 1]) this.parts.sphere(knee, white, [x + toe * 0.035, 0.05, 0.17], 0.05, [1, 0.8, 1], 8);
    }
  }

  protected buildHips(): void {
    this.parts.sphere("hips", this.atlas.solid(FUR), [0, 0.92, 0], 0.42, [1, 0.7, 0.85], 18);
  }

  /** Round furry body with patches, a white belly and the carnival scarf. */
  protected buildTorso(): void {
    const coat = this.atlas.paint(192, 128, (ctx, w, h) => {
      ctx.fillStyle = FUR;
      ctx.fillRect(0, 0, w, h);
      // Patches of a tricolor guinea pig; they stay inside the region so the seam closes.
      const blob = (x: number, y: number, rx: number, ry: number, color: string) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      };
      blob(w * 0.5, h * 0.35, 30, 26, FUR_WHITE);
      blob(w * 0.12, h * 0.7, 18, 22, FUR_DARK);
      blob(w * 0.82, h * 0.6, 22, 20, FUR_DARK);
      this.atlas.fibers(ctx, w, h, 0.08, 0.16);
    });
    this.parts
      .lathe("spine", coat, [0, 0, 0], [[0, 0.76], [0.17, 0.78], [0.235, 0.88], [0.258, 1.02], [0.26, 1.18], [0.235, 1.3], [0.17, 1.4], [0.08, 1.45], [0, 1.455]], { tessellation: 32 })
      .scaling.z = 0.86;
    this.parts.sphere("spine", this.atlas.solid(FUR_WHITE), [0, 1.06, 0.15], 0.4, [0.78, 1.05, 0.5], 18);

    const scarf = this.atlas.paint(128, 32, (ctx, w, h) => {
      ctx.fillStyle = P.RED;
      ctx.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 16) {
        ctx.fillStyle = P.OCHRE;
        ctx.beginPath();
        ctx.moveTo(x, h / 2);
        ctx.lineTo(x + 8, h / 2 - 7);
        ctx.lineTo(x + 16, h / 2);
        ctx.lineTo(x + 8, h / 2 + 7);
        ctx.fill();
        ctx.fillStyle = P.GREEN;
        ctx.fillRect(x + 6, h / 2 - 2, 4, 4);
      }
      ctx.fillStyle = P.BLACK;
      ctx.fillRect(0, 0, w, 3);
      ctx.fillRect(0, h - 3, w, 3);
    });
    this.parts.torus("spine", scarf, [0, 1.425, 0.01], 0.25, 0.06, 28).scaling.z = 0.9;
    this.parts.sphere("spine", scarf, [0.03, 1.36, 0.135], 0.13, [1, 1, 0.35], 12).rotation.z = 0.5;
  }

  /** Furry sleeves with a white cuff and round paws with pink pads. */
  protected buildArms(): void {
    const b = this.body;
    for (const side of [-1, 1] as const) {
      this.carveArm(side, FUR, FUR, FUR_WHITE, 0.064);
      const x = side * b.shoulderWidth;
      const elbow = side < 0 ? "elbowL" : "elbowR";
      this.parts.sphere(elbow, this.atlas.solid(FUR), [x, b.wristHeight - 0.03, 0.005], 0.11, [1, 1, 0.9], 12);
      this.parts.sphere(elbow, this.atlas.solid(PINK), [x, b.wristHeight - 0.04, 0.05], 0.05, [1, 1, 0.4], 10);
    }
  }

  /** The wearer's face, with rosy carnival cheeks. */
  protected buildHead(): void {
    this.carveHead(SKIN);
    const y = this.body.headHeight;
    for (const side of [-1, 1]) {
      this.parts.sphere("head", this.atlas.solid("#d9837a"), [side * 0.058, y - 0.03, 0.092], 0.038, [1, 0.8, 0.4], 10);
      this.parts.capsule("head", this.atlas.solid(FUR_DARK), [side * 0.022, y + 0.036, 0.1], [side * 0.056, y + 0.036, 0.093], 0.005, 0.004);
    }
  }

  /** The hood: a furry shell open at the front, round ears and the cuy's own face on top. */
  protected buildHeadwear(): void {
    const y = this.body.headHeight;
    const fur = this.atlas.solid(FUR);
    const white = this.atlas.solid(FUR_WHITE);
    this.carveHood(fur, y);
    const rim = this.parts.torus("head", white, [0, y + 0.01, 0.1], 0.285, 0.05, 28);
    rim.rotation.x = Math.PI / 2;
    rim.scaling.set(0.92, 1.05, 1);
    // White blaze over the top, like a real cuy.
    this.parts.sphere("head", white, [0, y + 0.19, 0.0], 0.14, [0.7, 0.45, 1.3], 14);
    const eye = this.atlas.solid("#120c0a");
    for (const side of [-1, 1]) {
      this.parts.sphere("head", eye, [side * 0.062, y + 0.185, 0.07], 0.045, [1, 1, 0.8], 10);
      this.parts.sphere("head", white, [side * 0.055, y + 0.197, 0.09], 0.012, [1, 1, 1], 6);
      this.parts.sphere("head", fur, [side * 0.125, y + 0.205, -0.06], 0.12, [1, 0.95, 0.42], 14).rotation.y = side * 0.5;
      this.parts.sphere("head", this.atlas.solid(PINK), [side * 0.123, y + 0.203, -0.042], 0.08, [1, 0.95, 0.25], 12).rotation.y = side * 0.5;
    }
    this.parts.sphere("head", this.atlas.solid(PINK), [0, y + 0.168, 0.125], 0.04, [1.2, 0.8, 0.8], 10);
  }

  /** A turned dome whose axis points forward, so its opening frames the face. */
  private carveHood(region: AtlasRegion, y: number): void {
    const hood = this.parts.lathe(
      "head",
      region,
      [0, y + 0.01, 0],
      [
        [0.14, 0.05],
        [0.17, 0.0],
        [0.19, -0.07],
        [0.185, -0.14],
        [0.15, -0.21],
        [0.08, -0.255],
        [0, -0.265],
      ],
      { tessellation: 36, doubleSided: true },
    );
    // Lathe axis (+y) → forward (+z), and a little taller than wide.
    ProceduralAvatar.reshape(hood, (x, py, z) => [x, -z * 1.08, py + 0.05]);
  }
}
