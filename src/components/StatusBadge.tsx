import { useLocale } from "../state/LocaleContext";

const TONES: Record<string, "good" | "warn" | "bad" | "info" | "plain"> = {
  ACTIVE: "good", PUBLISHED: "good", APPROVED: "good", PAID: "good", DELIVERED: "good", EXHIBITED: "good", ACCEPTED: "good", VALID: "good", RESOLVED: "good", COMPLETED: "good",
  PENDING: "warn", PENDING_PAYMENT: "warn", SUBMITTED: "warn", IN_REVIEW: "warn", SCHEDULED: "info", SENT: "info", WITH_OFFERS: "info", PREPARING: "info", SHIPPED: "info",
  IN_AUCTION: "info", RESERVED: "warn", IN_PRODUCTION: "info", GENERATING: "info", OPEN: "warn", CREATED: "warn",
  REJECTED: "bad", CANCELLED: "bad", SUSPENDED: "bad", FAILED: "bad", EXPIRED: "plain", WITHDRAWN: "plain", ARCHIVED: "plain", SOLD: "plain", DRAFT: "plain", FINISHED: "plain", SUSPICIOUS: "bad", DISCARDED: "plain", DELETED: "bad",
};

/** Colored label for an enum value; the text comes from the "status.<kind>.<value>" translations. */
export function StatusBadge({ kind, value }: { kind: string; value: string }) {
  const { i18n } = useLocale();
  return <span className={`badge badge-${TONES[value] ?? "plain"}`}>{i18n.tx(`status.${kind}.${value}`, value)}</span>;
}
