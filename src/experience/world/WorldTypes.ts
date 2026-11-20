import type { Id } from "../../domain/common";

export type CameraMode = "FIRST_PERSON" | "THIRD_PERSON";

/** The counters of the plaza: the welcome kiosk (tastes), the cashier and the front desk of the commissions hall. */
export type StallKind = "welcome" | "cashier" | "commissions";

/** One piece shown in a sala: its main photo, framed on the wall. Texts arrive already translated. */
export interface WorldPiece {
  id: Id;
  slug: string;
  title: string;
  /** Usable image source (real URL or resolved demo picture). */
  photoUrl: string;
  /** Width / height of the photo, so the frame keeps its real proportion. */
  photoAspect: number;
  masterName: string;
  technique: string;
  /** "40 × 20 × 14 cm", or empty when the measures are unknown. */
  dimensions: string;
  /** Last line of the plaque: price, "exhibition only", "in auction"... */
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
  /** The master's WhatsApp number, or null: the sala then has no contact lectern. */
  whatsapp: string | null;
  /** Text of the contact lectern, translated. */
  contactLabel: string;
}

/** One frame of the design wall in the commissions hall. Texts arrive already translated. */
export interface HallDesign {
  /** The visitor's custom order it belongs to; null for the examples shown to guests. */
  requestId: Id | null;
  /** Usable image source. */
  imageUrl: string;
  /** Line on the small plaque under the frame. */
  label: string;
}

/** What the offers chalkboard of the commissions hall says. */
export interface HallBoard {
  title: string;
  /** Big figure in the middle (the number of new offers), or null to leave it out. */
  count: number | null;
  /** One or two lines under the figure. */
  lines: string[];
}

/** Fixed texts of the commissions hall, translated. */
export interface HallTexts {
  /** Big sign over the door, in two lines. */
  facade: [string, string];
  /** Sign on the back wall inside. */
  inside: string;
}
