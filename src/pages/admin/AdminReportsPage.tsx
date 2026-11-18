import { Link } from "react-router-dom";
import { EmptyState, ErrorNote, Loading } from "../../components/Feedback";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import type { ContentReport } from "../../domain/admin";
import { useAsync } from "../../hooks/useAsync";
import { useErrorText } from "../../hooks/useErrorText";
import { services } from "../../services/ServiceRegistry";
import { useLocale } from "../../state/LocaleContext";
import { useToast } from "../../state/ToastContext";

function entityLink(report: ContentReport): string | null {
  if (report.entityType === "ARTWORK") return `/artworks/${report.entityId}`;
  return null;
}

export function AdminReportsPage() {
  const { i18n, format } = useLocale();
  const toast = useToast();
  const errorText = useErrorText();
  const reports = useAsync(() => services.admin.listReports(), []);
  const resolve = async (id: number, status: "RESOLVED" | "DISCARDED") => {
    try {
      await services.admin.resolveReport(id, status);
      await reports.reload();
    } catch (error) {
      toast.show(errorText(error), "error");
    }
  };
  return (
    <>
      <PageHeader title={i18n.t("adminReports.title")} />
      {reports.loading && !reports.data && <Loading />}
      {reports.error !== null && <ErrorNote error={reports.error} />}
      {reports.data && !reports.data.length && <EmptyState title={i18n.t("adminReports.empty")} />}
      <ul className="report-list">
        {reports.data?.map((report) => {
          const link = entityLink(report);
          return (
            <li key={report.id}>
              <div>
                <strong>
                  {i18n.tx(`report.entity.${report.entityType}`)}: {link ? <Link to={link}>{report.entityLabel}</Link> : report.entityLabel}
                </strong>
                <p>{report.reason}</p>
                <small className="muted">
                  {report.reporterName} — {format.dateTime(report.createdAt)}
                </small>
              </div>
              <div className="actions">
                <StatusBadge kind="report" value={report.status} />
                {report.status === "OPEN" && (
                  <>
                    <button type="button" className="btn btn-quiet" onClick={() => void resolve(report.id, "DISCARDED")}>
                      {i18n.t("adminReports.discard")}
                    </button>
                    <button type="button" className="btn btn-primary" onClick={() => void resolve(report.id, "RESOLVED")}>
                      {i18n.t("adminReports.resolve")}
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
