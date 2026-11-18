import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { VisitorSetupStore } from "../core/VisitorSetupStore";
import type { Language } from "../domain/common";
import { Localizer } from "../i18n/Localizer";
import { Formatter } from "../utils/Formatter";

interface LocaleValue {
  language: Language;
  setLanguage(language: Language): void;
  i18n: Localizer;
  format: Formatter;
}

const LocaleContext = createContext<LocaleValue | null>(null);

function initialLanguage(): Language {
  return VisitorSetupStore.loadLanguage() ?? (navigator.language.toLowerCase().startsWith("es") ? "es" : "en");
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);
  const value = useMemo<LocaleValue>(
    () => ({
      language,
      setLanguage(next) {
        VisitorSetupStore.saveLanguage(next);
        document.documentElement.lang = next;
        setLanguageState(next);
      },
      i18n: new Localizer(language),
      format: new Formatter(language),
    }),
    [language],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale outside LocaleProvider");
  return value;
}
