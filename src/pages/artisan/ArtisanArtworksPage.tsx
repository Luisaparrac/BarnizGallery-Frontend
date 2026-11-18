import { Link } from "react-router-dom";
import { ArtImage } from "../../components/ArtImage";
import { EmptyState, ErrorNote, Loading } from "../../components/Feedback";
import { Icon } from "../../components/Icon";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { useErrorText } from "../../hooks/useErrorText";
import { services } from "../../services/ServiceRegistry";
import { useLocale } from "../../state/LocaleContext";
import { useToast } from "../../state/ToastContext";

export function ArtisanArtworksPage() {
  const { i18n, format } = useLocale();
  const toast = useToast();
  const errorText = useErrorText();
  const artworks = useAsync(() => services.artisan.listMyArtworks(), []);

  const remove = async (id: number, title: string) => {
    if (!window.confirm(i18n.t("artworks.deleteConfirm", { title }))) return;
    try {
      await services.artisan.deleteArtwork(id);
      await artworks.reload();
    } catch (error) {
      toast.show(errorText(error), "error");
    }
  };

  return (
    <>
      <PageHeader
        title={i18n.t("artworks.title")}
        actions={
          <Link to="/artisan/artworks/new" className="btn btn-primary">
            <Icon name="plus" /> {i18n.t("artworks.new")}
          </Link>
        }
      />
      {artworks.loading && !artworks.data && <Loading />}
      {artworks.error !== null && <ErrorNote error={artworks.error} />}
      {artworks.data && !artworks.data.length && <EmptyState title={i18n.t("artworks.empty")} />}
      {artworks.data && artworks.data.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>{i18n.t("artworks.piece")}</th>
              <th>{i18n.t("artworks.mode")}</th>
              <th>{i18n.t("artworks.price")}</th>
              <th>{i18n.t("artworks.stock")}</th>
              <th>{i18n.t("orders.status")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {artworks.data.map((artwork) => {
              const title = i18n.pick(artwork.titleEs, artwork.titleEn);
              return (
                <tr key={artwork.id}>
                  <td>
                    <span className="cell-with-image">
                      <ArtImage src={artwork.photos.find((photo) => photo.isPrimary)?.url ?? artwork.photos[0]?.url} alt="" />
                      <Link to={`/artisan/artworks/${artwork.id}`}>{title}</Link>
                    </span>
                  </td>
                  <td>{i18n.tx(`status.saleMode.${artwork.saleMode}`)}</td>
                  <td>{artwork.price !== null ? format.money(artwork.price, artwork.currency) : "—"}</td>
                  <td>{artwork.stock}</td>
                  <td>
                    <StatusBadge kind="artwork" value={artwork.status} />
                  </td>
                  <td className="row-actions">
                    <button type="button" className="icon-btn" aria-label={i18n.t("common.delete")} onClick={() => void remove(artwork.id, title)}>
                      <Icon name="trash" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
