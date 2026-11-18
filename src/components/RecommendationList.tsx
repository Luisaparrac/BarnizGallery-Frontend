import { Link } from "react-router-dom";
import type { ArtworkSummary, StoreSummary } from "../domain/gallery";
import type { Recommendation } from "../domain/taste";
import { useCatalogs } from "../state/CatalogContext";
import { useLocale } from "../state/LocaleContext";
import { ArtImage } from "./ArtImage";

/** Reads the structured reason "colors=1,11;shape=1;style=0;motifs=2;budget=1;interactions=0". */
export class RecommendationReason {
  readonly colorIds: number[];
  readonly shape: boolean;
  readonly style: boolean;
  readonly motifIds: number[];
  readonly budget: boolean;
  readonly interactions: boolean;

  constructor(reason: string) {
    const parts = Object.fromEntries(reason.split(";").map((part) => part.split("=") as [string, string]));
    const ids = (value?: string) => (value ? value.split(",").filter(Boolean).map(Number) : []);
    this.colorIds = ids(parts.colors);
    this.shape = parts.shape === "1";
    this.style = parts.style === "1";
    this.motifIds = ids(parts.motifs);
    this.budget = parts.budget === "1";
    this.interactions = parts.interactions === "1";
  }

  get isStructured(): boolean {
    return this.colorIds.length > 0 || this.shape || this.style || this.motifIds.length > 0 || this.budget || this.interactions;
  }
}

function ReasonText({ reason }: { reason: string }) {
  const { i18n } = useLocale();
  const { color, motif } = useCatalogs();
  const parsed = new RecommendationReason(reason);
  if (!reason.includes("=")) return <span>{reason}</span>;
  const parts: string[] = [];
  if (parsed.colorIds.length) parts.push(parsed.colorIds.map((id) => i18n.name(color(id)).toLowerCase()).join(", "));
  if (parsed.shape) parts.push(i18n.t("reco.shape"));
  if (parsed.style) parts.push(i18n.t("reco.style"));
  if (parsed.motifIds.length) parts.push(parsed.motifIds.map((id) => i18n.name(motif(id)).toLowerCase()).join(", "));
  if (parsed.budget) parts.push(i18n.t("reco.budget"));
  if (parsed.interactions) parts.push(i18n.t("reco.interactions"));
  return <span>{parts.length ? i18n.t("reco.because", { list: parts.join(" · ") }) : i18n.t("reco.generic")}</span>;
}

/** Recommended stores first, then recommended pieces, each with why. */
export function RecommendationList({ recommendations, artworks, stores }: { recommendations: Recommendation[]; artworks: ArtworkSummary[]; stores: StoreSummary[] }) {
  const { i18n } = useLocale();
  const storeRecs = recommendations.filter((rec) => rec.storeId !== null);
  const artRecs = recommendations.filter((rec) => rec.artworkId !== null);
  return (
    <div className="recs">
      {storeRecs.length > 0 && (
        <section>
          <h3>{i18n.t("reco.stores")}</h3>
          <ol className="rec-stores">
            {storeRecs.map((rec) => {
              const summary = stores.find((entry) => entry.store.id === rec.storeId);
              if (!summary) return null;
              return (
                <li key={rec.id}>
                  <Link to={`/stores/${summary.store.slug}`}>
                    <strong>{i18n.pick(summary.store.nameEs, summary.store.nameEn)}</strong>
                  </Link>
                  <span className="rec-score" aria-label={i18n.t("reco.scoreLabel", { score: rec.score })}>
                    <span style={{ width: `${Math.max(4, rec.score)}%` }} />
                  </span>
                  <small>
                    <ReasonText reason={rec.reason} />
                  </small>
                </li>
              );
            })}
          </ol>
        </section>
      )}
      {artRecs.length > 0 && (
        <section>
          <h3>{i18n.t("reco.artworks")}</h3>
          <div className="rec-arts">
            {artRecs.map((rec) => {
              const summary = artworks.find((entry) => entry.artwork.id === rec.artworkId);
              if (!summary) return null;
              const cover = summary.artwork.photos.find((photo) => photo.isPrimary) ?? summary.artwork.photos[0];
              return (
                <Link key={rec.id} to={`/artworks/${summary.artwork.slug}`} className="rec-art">
                  <ArtImage src={cover?.url} alt={i18n.pick(summary.artwork.titleEs, summary.artwork.titleEn)} />
                  <span>{i18n.pick(summary.artwork.titleEs, summary.artwork.titleEn)}</span>
                  <small>
                    <ReasonText reason={rec.reason} />
                  </small>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
