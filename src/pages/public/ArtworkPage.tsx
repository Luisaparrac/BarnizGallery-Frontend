import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArtworkActions } from "../../components/ArtworkActions";
import { ArtworkGrid } from "../../components/ArtworkCard";
import { ColorDots } from "../../components/ColorDots";
import { ContactMasterModal, type ContactTarget } from "../../components/ContactMasterModal";
import { ErrorNote, Loading } from "../../components/Feedback";
import { Icon } from "../../components/Icon";
import { PhotoViewer } from "../../components/PhotoViewer";
import { ReportButton } from "../../components/ReportButton";
import { StatusBadge } from "../../components/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { services } from "../../services/ServiceRegistry";
import { useCatalogs } from "../../state/CatalogContext";
import { useLocale } from "../../state/LocaleContext";
import { useSession } from "../../state/SessionContext";

/** One piece: photos with zoom, its story and details, and what can be done with it (buy, bid, save, ask). */
export function ArtworkPage() {
  const { slug = "" } = useParams();
  const { i18n, format } = useLocale();
  const { shape, style, motif } = useCatalogs();
  const { user } = useSession();
  const detail = useAsync(() => services.gallery.getArtwork(slug), [slug]);
  const related = useAsync(
    async () => (detail.data ? (await services.gallery.listArtworks({ storeId: detail.data.artwork.storeId })).filter((item) => item.artwork.id !== detail.data!.artwork.id).slice(0, 4) : []),
    [detail.data?.artwork.id],
  );
  const [contact, setContact] = useState<ContactTarget | null>(null);
  const artworkId = detail.data?.artwork.id;

  // Time spent looking at the piece feeds the recommendations (interaction VIEW with duration).
  useEffect(() => {
    if (!artworkId || !user) return;
    const started = Date.now();
    return () => void services.profile.recordInteraction({ action: "VIEW", artworkId, durationSeconds: Math.round((Date.now() - started) / 1000) });
  }, [artworkId, user]);

  if (detail.loading && !detail.data) return <Loading />;
  if (detail.error !== null || !detail.data) return <div className="container"><ErrorNote error={detail.error} /></div>;
  const { artwork } = detail.data;
  const title = i18n.pick(artwork.titleEs, artwork.titleEn);
  return (
    <div className="container">
      <nav className="crumbs" aria-label={i18n.t("nav.breadcrumbs")}>
        <Link to="/gallery">{i18n.t("nav.gallery")}</Link> / <Link to={`/stores/${detail.data.storeSlug}`}>{detail.data.masterName}</Link>
      </nav>
      <div className="artwork-layout">
        <PhotoViewer photos={artwork.photos} title={title} onZoom={() => user && void services.profile.recordInteraction({ action: "ZOOM", artworkId: artwork.id })} />
        <div className="artwork-info">
          <h1>{title}</h1>
          <p className="artwork-master">
            {i18n.t("artwork.by")} <Link to={`/stores/${detail.data.storeSlug}`}>{detail.data.masterName}</Link>
          </p>
          <div className="artwork-price">
            {artwork.saleMode === "SALE" && artwork.status !== "SOLD" && <strong>{format.money(artwork.price, artwork.currency)}</strong>}
            {artwork.status !== "EXHIBITED" && <StatusBadge kind="artwork" value={artwork.status} />}
            {artwork.saleMode === "EXHIBITION" && <span className="muted">{i18n.t("artwork.exhibitionOnly")}</span>}
          </div>
          <ArtworkActions detail={detail.data} onChange={detail.setData} withShare />
          <dl className="specs">
            <dt>{i18n.t("artwork.shape")}</dt>
            <dd>{i18n.name(shape(artwork.shapeId)) || "—"}</dd>
            <dt>{i18n.t("artwork.style")}</dt>
            <dd>{i18n.name(style(artwork.styleId)) || "—"}</dd>
            <dt>{i18n.t("artwork.colors")}</dt>
            <dd>
              <ColorDots colorIds={artwork.colorIds} />
            </dd>
            <dt>{i18n.t("artwork.motifs")}</dt>
            <dd>{artwork.motifIds.map((id) => i18n.name(motif(id))).join(", ") || "—"}</dd>
            <dt>{i18n.t("artwork.technique")}</dt>
            <dd>{artwork.technique || "—"}</dd>
            <dt>{i18n.t("artwork.dimensions")}</dt>
            <dd>{format.centimeters(artwork.widthCm, artwork.heightCm, artwork.depthCm)}</dd>
            {artwork.weightG && (
              <>
                <dt>{i18n.t("artwork.weight")}</dt>
                <dd>{artwork.weightG} g</dd>
              </>
            )}
          </dl>
          <h2 className="h3">{i18n.t("artwork.story")}</h2>
          <p className="prose">{i18n.pick(artwork.historyEs, artwork.historyEn)}</p>
          <div className="artwork-foot">
            {user && user.role !== "ADMIN" && (
              <button
                type="button"
                className="btn btn-link"
                onClick={() => setContact({ masterId: detail.data!.masterId, masterName: detail.data!.masterName, subject: title, artworkId: artwork.id })}
              >
                <Icon name="chat" size={16} /> {i18n.t("artwork.askMaster")}
              </button>
            )}
            <Link to={`/account/custom/new?master=${detail.data.masterId}`} className="btn btn-link">
              <Icon name="brush" size={16} /> {i18n.t("artwork.orderSimilar")}
            </Link>
            <ReportButton entityType="ARTWORK" entityId={artwork.id} />
          </div>
        </div>
      </div>
      {related.data && related.data.length > 0 && (
        <section className="home-block">
          <h2>{i18n.t("artwork.moreFrom", { name: detail.data.masterName })}</h2>
          <ArtworkGrid items={related.data} />
        </section>
      )}
      <ContactMasterModal target={contact} onClose={() => setContact(null)} />
    </div>
  );
}
