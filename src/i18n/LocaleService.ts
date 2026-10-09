import { Signal } from "../core/Signal";
import type { Language } from "../model/models";
import { TRANSLATIONS, type TranslationKey } from "./translations";

/** Holds the active language and resolves translation keys (singleton + observer). */
export class LocaleService {
  private static shared: LocaleService | null = null;

  static get instance(): LocaleService {
    return (LocaleService.shared ??= new LocaleService());
  }

  readonly changed = new Signal<Language>();
  private current: Language = "es";

  private constructor() {}

  get language(): Language {
    return this.current;
  }

  setLanguage(language: Language): void {
    if (language === this.current) return;
    this.current = language;
    document.documentElement.lang = language;
    this.changed.emit(language);
  }

  translate(key: TranslationKey, vars: Record<string, string | number> = {}): string {
    let text: string = TRANSLATIONS[this.current][key];
    for (const [name, value] of Object.entries(vars)) text = text.replace(`{${name}}`, String(value));
    return text;
  }

  /** Picks the Spanish or English variant of a bilingual field. */
  pick(es: string, en: string): string {
    return this.current === "es" ? es : en;
  }
}

/** Shorthand for `LocaleService.instance.translate`. */
export const t = (key: TranslationKey, vars?: Record<string, string | number>): string =>
  LocaleService.instance.translate(key, vars);
