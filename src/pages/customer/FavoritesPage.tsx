import { Link } from "react-router-dom";
import { ArtworkGrid } from "../../components/ArtworkCard";
import { EmptyState, ErrorNote, Loading } from "../../components/Feedback";
import { PageHeader } from "../../components/PageHeader";
import { useAsync } from "../../hooks/useAsync";
import { services } from "../../services/ServiceRegistry";
import { useLocale } from "../../state/LocaleContext";

export function FavoritesPage() {
  const { i18n } = useLocale();
  const favorites = useAsync(() => services.gallery.listFavorites(), []);
  return (
    <div className="container">
      <PageHeader title={i18n.t("favorites.title")} />
      {favorites.loading && <Loading />}
      {favorites.error !== null && <ErrorNote error={favorites.error} />}
      {favorites.data && (favorites.data.length ? <ArtworkGrid items={favorites.data} /> : <EmptyState title={i18n.t("favorites.empty")} text={i18n.t("favorites.emptyText")} action={<Link className="btn btn-primary" to="/gallery">{i18n.t("nav.gallery")}</Link>} />)}
    </div>
  );
}
