import type { CustomDesign } from "../../domain/customOrder";
import type { Localizer } from "../../i18n/Localizer";

/**
 * Why an AI design failed, in the visitor's language. The backend has no column for the reason, so a FAILED
 * design keeps it in `prompt` as "error <code>: <message in English>"; known codes get their own text.
 */
export class DesignFailureText {
  private static readonly PATTERN = /^error ([a-z0-9_]+):/;

  static of(i18n: Localizer, design: CustomDesign): string {
    const code = DesignFailureText.PATTERN.exec(design.prompt ?? "")?.[1];
    const generic = i18n.t("custom.designFailed");
    if (!code) return generic;
    const camel = code.replace(/_([a-z0-9])/g, (_, letter: string) => letter.toUpperCase());
    return i18n.tx(`custom.designFailed.${camel}`, generic);
  }
}
