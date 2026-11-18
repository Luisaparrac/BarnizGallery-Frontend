import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppEvents } from "../core/AppEvents";
import type { Id } from "../domain/common";
import { useErrorText } from "../hooks/useErrorText";
import { services } from "../services/ServiceRegistry";
import { useLocale } from "../state/LocaleContext";
import { useToast } from "../state/ToastContext";
import { Field } from "./Field";
import { Modal } from "./Modal";

export interface ContactTarget {
  masterId: Id;
  masterName: string;
  subject: string;
  artworkId?: Id;
  customRequestId?: Id;
  orderId?: Id;
}

/** First message to a master; opens the conversation afterwards. */
export function ContactMasterModal({ target, onClose }: { target: ContactTarget | null; onClose(): void }) {
  const { i18n } = useLocale();
  const navigate = useNavigate();
  const toast = useToast();
  const errorText = useErrorText();
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!target) return;
    setBusy(true);
    try {
      const conversation = await services.messaging.start({ ...target, content });
      AppEvents.messagesChanged.emit();
      setContent("");
      onClose();
      navigate(`/messages/${conversation.id}`);
    } catch (error) {
      toast.show(errorText(error), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={i18n.t("contact.title", { name: target?.masterName ?? "" })} open={!!target} onClose={onClose}>
      <p className="muted">{target?.subject}</p>
      <Field label={i18n.t("contact.message")}>
        <textarea rows={5} value={content} onChange={(event) => setContent(event.target.value)} placeholder={i18n.t("contact.placeholder")} />
      </Field>
      <div className="actions">
        <button type="button" className="btn btn-quiet" onClick={onClose}>
          {i18n.t("common.cancel")}
        </button>
        <button type="button" className="btn btn-primary" disabled={busy || !content.trim()} onClick={() => void send()}>
          {i18n.t("contact.send")}
        </button>
      </div>
    </Modal>
  );
}
