/**
 * One part of the experience with its own 3D scene (State): the lobby or the plaza. The experience
 * shows one at a time and disposes it before moving to the next.
 */
export interface Stage {
  dispose(): void;
}
