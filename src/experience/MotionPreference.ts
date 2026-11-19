/**
 * The visitor's "reduce motion" setting of the operating system. When it is on, the camera cuts
 * instead of gliding and the avatars do not step or wave; fades and glows stay.
 */
export class MotionPreference {
  private static readonly query = window.matchMedia("(prefers-reduced-motion: reduce)");

  /** Read every time, so a change of the setting applies at once. */
  static get reduced(): boolean {
    return MotionPreference.query.matches;
  }
}
