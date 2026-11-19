import { TransformNode, VertexBuffer, VertexData, type Mesh, type Scene } from "@babylonjs/core";
import type { AvatarContext } from "../AvatarFactory";
import type { AvatarModel } from "../AvatarModel";
import { AvatarAtlas, type AtlasRegion } from "./AvatarAtlas";
import { AvatarMotion } from "./AvatarMotion";
import { AvatarPartBuilder } from "./AvatarPartBuilder";
import { AvatarSkeleton } from "./AvatarSkeleton";
import type { AvatarBody, MotionStyle, Point } from "./AvatarTypes";

/**
 * Base of the five avatars made in code, carved and varnished like a Barniz de Pasto figure
 * (Template Method). The constructor fixes the order of the steps (skeleton, legs, hips,
 * torso, arms, head, headwear, extras, merge) and each avatar fills in the steps.
 *
 * The steps run inside this constructor, before the subclass's own fields exist, so the
 * subclasses keep their colors in constants instead of fields.
 */
/** How a draped cloth hangs; see `carveCape`. */
export interface CapeOptions {
  lift: number;
  depth: number;
  /** Height above which the cloth no longer rises at the sides. */
  top: number;
  fringe?: string[];
  fringeLength?: number;
}

export abstract class ProceduralAvatar implements AvatarModel {
  /** Proportions shared by every avatar: about 1.7 m tall. */
  static readonly BODY: AvatarBody = {
    hipHeight: 0.9,
    hipWidth: 0.095,
    kneeHeight: 0.48,
    waistHeight: 1.0,
    shoulderHeight: 1.38,
    shoulderWidth: 0.2,
    elbowHeight: 1.12,
    wristHeight: 0.87,
    neckHeight: 1.47,
    headHeight: 1.62,
    headSize: 0.235,
  };

  /** Outline of a ruana from the knees up to the neck: [radius, height]. */
  private static readonly RUANA: [number, number][] = [
    [0.41, 0.6],
    [0.4, 0.72],
    [0.395, 0.84],
    [0.37, 1.05],
    [0.34, 1.22],
    [0.315, 1.34],
    [0.285, 1.39],
    [0.225, 1.43],
    [0.13, 1.455],
    [0.088, 1.46],
  ];

  readonly root: TransformNode;
  protected readonly scene: Scene;
  protected readonly body: AvatarBody;
  protected readonly atlas: AvatarAtlas;
  protected readonly parts: AvatarPartBuilder;
  protected readonly skeleton: AvatarSkeleton;
  private readonly motion: AvatarMotion;

  constructor(context: AvatarContext, code: string, seed: number) {
    this.scene = context.scene;
    this.root = new TransformNode(`avatar-${code}`, this.scene);
    this.body = { ...ProceduralAvatar.BODY, ...this.proportions() };
    this.skeleton = new AvatarSkeleton(this.scene, this.root, this.body);
    this.atlas = new AvatarAtlas(this.scene, code, seed);
    this.parts = new AvatarPartBuilder(this.scene, this.skeleton);

    this.buildLegs();
    this.buildHips();
    this.buildTorso();
    this.buildArms();
    this.buildHead();
    this.buildHeadwear();
    this.buildExtras();

    this.atlas.commit();
    const material = context.materials.carving(code, this.atlas.texture);
    for (const mesh of this.parts.merge(material)) {
      context.shadows.addCaster(mesh);
      context.shadows.receive(mesh);
    }
    this.motion = new AvatarMotion(this.skeleton, { armSpread: 0.08, bounce: 1, runElbow: 1.3, stride: 1, ...this.motionStyle() });
  }

  setVisible(visible: boolean): void {
    this.root.setEnabled(visible);
  }

  animate(deltaSeconds: number, speed: number): void {
    this.motion.update(deltaSeconds, speed);
  }

  dispose(): void {
    // The atlas and its material belong to this avatar only.
    this.root.dispose(false, true);
  }

