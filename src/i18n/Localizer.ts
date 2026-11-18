import type { Language } from "../domain/common";
import { messages } from "./messages";

export type MessageKey = keyof typeof messages.es;
export type MessageParams = Record<string, string | number>;

/** Translates interface texts and picks the right language of bilingual data. */
export class Localizer {
  constructor(readonly language: Language) {}

  t(key: MessageKey, params?: MessageParams): string {
    const table = messages[this.language] as Record<string, string>;
    let text = table[key] ?? (messages.es as Record<string, string>)[key] ?? key;
    if (params) for (const [name, value] of Object.entries(params)) text = text.split(`{${name}}`).join(String(value));
    return text;
  }

  /** Translation for a dynamic key (enum values), with a fallback when it is missing. */
  tx(key: string, fallback?: string, params?: MessageParams): string {
    const table = messages[this.language] as Record<string, string>;
    let text = table[key] ?? fallback ?? key;
    if (params) for (const [name, value] of Object.entries(params)) text = text.split(`{${name}}`).join(String(value));
    return text;
  }

  pick(es: string, en: string): string {
    return this.language === "es" ? es || en : en || es;
  }

  name(item: { nameEs: string; nameEn: string } | undefined | null): string {
    return item ? this.pick(item.nameEs, item.nameEn) : "";
  }
}
