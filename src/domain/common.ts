export type Language = "es" | "en";

/** Text stored in both interface languages. */
export interface LocalizedText {
  es: string;
  en: string;
}

export type Id = number;
/** ISO-8601 date-time in UTC. */
export type IsoDate = string;
