import { AppError } from "../../domain/errors";
import type { Localizer } from "../../i18n/Localizer";

/** Turns an error from the services into a sentence for the visitor (same texts as the panel). */
export class ErrorText {
  static of(i18n: Localizer, error: unknown): string {
    if (error instanceof AppError) return i18n.tx(`error.${error.code}`, error.message, error.params);
    if (error instanceof TypeError) return i18n.t("error.network");
    return i18n.t("error.server");
  }
}
