import type { Vector3 } from "@babylonjs/core";
import type { AvatarSkeleton } from "./AvatarSkeleton";
import type { JointName, MotionStyle } from "./AvatarTypes";

/**
 * Procedural animation of the skeleton: Idle (breathing and a slight sway), Walk and Run. The
 * three poses are always computed and mixed with weights that follow the speed smoothly, so
 * there are no jumps when the visitor starts, stops or runs.
 */
export class AvatarMotion {
  private static readonly BLEND_PER_SECOND = 6;
  private static readonly WALK_CYCLES = 0.9;
  private static readonly RUN_CYCLES = 1.35;

  private readonly rest: Record<JointName, Vector3>;
  private gait = 0;
  private phase = 0;
  private time = 0;

  constructor(
    private readonly skeleton: AvatarSkeleton,
    private readonly style: MotionStyle,
  ) {
    const names = Object.keys(skeleton.joints) as JointName[];
    this.rest = Object.fromEntries(names.map((name) => [name, skeleton.restOffset(name)])) as Record<JointName, Vector3>;
  }

  /** `speed` is 0 (idle), 1 (walking) or ~1.8 (running). */
  update(deltaSeconds: number, speed: number): void {
    this.gait += (Math.min(Math.max(speed, 0), 1.8) - this.gait) * Math.min(1, deltaSeconds * AvatarMotion.BLEND_PER_SECOND);
    const g = this.gait;
    const run = Math.min(Math.max((g - 1) / 0.8, 0), 1);
    const walk = g <= 1 ? g : 1 - run;
    const idle = Math.max(0, 1 - g);
    const moving = walk + run;

    const cycles = AvatarMotion.WALK_CYCLES + (AvatarMotion.RUN_CYCLES - AvatarMotion.WALK_CYCLES) * run;
    this.phase += deltaSeconds * cycles * Math.PI * 2 * Math.min(1, moving * 4);
    this.time += deltaSeconds;

    const j = this.skeleton.joints;
    const s = Math.sin(this.phase);
    const c = Math.cos(this.phase);
    const breath = Math.sin(this.time * 1.7);
    const sway = Math.sin(this.time * 0.55);

    // Legs: the thigh swings (negative x is forward) and the knee bends while the leg passes.
    const legSwing = 0.42 * walk + 0.8 * run;
    const kneeBend = 0.6 * walk + 1.3 * run;
    j.legL.rotation.x = -s * legSwing - 0.1 * run;
    j.legR.rotation.x = s * legSwing - 0.1 * run;
    j.kneeL.rotation.x = Math.max(0, c) * kneeBend + 0.06 * moving;
    j.kneeR.rotation.x = Math.max(0, -c) * kneeBend + 0.06 * moving;

    // Arms swing against the legs; when running the elbows bend.
    const armSwing = 0.32 * walk + (0.3 + this.style.runElbow * 0.25) * run;
    const spread = this.style.armSpread + breath * 0.01 * idle;
    j.shoulderL.rotation.set(s * armSwing, 0, -spread);
    j.shoulderR.rotation.set(-s * armSwing, 0, spread);
    const elbow = -(0.1 + 0.12 * walk + this.style.runElbow * run);
    j.elbowL.rotation.set(elbow, 0, 0);
    j.elbowR.rotation.set(elbow, 0, 0);
    const lift = breath * 0.006 * idle;
    j.shoulderL.position.y = this.rest.shoulderL.y + lift;
    j.shoulderR.position.y = this.rest.shoulderR.y + lift;

    // Body: bobs at every step, leans when running, sways and breathes when standing.
    const bounce = this.style.bounce;
    const bob = (1 - Math.abs(s)) * (0.025 * walk + 0.055 * run) * bounce - 0.03 * run;
    j.hips.position.set(this.rest.hips.x + sway * 0.012 * idle, this.rest.hips.y + bob, this.rest.hips.z);
    j.hips.rotation.set(0, s * (0.06 * walk + 0.1 * run), s * 0.03 * walk + sway * 0.02 * idle);
    j.spine.rotation.set(0.03 * walk + 0.2 * run + breath * 0.012 * idle, -s * (0.1 * walk + 0.16 * run), -sway * 0.012 * idle - s * 0.02 * walk);

    // The head keeps looking ahead and, when standing, looks around a little.
    j.head.rotation.set(-j.spine.rotation.x * 0.7 - breath * 0.008 * idle, -j.spine.rotation.y * 0.8 + Math.sin(this.time * 0.31) * 0.14 * idle, 0);
  }
}
