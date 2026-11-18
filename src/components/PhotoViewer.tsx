import { useState } from "react";
import type { Photo } from "../domain/gallery";
import { useLocale } from "../state/LocaleContext";
import { ArtImage } from "./ArtImage";
import { Icon } from "./Icon";

/** Main photo with thumbnails and a full-screen zoom to look at the relief and the shine. */
export function PhotoViewer({ photos, title, onZoom }: { photos: Photo[]; title: string; onZoom?(): void }) {
  const { i18n } = useLocale();
  const sorted = [...photos].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder);
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const current = sorted[index];
  if (!current) return <div className="img-missing viewer-main" role="img" aria-label={title} />;
  const alt = i18n.pick(current.altEs, current.altEn) || title;
  const open = () => {
    setZoomed(true);
    onZoom?.();
  };
  return (
    <div className="viewer">
      <button type="button" className="viewer-main" onClick={open} aria-label={i18n.t("artwork.zoom")}>
        <ArtImage src={current.url} alt={alt} />
        <span className="viewer-zoom">
          <Icon name="zoom" /> {i18n.t("artwork.zoom")}
        </span>
      </button>
      {sorted.length > 1 && (
        <div className="viewer-thumbs">
          {sorted.map((photo, position) => (
            <button key={photo.id} type="button" className={position === index ? "is-on" : ""} onClick={() => setIndex(position)} aria-label={i18n.pick(photo.altEs, photo.altEn)}>
              <ArtImage src={photo.url} alt="" />
            </button>
          ))}
        </div>
      )}
      {zoomed && (
        <div className="zoom-layer" role="dialog" aria-label={alt} onClick={() => setZoomed(false)}>
          <ArtImage src={current.url} alt={alt} />
          <button type="button" className="icon-btn zoom-close" aria-label={i18n.t("common.close")}>
            <Icon name="close" size={24} />
          </button>
        </div>
      )}
    </div>
  );
}