  // ---------------------------------------------------------------- steps

  protected abstract buildLegs(): void;
  protected abstract buildHips(): void;
  protected abstract buildTorso(): void;
  protected abstract buildArms(): void;
  protected abstract buildHead(): void;
  protected abstract buildHeadwear(): void;

  /** Bags, aprons, ears… Nothing by default. */
  protected buildExtras(): void {}

  /** Changes to the shared proportions (a narrower back, a bigger head). */
  protected proportions(): Partial<AvatarBody> {
    return {};
  }

  protected motionStyle(): Partial<MotionStyle> {
    return {};
  }

  // ---------------------------------------------------------------- shared pieces

  /** A plain head with minimal features: two eyes, a small nose and ears. */
  protected carveHead(skin: string, eyes = "#1b120d"): void {
    const b = this.body;
    const skinRegion = this.atlas.solid(skin);
    const y = b.headHeight;
    const r = b.headSize / 2;
    this.parts.cylinder("head", skinRegion, [0, b.neckHeight + 0.04, 0], 0.11, 0.1, 0.09, 16);
    this.parts.sphere("head", skinRegion, [0, y, 0], b.headSize, [0.9, 1.07, 0.98], 24);
    this.parts.sphere("head", skinRegion, [0, y - 0.055, 0.03], b.headSize * 0.6, [1, 0.72, 1], 16);
    const eyeRegion = this.atlas.solid(eyes);
    for (const side of [-1, 1]) {
      this.parts.sphere("head", eyeRegion, [side * 0.04, y + 0.008, r * 0.93], 0.024, [1, 1.25, 0.5], 10);
      this.parts.sphere("head", skinRegion, [side * r * 0.9, y - 0.005, -0.005], 0.05, [0.5, 1, 0.75], 10);
    }
    this.parts.sphere("head", skinRegion, [0, y - 0.022, r * 0.98], 0.036, [0.85, 1, 0.9], 10);
  }

  /** Arm with a sleeve to `cuff` and a mitten-like hand. */
  protected carveArm(side: -1 | 1, sleeve: string, skin: string, cuff = sleeve, sleeveRadius = 0.052): void {
    const b = this.body;
    const x = side * b.shoulderWidth;
    const shoulder = side < 0 ? "shoulderL" : "shoulderR";
    const elbow = side < 0 ? "elbowL" : "elbowR";
    const sleeveRegion = this.atlas.solid(sleeve);
    this.parts.capsule(shoulder, sleeveRegion, [x, b.shoulderHeight, 0], [x, b.elbowHeight, 0], sleeveRadius + 0.006, sleeveRadius);
    this.parts.capsule(elbow, sleeveRegion, [x, b.elbowHeight, 0], [x, b.wristHeight + 0.03, 0], sleeveRadius, sleeveRadius - 0.006);
    this.parts.cylinder(elbow, this.atlas.solid(cuff), [x, b.wristHeight + 0.035, 0], 0.03, sleeveRadius * 2 + 0.004, sleeveRadius * 2 + 0.004, 14);
    const hand = this.atlas.solid(skin);
    this.parts.sphere(elbow, hand, [x, b.wristHeight - 0.03, 0.005], 0.08, [0.8, 1.2, 0.65], 12);
    this.parts.sphere(elbow, hand, [x - side * 0.005, b.wristHeight - 0.01, 0.03], 0.03, [0.9, 1.3, 0.9], 8);
  }

  /** Leg in trousers from the hip to the ankle, with a rounded shoe. */
  protected carveLeg(side: -1 | 1, trousers: string, shoe: string, sole = "#1a1210", thigh = 0.078): void {
    const b = this.body;
    const x = side * b.hipWidth;
    const leg = side < 0 ? "legL" : "legR";
    const knee = side < 0 ? "kneeL" : "kneeR";
    const cloth = this.atlas.solid(trousers);
    this.parts.capsule(leg, cloth, [x, b.hipHeight, 0], [x, b.kneeHeight, 0], thigh, 0.062);
    this.parts.capsule(knee, cloth, [x, b.kneeHeight, 0], [x, 0.12, -0.005], 0.062, 0.05);
    this.carveShoe(knee, x, shoe, sole);
  }

