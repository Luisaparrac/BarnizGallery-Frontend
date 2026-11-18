import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Auction } from "../domain/auction";
import type { StoreTemplate } from "../domain/catalog";
import type { Id } from "../domain/common";
import type { ArtworkSummary, StoreSection, StoreSummary } from "../domain/gallery";
import { useCatalogs } from "../state/CatalogContext";
import { useLocale } from "../state/LocaleContext";
import { ArtImage } from "./ArtImage";
import { ArtworkGrid } from "./ArtworkCard";
import { ChipPicker } from "./ChipPicker";
import { CatalogOptions } from "./CatalogOptions";
import { Countdown } from "./Countdown";
import { ResinBand } from "./ResinBand";

interface Props {
  summary: StoreSummary;
  artworks: ArtworkSummary[];
  auctions: Auction[];
  onContact?(): void;
}

/** Draws an artisan store from its template theme and its sections, in the order the artisan chose. */
export function StoreRenderer({ summary, artworks, auctions, onContact }: Props) {
  const { template } = useCatalogs();
  const { store } = summary;
  const tpl: StoreTemplate | undefined = template(store.templateId);
  const theme = { ...tpl?.defaultTheme, ...store.theme };
  const style = {
    "--store-primary": theme.primary ?? "#241612",
    "--store-accent": theme.accent ?? "#C9A227",
    "--store-bg": theme.background ?? "#FFFFFF",
  } as CSSProperties;
  const sections = [...store.sections].filter((section) => section.isVisible).sort((a, b) => a.sortOrder - b.sortOrder);
  return (
    <div className={`store store-${tpl?.code ?? "taller"} store-font-${theme.font ?? "sans"}`} style={style}>
      {sections.map((section) => (
        <SectionView key={section.id} section={section} {...{ summary, artworks, auctions, onContact }} />
      ))}
    </div>
  );
}

