import { ArtImage } from "../../components/ArtImage";
import { ErrorNote, Loading, Note } from "../../components/Feedback";
import { ImageUploadButton } from "../../components/ImageUploadButton";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import { AppConfig } from "../../config/AppConfig";
import type { VerificationStep } from "../../domain/gallery";
import { useAsync } from "../../hooks/useAsync";
import { useErrorText } from "../../hooks/useErrorText";
import { services } from "../../services/ServiceRegistry";
import { useLocale } from "../../state/LocaleContext";
import { useSession } from "../../state/SessionContext";
import { useToast } from "../../state/ToastContext";

/** The five verification steps an artisan completes before publishing: email, identity, workshop, samples, approval. */
export function VerificationPage() {
  const { i18n, format } = useLocale();
  const { user, updateUser } = useSession();
  const toast = useToast();
  const errorText = useErrorText();
  const data = useAsync(async () => {
    const [master, steps] = await Promise.all([services.artisan.getMyMaster(), services.artisan.getVerification()]);
    return { master, steps };
  }, []);

  const submit = async (step: VerificationStep, url: string) => {
    try {
      const steps = await services.artisan.submitStep(step.step, url);
      data.setData({ ...data.data!, steps });
      toast.show(i18n.t("verification.sent"), "success");
    } catch (error) {
      toast.show(errorText(error), "error");
    }
  };

  const verifyEmail = async () => {
    try {
      await services.auth.verifyEmail("demo");
      if (user) updateUser({ ...user, emailVerified: true });
      await data.reload();
    } catch (error) {
      toast.show(errorText(error), "error");
    }
  };

  if (data.loading && !data.data) return <Loading />;
  if (data.error !== null || !data.data) return <ErrorNote error={data.error} />;
  const { master, steps } = data.data;
  return (
    <>
      <PageHeader title={i18n.t("verification.title")} lead={<>{i18n.t("verification.lead")} <StatusBadge kind="verification" value={master.verificationStatus} /></>} />
      {master.verificationStatus === "APPROVED" && <Note tone="success">{i18n.t("verification.approved")}</Note>}
      <ol className="verify-steps">
        {steps.map((step) => (
          <li key={step.id} className={`verify-step is-${step.status.toLowerCase()}`}>
            <div className="verify-head">
              <h2 className="h3">{i18n.tx(`verification.step.${step.step}`)}</h2>
              <StatusBadge kind="step" value={step.status} />
            </div>
            <p className="muted">{i18n.tx(`verification.help.${step.step}`)}</p>
            {step.notes && <Note tone={step.status === "REJECTED" ? "error" : "info"}>{step.notes}</Note>}
            {step.evidenceUrl && <ArtImage className="evidence" src={step.evidenceUrl} alt={i18n.tx(`verification.step.${step.step}`)} />}
            {step.reviewedAt && <p className="muted">{i18n.t("verification.reviewedOn", { date: format.date(step.reviewedAt) })}</p>}
            {step.step === "EMAIL" && step.status !== "APPROVED" && (
              <p>
                {i18n.t("verification.emailSent", { email: user?.email ?? "" })}{" "}
                {!AppConfig.usesApi("auth") && (
                  <button type="button" className="btn btn-link" onClick={() => void verifyEmail()}>
                    {i18n.t("profile.verifyDemo")}
                  </button>
                )}
              </p>
            )}
            {["IDENTITY", "WORKSHOP", "SAMPLES"].includes(step.step) && step.status !== "APPROVED" && (
              <ImageUploadButton label={step.evidenceUrl ? i18n.t("verification.replace") : i18n.t("verification.upload")} onUploaded={(url) => void submit(step, url)} />
            )}
          </li>
        ))}
      </ol>
    </>
  );
}
