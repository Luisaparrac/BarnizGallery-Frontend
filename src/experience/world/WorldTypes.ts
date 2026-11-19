import type { Id } from "../../domain/common";

export type CameraMode = "FIRST_PERSON" | "THIRD_PERSON";

/** The stalls of the plaza; for now only the welcome kiosk (tastes). */
export type StallKind = "welcome";

/** One piece shown inside a sala: a 2D photo in a glass display case. Texts arrive already translated. */
export interface WorldPiece {
  id: Id;
  slug: string;
  title: string;
  /** Usable image source (real URL or resolved demo picture). */
  photoUrl: string;
  /** Short line under the title on the plaque: price, "exhibition only", "in auction"... */
  caption: string;
}

/** A master's sala: the building in the plaza and the pieces inside. */
export interface WorldRoom {
  /** Stable key (store slug). */
  key: string;
  masterName: string;
  /** Text painted on the balcony banner. */
  banner: string;
  /** Text on the sign of the back wall. */
  insideSign: string;
  pieces: WorldPiece[];
  recommended: boolean;
}
