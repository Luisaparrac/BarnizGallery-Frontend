import { EmptyState } from "../components/Feedback";
import { useLocale } from "../state/LocaleContext";

/** Shown to a customer who signs in to the panel: their account is used in the 3D museum. */
export function CustomerNotice() {
  const { i18n } = useLocale();
  return (
    <div className="container narrow">
      <EmptyState
        title={i18n.t("panel.customerTitle")}
        text={i18n.t("panel.customerText")}
        action={
          <a className="btn btn-primary" href="/">
            {i18n.t("nav.museum")}
          </a>
        }
      />
    </div>
  );
}
