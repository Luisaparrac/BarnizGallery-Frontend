import { BarnizPalette as P } from "./BarnizPalette";
import { ProceduralAvatar } from "./ProceduralAvatar";
import type { AvatarContext } from "../AvatarFactory";
import type { AvatarBody, MotionStyle } from "./AvatarTypes";

const SKIN = "#b07a55";
const HAIR = "#3a2f29";

/**
 * "artesano": a man of about 45 from Pasto in a red, black and ochre striped ruana, white
 * shirt, dark trousers and a moustache.
 */
export class ArtisanAvatar extends ProceduralAvatar {
  constructor(context: AvatarContext) {
    super(context, "artesano", 45);
  }

  protected override proportions(): Partial<AvatarBody> {
    return { shoulderWidth: 0.185 };
  }

  protected override motionStyle(): Partial<MotionStyle> {
    return { armSpread: 0.12, runElbow: 0.45 };
  }

  protected buildLegs(): void {
    this.carveLeg(-1, P.DARK_CLOTH, P.LEATHER, P.SOLE, 0.082);
    this.carveLeg(1, P.DARK_CLOTH, P.LEATHER, P.SOLE, 0.082);
  }

  protected buildHips(): void {
    this.parts.sphere("hips", this.atlas.solid(P.DARK_CLOTH), [0, 0.93, 0], 0.34, [1, 0.62, 0.74], 18);
  }

  protected buildTorso(): void {
    const shirt = this.atlas.solid(P.WHITE);
    // Shirt, mostly hidden: it shows under the sides of the ruana and at the collar.
    this.parts
      .lathe("spine", shirt, [0, 0, 0], [[0, 0.95], [0.16, 0.97], [0.175, 1.12], [0.18, 1.28], [0.165, 1.36], [0.1, 1.44], [0, 1.45]], { tessellation: 24 })
      .scaling.z = 0.76;
    this.parts.cylinder("spine", shirt, [0, 1.475, 0.005], 0.045, 0.14, 0.118, 18);

    const ruana = this.atlas.paint(256, 128, (ctx, w, h) => {
      // Wide red bands with black and ochre lines, the usual pattern of a Pasto ruana.
      const unit = w / 16;
      for (let i = 0; i < 16; i++) {
        const x = i * unit;
        ctx.fillStyle = P.RED;
        ctx.fillRect(x, 0, unit + 1, h);
        ctx.fillStyle = P.BLACK;
        ctx.fillRect(x + unit * 0.62, 0, unit * 0.16, h);
        ctx.fillRect(x + unit * 0.9, 0, unit * 0.06, h);
        ctx.fillStyle = P.OCHRE;
        ctx.fillRect(x + unit * 0.8, 0, unit * 0.07, h);
      }
      // Black border along the hem with a thin ochre line.
      ctx.fillStyle = P.BLACK;
      ctx.fillRect(0, h - 10, w, 10);
      ctx.fillStyle = P.OCHRE;
      ctx.fillRect(0, h - 13, w, 2);
      this.atlas.fibers(ctx, w, h);
    });
    this.carveRuana(ruana, [P.CREAM, P.RED, P.BLACK]);
  }

  protected buildArms(): void {
    this.carveArm(-1, P.WHITE, SKIN, P.WHITE, 0.05);
    this.carveArm(1, P.WHITE, SKIN, P.WHITE, 0.05);
  }

  protected buildHead(): void {
    this.carveHead(SKIN);
    const b = this.body;
    const y = b.headHeight;
    const hair = this.atlas.solid(HAIR);
    // Short hair combed back: a cap over the top and the back of the head.
    this.parts.sphere("head", hair, [0, y + 0.024, -0.018], b.headSize + 0.012, [0.95, 1.0, 0.95], 22);
    for (const side of [-1, 1]) {
      this.parts.capsule("head", hair, [side * 0.022, y + 0.038, 0.104], [side * 0.062, y + 0.038, 0.094], 0.008, 0.006);
      // Thick moustache that falls a little at the ends.
      this.parts.capsule("head", hair, [side * 0.004, y - 0.044, 0.118], [side * 0.05, y - 0.06, 0.098], 0.014, 0.009);
    }
  }

  /** No hat: his hair shows. */
  protected buildHeadwear(): void {}
}
