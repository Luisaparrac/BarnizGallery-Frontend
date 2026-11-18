import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArtworkActions } from "../../../components/ArtworkActions";
import { ColorDots } from "../../../components/ColorDots";
import { ErrorNote, Loading } from "../../../components/Feedback";
import { Icon } from "../../../components/Icon";
import { PhotoViewer } from "../../../components/PhotoViewer";
import { StatusBadge } from "../../../components/StatusBadge";
import { useAsync } from "../../../hooks/useAsync";
import { services } from "../../../services/ServiceRegistry";
import { useCatalogs } from "../../../state/CatalogContext";
import { useLocale } from "../../../state/LocaleContext";
import { useSession } from "../../../state/SessionContext";

/** Panel over the 3D world with the piece the visitor picked: photos, price, actions and a short story. */
export function PiecePanel({ slug, onClose }: { slug: string; onClose(): void }) {
  const { i18n, format } = useLocale();
  const { shape } = useCatalogs();
  const { user } = useSession();
  const detail = useAsync(() => services.gallery.getArtwork(slug), [slug]);
  const artworkId = detail.data?.artwork.id;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Time spent looking at the piece feeds the recommendations, as on the artwork page.
  useEffect(() => {
    if (!artworkId || !user) return;
    const started = Date.now();
    return () => void services.profile.recordInteraction({ action: "VIEW", artworkId, durationSeconds: Math.round((Date.now() - started) / 1000) });
  }, [artworkId, user]);

  const data = detail.data;
  const title = data ? i18n.pick(data.artwork.titleEs, data.artwork.titleEn) : "";
  return (
    <div className="piece-layer" role="dialog" aria-modal="true" aria-label={title || i18n.t("world.title")} onClick={onClose}>
      <aside className="piece-panel" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="icon-btn piece-close" onClick={onClose} aria-label={i18n.t("world.backToWorld")} autoFocus>
          <Icon name="close" />
        </button>
        {detail.loading && !data && <Loading />}
        {detail.error !== null && <ErrorNote error={detail.error} />}
        {data && (
          <>
            <PhotoViewer photos={data.artwork.photos} title={title} onZoom={() => user && void services.profile.recordInteraction({ action: "ZOOM", artworkId: data.artwork.id })} />
            <h2 className="piece-title">{title}</h2>
            <p className="artwork-master">
              {i18n.t("artwork.by")} <Link to={`/stores/${data.storeSlug}`}>{data.masterName}</Link>
            </p>
            <div className="artwork-price">
              {data.artwork.saleMode === "SALE" && data.artwork.status !== "SOLD" && <strong>{format.money(data.artwork.price, data.artwork.currency)}</strong>}
              {data.artwork.status !== "EXHIBITED" && <StatusBadge kind="artwork" value={data.artwork.status} />}
              {data.artwork.saleMode === "EXHIBITION" && <span className="muted">{i18n.t("artwork.exhibitionOnly")}</span>}
            </div>
            <ArtworkActions detail={data} onChange={detail.setData} />
            <dl className="specs">
              <dt>{i18n.t("artwork.shape")}</dt>
              <dd>{i18n.name(shape(data.artwork.shapeId)) || "—"}</dd>
              <dt>{i18n.t("artwork.colors")}</dt>
              <dd>
                <ColorDots colorIds={data.artwork.colorIds} />
              </dd>
              <dt>{i18n.t("artwork.dimensions")}</dt>
              <dd>{format.centimeters(data.artwork.widthCm, data.artwork.heightCm, data.artwork.depthCm)}</dd>
            </dl>
            <p className="prose piece-story">{i18n.pick(data.artwork.historyEs, data.artwork.historyEn)}</p>
            <Link to={`/artworks/${data.artwork.slug}`} className="btn btn-quiet">
              {i18n.t("world.fullDetails")}
            </Link>
          </>
        )}
      </aside>
    </div>
  );
}
