import { Link } from "react-router-dom";
import { EmptyState } from "../../components/Feedback";
import { useLocale } from "../../state/LocaleContext";

export function NotFoundPage() {
  const { i18n } = useLocale();
  return (
    <div className="container">
      <EmptyState
        title={i18n.t("notFound.title")}
        text={i18n.t("notFound.text")}
        action={
          <Link to="/gallery" className="btn btn-primary">
            {i18n.t("nav.gallery")}
          </Link>
        }
      />
    </div>
  );
}
