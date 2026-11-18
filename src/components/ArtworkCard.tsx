import { Link } from "react-router-dom";
import type { ArtworkSummary } from "../domain/gallery";
import { useCatalogs } from "../state/CatalogContext";
import { useLocale } from "../state/LocaleContext";
import { ArtImage } from "./ArtImage";
import { ColorDots } from "./ColorDots";

/** Photo-first card of a piece: picture, title, master, shape, colors and price or sale mode. */
export function ArtworkCard({ summary }: { summary: ArtworkSummary }) {
  const { i18n, format } = useLocale();
  const { shape } = useCatalogs();
  const { artwork } = summary;
  const cover = artwork.photos.find((photo) => photo.isPrimary) ?? artwork.photos[0];
  const title = i18n.pick(artwork.titleEs, artwork.titleEn);
  const price =
    artwork.status === "SOLD"
      ? i18n.t("artwork.sold")
      : artwork.saleMode === "AUCTION"
        ? i18n.t("artwork.inAuction")
        : artwork.saleMode === "EXHIBITION"
          ? i18n.t("artwork.exhibitionOnly")
          : format.money(artwork.price, artwork.currency);
  return (
    <article className="art-card">
      <Link to={`/artworks/${artwork.slug}`} className="art-card-link">
        <div className="art-card-img">
          <ArtImage src={cover?.url} alt={cover ? i18n.pick(cover.altEs, cover.altEn) : title} />
          {artwork.status === "RESERVED" && <span className="art-flag">{i18n.t("artwork.reserved")}</span>}
        </div>
        <h3>{title}</h3>
      </Link>
      <p className="art-card-meta">
        {summary.masterName}
        {artwork.shapeId && <> — {i18n.name(shape(artwork.shapeId))}</>}
      </p>
      <div className="art-card-foot">
        <ColorDots colorIds={artwork.colorIds} />
        <span className={`art-price${artwork.saleMode === "SALE" && artwork.status !== "SOLD" ? "" : " is-muted"}`}>{price}</span>
      </div>
    </article>
  );
}

export function ArtworkGrid({ items }: { items: ArtworkSummary[] }) {
  return (
    <div className="art-grid">
      {items.map((summary) => (
        <ArtworkCard key={summary.artwork.id} summary={summary} />
      ))}
    </div>
  );
}
