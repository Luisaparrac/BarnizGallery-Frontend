import { AppError } from "../domain/errors";
import { useLocale } from "../state/LocaleContext";

/** Turns any error into a sentence in the active language. */
export function useErrorText(): (error: unknown) => string {
  const { i18n } = useLocale();
  return (error: unknown) => {
    if (error instanceof AppError) return i18n.tx(`error.${error.code}`, error.message, error.params);
    if (error instanceof Error) return error.message;
    return i18n.t("error.server");
  };
}
