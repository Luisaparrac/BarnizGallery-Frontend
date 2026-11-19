/** A point in avatar space: meters, origin at the feet, +y up and +z forward (its right is +x). */
export type Point = [number, number, number];

/** The moving parts of an avatar; the pieces of each one are merged into a single mesh. */
export type JointName = "hips" | "spine" | "head" | "shoulderL" | "shoulderR" | "elbowL" | "elbowR" | "legL" | "legR" | "kneeL" | "kneeR";

/** Heights and widths of the body (all avatars share them, so they look like one family). */
export interface AvatarBody {
  /** Height of the hip joints. */
  hipHeight: number;
  /** Half the distance between the legs. */
  hipWidth: number;
  kneeHeight: number;
  /** Height of the waist, where the upper body bends. */
  waistHeight: number;
  shoulderHeight: number;
  /** Half the distance between the shoulders. */
  shoulderWidth: number;
  elbowHeight: number;
  wristHeight: number;
  /** Height of the base of the neck, where the head turns. */
  neckHeight: number;
  /** Center of the head. */
  headHeight: number;
  headSize: number;
}

/** How an avatar moves: how far its arms rest from the body, how it bounces, how it runs. */
export interface MotionStyle {
  armSpread: number;
  bounce: number;
  /** Elbow bend when running (less under a ruana, so the arms stay under the cloth). */
  runElbow: number;
  /** Length of the steps (shorter under a long skirt). */
  stride: number;
}