function SectionView({ section, summary, artworks, auctions, onContact }: Props & { section: StoreSection }) {
  const { i18n } = useLocale();
  const title = i18n.pick(section.titleEs, section.titleEn);
  const content = i18n.pick(section.contentEs, section.contentEn);
  const { store, master } = summary;

  switch (section.type) {
    case "COVER":
      return (
        <section className="store-cover">
          <div className="store-banner">
            {store.bannerUrl ? <ArtImage src={store.bannerUrl} alt="" /> : <ResinBand height={220} seed={store.id} />}
          </div>
          <div className="store-cover-text">
            {store.logoUrl && <ArtImage className="store-logo" src={store.logoUrl} alt="" />}
            <h1>{i18n.pick(store.nameEs, store.nameEn)}</h1>
            <p className="store-master">
              {master.name} — {master.workshop}, {master.city}
            </p>
            {i18n.pick(store.descriptionEs, store.descriptionEn) && <p>{i18n.pick(store.descriptionEs, store.descriptionEn)}</p>}
            {content && content !== i18n.pick(store.descriptionEs, store.descriptionEn) && <p className="store-cover-note">{content}</p>}
          </div>
        </section>
      );
    case "STORY":
      return (
        <TextSection title={title} content={content} image={section.imageUrl}>
          {i18n.pick(master.biographyEs, master.biographyEn) && <p>{i18n.pick(master.biographyEs, master.biographyEn)}</p>}
        </TextSection>
      );
    case "TECHNIQUE":
    case "WORKSHOP":
    case "FREE_TEXT":
      return <TextSection title={title} content={content} image={section.imageUrl} />;
    case "GALLERY":
      return (
        <section className="store-section">
          <h2>{title || i18n.t("section.GALLERY")}</h2>
          {artworks.length ? <ArtworkGrid items={artworks} /> : <p className="muted">{i18n.t("store.noArtworks")}</p>}
        </section>
      );
    case "FEATURED": {
      const featured = [...artworks].sort((a, b) => b.favoriteCount - a.favoriteCount).slice(0, 3);
      return (
        <section className="store-section">
          <h2>{title || i18n.t("section.FEATURED")}</h2>
          <div className="store-featured">
            {featured.map((summaryItem) => {
              const cover = summaryItem.artwork.photos.find((photo) => photo.isPrimary) ?? summaryItem.artwork.photos[0];
              return (
                <Link key={summaryItem.artwork.id} to={`/artworks/${summaryItem.artwork.slug}`}>
                  <ArtImage src={cover?.url} alt={i18n.pick(summaryItem.artwork.titleEs, summaryItem.artwork.titleEn)} />
                  <span>{i18n.pick(summaryItem.artwork.titleEs, summaryItem.artwork.titleEn)}</span>
                </Link>
              );
            })}
          </div>
        </section>
      );
    }
    case "CATALOG":
      return <CatalogSection title={title || i18n.t("section.CATALOG")} artworks={artworks} />;
    case "AUCTIONS": {
      const open = auctions.filter((auction) => auction.status === "ACTIVE" || auction.status === "SCHEDULED");
      return (
        <section className="store-section">
          <h2>{title || i18n.t("section.AUCTIONS")}</h2>
          {open.length ? (
            <ul className="store-auctions">
              {open.map((auction) => (
                <li key={auction.id}>
                  <Link to={`/auctions/${auction.id}`}>{i18n.pick(auction.artworkTitleEs, auction.artworkTitleEn)}</Link>
                  <span>{auction.status === "ACTIVE" ? <>{i18n.t("auction.endsIn")} <Countdown until={auction.endDate} /></> : i18n.t("status.auction.SCHEDULED")}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{i18n.t("store.noAuctions")}</p>
          )}
        </section>
      );
    }
    case "CUSTOM_ORDERS":
      if (!store.acceptsCustomOrders) return null;
      return (
        <section className="store-section store-callout">
          <h2>{title || i18n.t("section.CUSTOM_ORDERS")}</h2>
          {content && <p>{content}</p>}
          <Link className="btn btn-store" to={`/account/custom/new?master=${master.id}`}>
            {i18n.t("store.askCustom")}
          </Link>
        </section>
      );
    case "CONTACT":
      return (
        <section className="store-section store-callout">
          <h2>{title || i18n.t("section.CONTACT")}</h2>
          {content && <p>{content}</p>}
          {onContact && (
            <button type="button" className="btn btn-store" onClick={onContact}>
              {i18n.t("store.writeMaster", { name: master.name })}
            </button>
          )}
        </section>
      );
    default:
      return null;
  }
}

function TextSection({ title, content, image, children }: { title: string; content: string; image: string | null; children?: ReactNode }) {
  if (!title && !content && !image && !children) return null;
  return (
    <section className={`store-section store-text${image ? " has-image" : ""}`}>
      <div>
        {title && <h2>{title}</h2>}
        {content && content.split("\n").map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        {children}
      </div>
      {image && <ArtImage src={image} alt={title} />}
    </section>
  );
}

function CatalogSection({ title, artworks }: { title: string; artworks: ArtworkSummary[] }) {
  const { i18n } = useLocale();
  const { catalogs } = useCatalogs();
  const [colors, setColors] = useState<Id[]>([]);
  const [shapes, setShapes] = useState<Id[]>([]);
  const options = new CatalogOptions(catalogs, i18n);
  const usedColors = new Set(artworks.flatMap((summary) => summary.artwork.colorIds));
  const usedShapes = new Set(artworks.map((summary) => summary.artwork.shapeId));
  const filtered = useMemo(
    () =>
      artworks.filter(
        (summary) => (!colors.length || colors.some((id) => summary.artwork.colorIds.includes(id))) && (!shapes.length || shapes.includes(summary.artwork.shapeId ?? -1)),
      ),
    [artworks, colors, shapes],
  );
  return (
    <section className="store-section">
      <h2>{title}</h2>
      <div className="store-filters">
        <ChipPicker options={options.colors().filter((option) => usedColors.has(option.id))} selected={colors} onChange={setColors} />
        <ChipPicker options={options.shapes().filter((option) => usedShapes.has(option.id))} selected={shapes} onChange={setShapes} />
      </div>
      {filtered.length ? <ArtworkGrid items={filtered} /> : <p className="muted">{i18n.t("gallery.noResults")}</p>}
    </section>
  );
}
