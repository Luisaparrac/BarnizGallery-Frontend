import type { TransformNode } from "@babylonjs/core";

/**
 * What the player controller and the lobby pedestals need from an avatar, no matter if it is the
 * procedural one or a .glb model. The root sits at the feet and local +z is "forward".
 */
export interface AvatarModel {
  readonly root: TransformNode;
  setVisible(visible: boolean): void;
  /** Advances the animation. `speed` is 0 (idle), 1 (walking) or ~1.8 (running). */
  animate(deltaSeconds: number, speed: number): void;
  /** A short wave of the right hand (when the avatar is chosen in the lobby). */
  wave(): void;
  dispose(): void;
}
