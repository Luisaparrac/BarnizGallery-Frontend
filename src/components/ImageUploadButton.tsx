import { useRef, useState } from "react";
import { useErrorText } from "../hooks/useErrorText";
import { services } from "../services/ServiceRegistry";
import { useLocale } from "../state/LocaleContext";
import { useToast } from "../state/ToastContext";
import { Icon } from "./Icon";

/** Picks an image file, uploads it and returns its URL. */
export function ImageUploadButton({ onUploaded, label, multiple = false }: { onUploaded(url: string): void; label?: string; multiple?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { i18n } = useLocale();
  const toast = useToast();
  const errorText = useErrorText();

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) onUploaded(await services.artisan.uploadImage(file));
    } catch (error) {
      toast.show(errorText(error), "error");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <>
      <input ref={input} type="file" accept="image/*" multiple={multiple} hidden onChange={(event) => void upload(event.target.files)} />
      <button type="button" className="btn btn-quiet" onClick={() => input.current?.click()} disabled={busy}>
        <Icon name="upload" /> {busy ? i18n.t("common.uploading") : (label ?? i18n.t("common.uploadImage"))}
      </button>
    </>
  );
}
