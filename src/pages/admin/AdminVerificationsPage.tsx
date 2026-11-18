import { useState } from "react";
import { ArtImage } from "../../components/ArtImage";
import { EmptyState, ErrorNote, Loading } from "../../components/Feedback";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import { AppEvents } from "../../core/AppEvents";
import { useAsync } from "../../hooks/useAsync";
import { useErrorText } from "../../hooks/useErrorText";
import { services } from "../../services/ServiceRegistry";
import { useLocale } from "../../state/LocaleContext";
import { useToast } from "../../state/ToastContext";

/** Artisans waiting for review: each step with its evidence, approved or rejected with a note. */
export function AdminVerificationsPage() {
  const { i18n, format } = useLocale();
  const toast = useToast();
  const errorText = useErrorText();
  const list = useAsync(() => services.admin.listPendingVerifications(), []);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [zoom, setZoom] = useState<string | null>(null);

  const review = async (stepId: number, approved: boolean) => {
    try {
      await services.admin.reviewStep(stepId, approved, notes[stepId] ?? "");
      AppEvents.notificationsChanged.emit();
      await list.reload();
    } catch (error) {
      toast.show(errorText(error), "error");
    }
  };

  return (
    <>
      <PageHeader title={i18n.t("adminVerify.title")} lead={i18n.t("adminVerify.lead")} />
      {list.loading && !list.data && <Loading />}
      {list.error !== null && <ErrorNote error={list.error} />}
      {list.data && !list.data.length && <EmptyState title={i18n.t("adminVerify.empty")} />}
      {list.data?.map((entry) => (
        <section key={entry.masterId} className="block">
          <div className="block-head">
            <div>
              <h2 className="h3">{entry.masterName}</h2>
              <p className="muted">
                {entry.workshop} — {entry.email} — {i18n.t("adminVerify.since", { date: format.date(entry.requestedAt) })}
              </p>
            </div>
            <StatusBadge kind="verification" value={entry.verificationStatus} />
          </div>
          <table className="table">
            <tbody>
              {entry.steps.map((step) => (
                <tr key={step.id}>
                  <td>{i18n.tx(`verification.step.${step.step}`)}</td>
                  <td>
                    <StatusBadge kind="step" value={step.status} />
                  </td>
                  <td>
                    {step.evidenceUrl ? (
                      <button type="button" className="evidence-btn" onClick={() => setZoom(step.evidenceUrl)} aria-label={i18n.t("adminVerify.seeEvidence")}>
                        <ArtImage src={step.evidenceUrl} alt="" />
                      </button>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    {(step.status === "SUBMITTED" || (step.step === "ADMIN_APPROVAL" && step.status === "PENDING")) && (
                      <div className="review">
                        <input placeholder={i18n.t("adminVerify.note")} aria-label={i18n.t("adminVerify.note")} value={notes[step.id] ?? ""} onChange={(event) => setNotes({ ...notes, [step.id]: event.target.value })} />
                        <button type="button" className="btn btn-quiet" onClick={() => void review(step.id, false)}>
                          {i18n.t("adminVerify.reject")}
                        </button>
                        <button type="button" className="btn btn-primary" onClick={() => void review(step.id, true)}>
                          {step.step === "ADMIN_APPROVAL" ? i18n.t("adminVerify.approveArtisan") : i18n.t("adminVerify.approve")}
                        </button>
                      </div>
                    )}
                    {step.notes && <span className="muted">{step.notes}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      {zoom && (
        <div className="zoom-layer" role="dialog" onClick={() => setZoom(null)}>
          <ArtImage src={zoom} alt={i18n.t("adminVerify.seeEvidence")} />
        </div>
      )}
    </>
  );
}
