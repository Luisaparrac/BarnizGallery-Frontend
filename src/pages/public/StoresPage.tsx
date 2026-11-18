import { Link } from "react-router-dom";
import { ArtImage } from "../../components/ArtImage";
import { ErrorNote, Loading } from "../../components/Feedback";
import { PageHeader } from "../../components/PageHeader";
import { ResinBand } from "../../components/ResinBand";
import { useAsync } from "../../hooks/useAsync";
import { services } from "../../services/ServiceRegistry";
import { useLocale } from "../../state/LocaleContext";

export function StoresPage() {
  const { i18n } = useLocale();
  const stores = useAsync(() => services.gallery.listStores(), []);
  return (
    <div className="container">
      <PageHeader title={i18n.t("stores.title")} lead={i18n.t("stores.lead")} />
      {stores.loading && <Loading />}
      {stores.error !== null && <ErrorNote error={stores.error} onRetry={() => void stores.reload()} />}
      <div className="store-grid">
        {stores.data?.map(({ store, master, artworkCount }) => (
          <Link key={store.id} to={`/stores/${store.slug}`} className="store-card">
            <div className="store-card-img">{store.bannerUrl ? <ArtImage src={store.bannerUrl} alt="" /> : <ResinBand height={160} seed={store.id} />}</div>
            <h2>{master.name}</h2>
            <p>{i18n.pick(store.nameEs, store.nameEn)}</p>
            <p className="muted">
              {master.city} — {i18n.t("stores.works", { count: artworkCount })}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
