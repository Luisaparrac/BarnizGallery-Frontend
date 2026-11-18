import type { ReactNode } from "react";
import { useErrorText } from "../hooks/useErrorText";
import { useLocale } from "../state/LocaleContext";

export function Loading({ label }: { label?: string }) {
  const { i18n } = useLocale();
  return (
    <div className="loading" role="status">
      <span className="loading-bar" />
      <span>{label ?? i18n.t("common.loading")}</span>
    </div>
  );
}

export function ErrorNote({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const text = useErrorText();
  const { i18n } = useLocale();
  return (
    <div className="note note-error" role="alert">
      <span>{text(error)}</span>
      {onRetry && (
        <button type="button" className="btn btn-quiet" onClick={onRetry}>
          {i18n.t("common.retry")}
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {text && <p className="empty-text">{text}</p>}
      {action}
    </div>
  );
}

export function Note({ tone = "info", children }: { tone?: "info" | "warn" | "success" | "error"; children: ReactNode }) {
  return <div className={`note note-${tone}`}>{children}</div>;
}