  /**
   * A ruana: a wide woolen shell from the neck to the thighs, flatter front to back, whose sides
   * rise over the arms (it is a square cloth with a hole for the head), with a fringed hem.
   * A higher `hem` makes a short ruana.
   */
  protected carveRuana(region: AtlasRegion, fringe: string[], hem = 0.72): void {
    this.carveCape(region, ProceduralAvatar.cut(ProceduralAvatar.RUANA, hem), { fringe, lift: 0.3, depth: 0.72, top: 1.39 });
    this.parts.torus("spine", region, [0, 1.458, 0], 0.176, 0.026, 20).scaling.z = 0.85;
  }

  /**
   * A draped cloth turned around the body (ruana, shawl): `profile` goes from the hem up to the
   * neck. Its sides rise by `lift` over the arms and it is `depth` times as deep as it is wide.
   */
  protected carveCape(region: AtlasRegion, profile: [number, number][], options: CapeOptions): void {
    const hem = profile[0][1];
    const { lift, depth, top } = options;
    const drape = (x: number, y: number, z: number): Point => {
      const radial = Math.hypot(x, z) || 1;
      const side = Math.abs(x) / radial;
      const low = Math.min(1, Math.max(0, (top - y) / (top - hem)));
      return [x, y + lift * side * low, z * depth];
    };
    const shell = this.parts.lathe("spine", region, [0, 0, 0], profile, { tessellation: 56, doubleSided: true });
    ProceduralAvatar.reshape(shell, drape);
    if (!options.fringe?.length) return;
    const radius = profile[0][0] - 0.002;
    const length = options.fringeLength ?? 0.045;
    const count = Math.round(radius * 160);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const [x, y, z] = drape(Math.sin(angle) * radius, hem, Math.cos(angle) * radius);
      this.parts.capsule("spine", this.atlas.solid(options.fringe[i % options.fringe.length]), [x, y + 0.005, z], [x, y - length, z], 0.008, 0.006);
    }
  }

  /** The part of a profile above `hem`, starting exactly at it. */
  protected static cut(profile: [number, number][], hem: number): [number, number][] {
    const above = profile.filter(([, y]) => y > hem);
    const next = above[0];
    const previous = [...profile].reverse().find(([, y]) => y <= hem) ?? next;
    const t = next[1] === previous[1] ? 0 : (hem - previous[1]) / (next[1] - previous[1]);
    return [[previous[0] + (next[0] - previous[0]) * t, hem], ...above];
  }

  /** Moves every vertex of a piece (in its own space) and recomputes its normals. */
  protected static reshape(mesh: Mesh, move: (x: number, y: number, z: number) => Point): void {
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
    const indices = mesh.getIndices();
    if (!positions || !indices) return;
    for (let i = 0; i < positions.length; i += 3) {
      const [x, y, z] = move(positions[i], positions[i + 1], positions[i + 2]);
      positions[i] = x;
      positions[i + 1] = y;
      positions[i + 2] = z;
    }
    const normals: number[] = [];
    VertexData.ComputeNormals(positions, indices, normals);
    mesh.setVerticesData(VertexBuffer.PositionKind, positions);
    mesh.setVerticesData(VertexBuffer.NormalKind, normals);
  }

  protected carveShoe(knee: "kneeL" | "kneeR", x: number, shoe: string, sole: string): void {
    this.parts.capsule(knee, this.atlas.solid(shoe), [x, 0.065, -0.035], [x, 0.06, 0.1], 0.058, 0.052).scaling.x = 0.95;
    this.parts.capsule(knee, this.atlas.solid(sole), [x, 0.018, -0.045], [x, 0.018, 0.12], 0.052, 0.05).scaling.z = 0.35;
  }
}
