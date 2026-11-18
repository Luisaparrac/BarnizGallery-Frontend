import { useState } from "react";
import type { Id } from "../domain/common";
import type { ReportEntity } from "../domain/gallery";
import { useErrorText } from "../hooks/useErrorText";
import { services } from "../services/ServiceRegistry";
import { useLocale } from "../state/LocaleContext";
import { useSession } from "../state/SessionContext";
import { useToast } from "../state/ToastContext";
import { Field } from "./Field";
import { Icon } from "./Icon";
import { Modal } from "./Modal";

/** Lets a signed-in user report a piece, a store or a request to the administrator. */
export function ReportButton({ entityType, entityId }: { entityType: ReportEntity; entityId: Id }) {
  const { user } = useSession();
  const { i18n } = useLocale();
  const toast = useToast();
  const errorText = useErrorText();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const send = async () => {
    setBusy(true);
    try {
      await services.gallery.report({ entityType, entityId, reason });
      toast.show(i18n.t("report.sent"), "success");
      setOpen(false);
      setReason("");
    } catch (error) {
      toast.show(errorText(error), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button type="button" className="btn btn-link" onClick={() => setOpen(true)}>
        <Icon name="flag" size={16} /> {i18n.t("report.action")}
      </button>
      <Modal title={i18n.t("report.title")} open={open} onClose={() => setOpen(false)}>
        <Field label={i18n.t("report.reason")} hint={i18n.t("report.hint")}>
          <textarea rows={4} value={reason} onChange={(event) => setReason(event.target.value)} />
        </Field>
        <div className="actions">
          <button type="button" className="btn btn-quiet" onClick={() => setOpen(false)}>
            {i18n.t("common.cancel")}
          </button>
          <button type="button" className="btn btn-primary" disabled={busy || reason.trim().length < 10} onClick={() => void send()}>
            {i18n.t("report.send")}
          </button>
        </div>
      </Modal>
    </>
  );
}
