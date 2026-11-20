import type { Localizer } from "../../i18n/Localizer";

/**
 * Builds the "Contact the master on WhatsApp" link (https://wa.me/<number>?text=<message>) with a
 * ready-made message, and opens it in a new tab. Masters without a number have no link.
 */
export class WhatsAppLink {
  constructor(private readonly i18n: Localizer) {}

  /** Link about one piece, or null when the master has no WhatsApp number. */
  forPiece(number: string | null | undefined, master: string, work: string): string | null {
    return WhatsAppLink.url(number, this.i18n.t("whatsapp.pieceMessage", { master, work }));
  }

  /** Link from the master's sala (about their works in general). */
  forRoom(number: string | null | undefined, master: string): string | null {
    return WhatsAppLink.url(number, this.i18n.t("whatsapp.roomMessage", { master }));
  }

  static open(url: string): void {
    window.open(url, "_blank", "noopener");
  }

  private static url(number: string | null | undefined, message: string): string | null {
    const digits = (number ?? "").replace(/\D/g, "");
    return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : null;
  }
}
