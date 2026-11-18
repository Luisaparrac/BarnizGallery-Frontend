import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArtworkGrid } from "../../components/ArtworkCard";
import { CatalogOptions } from "../../components/CatalogOptions";
import { ChipPicker } from "../../components/ChipPicker";
import { EmptyState, ErrorNote, Loading } from "../../components/Feedback";
import { FieldGroup } from "../../components/Field";
import { Icon } from "../../components/Icon";
import { PageHeader } from "../../components/PageHeader";
import type { Id } from "../../domain/common";
import type { GalleryFilters, GallerySort, SaleMode } from "../../domain/gallery";
import { useAsync } from "../../hooks/useAsync";
import { services } from "../../services/ServiceRegistry";
import { useCatalogs } from "../../state/CatalogContext";
import { useLocale } from "../../state/LocaleContext";

const SALE_MODES: SaleMode[] = ["SALE", "AUCTION", "EXHIBITION"];
const ids = (value: string | null): Id[] => (value ? value.split(",").map(Number).filter(Boolean) : []);

/** Photo gallery of every published piece with filters by color, shape, figure, style, sale mode and price. */
export function GalleryPage() {
  const { i18n } = useLocale();
  const { catalogs } = useCatalogs();
  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const filters: GalleryFilters = useMemo(
    () => ({
      search: params.get("q") ?? undefined,
      colorIds: ids(params.get("color")),
      shapeIds: ids(params.get("shape")),
      motifIds: ids(params.get("motif")),
      styleIds: ids(params.get("style")),
      saleModes: (params.get("mode")?.split(",").filter(Boolean) as SaleMode[]) ?? [],
      maxPrice: params.get("max") ? Number(params.get("max")) : undefined,
      sort: (params.get("sort") as GallerySort) ?? "recent",
    }),
    [params],
  );
  const result = useAsync(() => services.gallery.listArtworks(filters), [filters]);
  const options = new CatalogOptions(catalogs, i18n);

  const update = (key: string, value: string | number[] | undefined) => {
    const next = new URLSearchParams(params);
    const text = Array.isArray(value) ? value.join(",") : value;
    if (text) next.set(key, String(text));
    else next.delete(key);
    setParams(next, { replace: true });
  };
  const activeCount = ["color", "shape", "motif", "style", "mode", "max", "q"].filter((key) => params.get(key)).length;

  return (
    <div className="container">
      <PageHeader title={i18n.t("gallery.title")} lead={i18n.t("gallery.lead")} />
      <div className="gallery-layout">
        <aside className={`filters${showFilters ? " is-open" : ""}`} aria-label={i18n.t("gallery.filters")}>
          <label className="search">
            <Icon name="search" />
            <input type="search" placeholder={i18n.t("gallery.search")} defaultValue={filters.search} onChange={(event) => update("q", event.target.value)} aria-label={i18n.t("gallery.search")} />
          </label>
          <FieldGroup label={i18n.t("taste.colors")}>
            <ChipPicker options={options.colors()} selected={filters.colorIds ?? []} onChange={(value) => update("color", value)} />
          </FieldGroup>
          <FieldGroup label={i18n.t("taste.shapes")}>
            <ChipPicker options={options.shapes()} selected={filters.shapeIds ?? []} onChange={(value) => update("shape", value)} />
          </FieldGroup>
          <FieldGroup label={i18n.t("taste.motifs")}>
            <ChipPicker options={options.motifs()} selected={filters.motifIds ?? []} onChange={(value) => update("motif", value)} />
          </FieldGroup>
          <FieldGroup label={i18n.t("taste.styles")}>
            <ChipPicker options={options.styles()} selected={filters.styleIds ?? []} onChange={(value) => update("style", value)} />
          </FieldGroup>
          <FieldGroup label={i18n.t("gallery.saleMode")}>
            <div className="chips">
              {SALE_MODES.map((mode) => {
                const on = filters.saleModes?.includes(mode) ?? false;
                return (
                  <button
                    key={mode}
                    type="button"
                    className={`chip${on ? " is-on" : ""}`}
                    aria-pressed={on}
                    onClick={() => update("mode", (on ? filters.saleModes!.filter((value) => value !== mode) : [...(filters.saleModes ?? []), mode]).join(","))}
                  >
                    {i18n.tx(`status.saleMode.${mode}`)}
                  </button>
                );
              })}
            </div>
          </FieldGroup>
          <label className="field">
            <span className="field-label">{i18n.t("gallery.maxPrice")}</span>
            <input type="number" min={0} step={10} defaultValue={filters.maxPrice} onChange={(event) => update("max", event.target.value)} />
          </label>
          {activeCount > 0 && (
            <button type="button" className="btn btn-link" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
              {i18n.t("gallery.clear")}
            </button>
          )}
        </aside>
        <section>
          <div className="gallery-bar">
            <button type="button" className="btn btn-quiet filters-toggle" onClick={() => setShowFilters((open) => !open)} aria-expanded={showFilters}>
              {i18n.t("gallery.filters")} {activeCount > 0 && `(${activeCount})`}
            </button>
            <span className="muted">{result.data ? i18n.t("gallery.count", { count: result.data.length }) : ""}</span>
            <label className="sort">
              <span>{i18n.t("gallery.sort")}</span>
              <select value={filters.sort} onChange={(event) => update("sort", event.target.value)}>
                {(["recent", "popular", "priceAsc", "priceDesc"] as GallerySort[]).map((sort) => (
                  <option key={sort} value={sort}>
                    {i18n.tx(`gallery.sort.${sort}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {result.loading && !result.data && <Loading />}
          {result.error !== null && <ErrorNote error={result.error} onRetry={() => void result.reload()} />}
          {result.data &&
            (result.data.length ? (
              <ArtworkGrid items={result.data} />
            ) : (
              <EmptyState
                title={i18n.t("gallery.noResults")}
                text={i18n.t("gallery.noResultsText")}
                action={
                  <button type="button" className="btn btn-quiet" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
                    {i18n.t("gallery.clear")}
                  </button>
                }
              />
            ))}
        </section>
      </div>
    </div>
  );
}
