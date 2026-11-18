import type { Language } from "../domain/common";
import type { VisitorSetup } from "../domain/taste";

const KEY = "museo.visitor";
const LANG_KEY = "museo.language";

/** What a visitor chose before creating an account: language, avatar and questionnaire. */
export class VisitorSetupStore {
  static load(): VisitorSetup {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw) as VisitorSetup;
    } catch {
      /* ignore */
    }
    return { completed: false, avatarId: null, taste: null };
  }

  static save(setup: VisitorSetup): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(setup));
    } catch {
      /* ignore */
    }
  }

  static loadLanguage(): Language | null {
    try {
      const value = localStorage.getItem(LANG_KEY);
      return value === "es" || value === "en" ? value : null;
    } catch {
      return null;
    }
  }

  static saveLanguage(language: Language): void {
    try {
      localStorage.setItem(LANG_KEY, language);
    } catch {
      /* ignore */
    }
  }
}
