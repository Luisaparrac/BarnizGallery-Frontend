import { TransformNode, Vector3, type Scene } from "@babylonjs/core";
import type { AvatarBody, JointName } from "./AvatarTypes";

/**
 * The joints of a procedural avatar: a small hierarchy of nodes (hips → spine → head and arms,
 * hips → legs). It is created at rest, without rotations, so a joint's place in avatar space is
 * simply the sum of the offsets above it.
 */
export class AvatarSkeleton {
  readonly joints: Record<JointName, TransformNode>;
  /** Rest position of each joint in avatar space. */
  private readonly places: Record<JointName, Vector3>;

  constructor(scene: Scene, root: TransformNode, body: AvatarBody) {
    const sx = body.shoulderWidth;
    const hx = body.hipWidth;
    this.places = {
      hips: new Vector3(0, body.hipHeight, 0),
      spine: new Vector3(0, body.waistHeight, 0),
      head: new Vector3(0, body.neckHeight, 0),
      shoulderL: new Vector3(-sx, body.shoulderHeight, 0),
      shoulderR: new Vector3(sx, body.shoulderHeight, 0),
      elbowL: new Vector3(-sx, body.elbowHeight, 0),
      elbowR: new Vector3(sx, body.elbowHeight, 0),
      legL: new Vector3(-hx, body.hipHeight, 0),
      legR: new Vector3(hx, body.hipHeight, 0),
      kneeL: new Vector3(-hx, body.kneeHeight, 0),
      kneeR: new Vector3(hx, body.kneeHeight, 0),
    };
    const parents: Record<JointName, JointName | null> = {
      hips: null,
      spine: "hips",
      head: "spine",
      shoulderL: "spine",
      shoulderR: "spine",
      elbowL: "shoulderL",
      elbowR: "shoulderR",
      legL: "hips",
      legR: "hips",
      kneeL: "legL",
      kneeR: "legR",
    };
    const joints = {} as Record<JointName, TransformNode>;
    for (const name of Object.keys(parents) as JointName[]) {
      const node = new TransformNode(`${root.name}-${name}`, scene);
      const parent = parents[name];
      node.parent = parent ? joints[parent] : root;
      node.position.copyFrom(parent ? this.places[name].subtract(this.places[parent]) : this.places[name]);
      joints[name] = node;
    }
    this.joints = joints;
  }

  /** Rest position of a joint in avatar space. */
  place(name: JointName): Vector3 {
    return this.places[name];
  }

  /** Rest offset of a joint from its parent (the motion adds to it). */
  restOffset(name: JointName): Vector3 {
    const node = this.joints[name];
    const parent = (Object.keys(this.joints) as JointName[]).find((other) => this.joints[other] === node.parent);
    return parent ? this.places[name].subtract(this.places[parent]) : this.places[name].clone();
  }
}
