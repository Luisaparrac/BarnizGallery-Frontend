import type { Language } from "../domain/common";

/** Money and date formats for the active language. */
export class Formatter {
  constructor(private readonly language: Language) {}

  private get locale(): string {
    return this.language === "es" ? "es-CO" : "en-US";
  }

  money(amount: number | null | undefined, currency = "USD"): string {
    if (amount === null || amount === undefined) return "—";
    return new Intl.NumberFormat(this.locale, { style: "currency", currency, maximumFractionDigits: amount % 1 ? 2 : 0 }).format(amount);
  }

  date(iso: string | null | undefined): string {
    if (!iso) return "—";
    return new Intl.DateTimeFormat(this.locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
  }

  dateTime(iso: string | null | undefined): string {
    if (!iso) return "—";
    return new Intl.DateTimeFormat(this.locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  }

  relative(iso: string): string {
    const seconds = (Date.parse(iso) - Date.now()) / 1000;
    const format = new Intl.RelativeTimeFormat(this.locale, { numeric: "auto" });
    const abs = Math.abs(seconds);
    if (abs < 60) return format.format(Math.round(seconds), "second");
    if (abs < 3600) return format.format(Math.round(seconds / 60), "minute");
    if (abs < 86400) return format.format(Math.round(seconds / 3600), "hour");
    return format.format(Math.round(seconds / 86400), "day");
  }

  centimeters(width: number | null, height: number | null, depth: number | null): string {
    const parts = [width, height, depth].filter((value): value is number => value !== null);
    return parts.length ? `${parts.join(" × ")} cm` : "—";
  }
}
