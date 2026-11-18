import { ErrorNote, Loading } from "../../components/Feedback";
import { PageHeader } from "../../components/PageHeader";
import { useAsync } from "../../hooks/useAsync";
import { services } from "../../services/ServiceRegistry";
import { useLocale } from "../../state/LocaleContext";

/** Who changed what (audit_log), newest first. */
export function AdminAuditPage() {
  const { i18n, format } = useLocale();
  const audit = useAsync(() => services.admin.listAudit(), []);
  return (
    <>
      <PageHeader title={i18n.t("adminAudit.title")} lead={i18n.t("adminAudit.lead")} />
      {audit.loading && !audit.data && <Loading />}
      {audit.error !== null && <ErrorNote error={audit.error} />}
      {audit.data && (
        <table className="table">
          <thead>
            <tr>
              <th>{i18n.t("auction.when")}</th>
              <th>{i18n.t("adminAudit.who")}</th>
              <th>{i18n.t("adminAudit.table")}</th>
              <th>{i18n.t("adminAudit.operation")}</th>
              <th>{i18n.t("adminAudit.change")}</th>
            </tr>
          </thead>
          <tbody>
            {audit.data.map((entry) => (
              <tr key={entry.id}>
                <td>{format.dateTime(entry.changedAt)}</td>
                <td>{entry.userName ?? i18n.t("adminAudit.system")}</td>
                <td>
                  <code>
                    {entry.tableName} #{entry.rowId}
                  </code>
                </td>
                <td>{i18n.tx(`adminAudit.op.${entry.operation}`)}</td>
                <td>{entry.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
