import { useEffect, useRef, type ReactNode } from "react";
import { useLocale } from "../state/LocaleContext";
import { Icon } from "./Icon";

/** Native <dialog> with a title and a close button; Esc closes it. */
export function Modal({ title, open, onClose, children, wide }: { title: string; open: boolean; onClose(): void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { i18n } = useLocale();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog ref={ref} className={`modal${wide ? " modal-wide" : ""}`} onClose={onClose} onCancel={onClose}>
      <header className="modal-head">
        <h2>{title}</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label={i18n.t("common.close")}>
          <Icon name="close" />
        </button>
      </header>
      {open && <div className="modal-body">{children}</div>}
    </dialog>
  );
}
