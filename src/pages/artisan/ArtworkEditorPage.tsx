import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArtImage } from "../../components/ArtImage";
import { CatalogOptions } from "../../components/CatalogOptions";
import { ChipPicker } from "../../components/ChipPicker";
import { ErrorNote, Loading, Note } from "../../components/Feedback";
import { Field, FieldGroup } from "../../components/Field";
import { Icon } from "../../components/Icon";
import { ImageUploadButton } from "../../components/ImageUploadButton";
import { PageHeader } from "../../components/PageHeader";
import type { ArtworkInput, ArtworkStatus, Photo, SaleMode } from "../../domain/gallery";
import { useAsync } from "../../hooks/useAsync";
import { services } from "../../services/ServiceRegistry";
import { useCatalogs } from "../../state/CatalogContext";
import { useLocale } from "../../state/LocaleContext";
import { useToast } from "../../state/ToastContext";

const EMPTY: ArtworkInput = {
  titleEs: "", titleEn: "", historyEs: "", historyEn: "", technique: "Barniz de Pasto (mopa-mopa) sobre madera",
  widthCm: null, heightCm: null, depthCm: null, weightG: null, shapeId: null, styleId: null, colorIds: [], motifIds: [],
  saleMode: "SALE", status: "DRAFT", price: null, currency: "USD", stock: 1, photos: [],
};

const EDITABLE_STATUSES: ArtworkStatus[] = ["DRAFT", "EXHIBITED", "ARCHIVED"];

/** Create or edit a piece: bilingual texts, catalog values, measures, sale mode, price and photos. */
export function ArtworkEditorPage() {
  const { id } = useParams();
  const { i18n } = useLocale();
  const { catalogs } = useCatalogs();
  const navigate = useNavigate();
  const toast = useToast();
  const existing = useAsync(async () => (id ? services.artisan.getMyArtwork(Number(id)) : null), [id]);
  const [form, setForm] = useState<ArtworkInput>(EMPTY);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const options = new CatalogOptions(catalogs, i18n);
  const set = (patch: Partial<ArtworkInput>) => setForm((current) => ({ ...current, ...patch }));
  const locked = existing.data ? ["IN_AUCTION", "RESERVED", "SOLD"].includes(existing.data.status) : false;

  useEffect(() => {
    if (existing.data) {
      const { id: _id, storeId: _store, slug: _slug, publishedAt: _published, createdAt: _created, ...input } = existing.data;
      setForm(input);
    }
  }, [existing.data]);

  if (id && existing.loading) return <Loading />;
  if (existing.error !== null) return <ErrorNote error={existing.error} />;

  const number = (value: string) => (value === "" ? null : Number(value));
  const setPhotos = (photos: Photo[]) => set({ photos: photos.map((photo, index) => ({ ...photo, sortOrder: index })) });
  const addPhoto = (url: string) =>
    setForm((current) => ({
      ...current,
      photos: [...current.photos, { id: 0, url, altEs: current.titleEs, altEn: current.titleEn, angle: null, sortOrder: current.photos.length, isPrimary: current.photos.length === 0 }],
    }));
  const movePhoto = (index: number, delta: number) => {
    const next = [...form.photos];
    const [photo] = next.splice(index, 1);
    next.splice(index + delta, 0, photo);
    setPhotos(next);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await services.artisan.saveArtwork(form, id ? Number(id) : undefined);
      toast.show(i18n.t("artworks.saved"), "success");
      navigate("/artisan/artworks");
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title={id ? i18n.t("artworks.editTitle") : i18n.t("artworks.newTitle")} />
      {locked && <Note tone="warn">{i18n.t("artworks.locked")}</Note>}
      <form className="form-grid two" onSubmit={(event) => void submit(event)}>
        <Field label={i18n.t("artworks.titleEs")}>
          <input required value={form.titleEs} onChange={(event) => set({ titleEs: event.target.value })} />
        </Field>
        <Field label={i18n.t("artworks.titleEn")}>
          <input required value={form.titleEn} onChange={(event) => set({ titleEn: event.target.value })} />
        </Field>
        <Field label={i18n.t("artworks.historyEs")} wide>
          <textarea rows={3} value={form.historyEs} onChange={(event) => set({ historyEs: event.target.value })} />
        </Field>
        <Field label={i18n.t("artworks.historyEn")} wide>
          <textarea rows={3} value={form.historyEn} onChange={(event) => set({ historyEn: event.target.value })} />
        </Field>

        <div className="field field-wide">
          <span className="field-label">{i18n.t("artworks.photos")}</span>
          <ul className="photo-editor">
            {form.photos.map((photo, index) => (
              <li key={`${photo.id}-${index}`} className={photo.isPrimary ? "is-primary" : ""}>
                <ArtImage src={photo.url} alt={photo.altEs} />
                <div className="photo-tools">
                  <button type="button" className="btn btn-link" disabled={photo.isPrimary} onClick={() => setPhotos(form.photos.map((item, position) => ({ ...item, isPrimary: position === index })))}>
                    {photo.isPrimary ? i18n.t("artworks.primary") : i18n.t("artworks.makePrimary")}
                  </button>
                  <span>
                    <button type="button" className="icon-btn" disabled={index === 0} onClick={() => movePhoto(index, -1)} aria-label={i18n.t("storeEditor.moveUp")}>
                      <Icon name="left" />
                    </button>
                    <button type="button" className="icon-btn" disabled={index === form.photos.length - 1} onClick={() => movePhoto(index, 1)} aria-label={i18n.t("storeEditor.moveDown")}>
                      <Icon name="right" />
                    </button>
                    <button type="button" className="icon-btn" onClick={() => setPhotos(form.photos.filter((_, position) => position !== index))} aria-label={i18n.t("common.delete")}>
                      <Icon name="trash" />
                    </button>
                  </span>
                </div>
                <input aria-label={i18n.t("artworks.altEs")} placeholder={i18n.t("artworks.altEs")} value={photo.altEs} onChange={(event) => setPhotos(form.photos.map((item, position) => (position === index ? { ...item, altEs: event.target.value } : item)))} />
                <input aria-label={i18n.t("artworks.altEn")} placeholder={i18n.t("artworks.altEn")} value={photo.altEn} onChange={(event) => setPhotos(form.photos.map((item, position) => (position === index ? { ...item, altEn: event.target.value } : item)))} />
              </li>
            ))}
          </ul>
          <ImageUploadButton multiple label={i18n.t("artworks.addPhotos")} onUploaded={addPhoto} />
          <span className="field-hint">{i18n.t("artworks.photosHint")}</span>
        </div>

        <FieldGroup label={i18n.t("custom.fieldShape")}>
          <ChipPicker multiple={false} options={options.shapes()} selected={form.shapeId ? [form.shapeId] : []} onChange={(ids) => set({ shapeId: ids[0] ?? null })} />
        </FieldGroup>
        <FieldGroup label={i18n.t("taste.colors")}>
          <ChipPicker options={options.colors()} selected={form.colorIds} onChange={(colorIds) => set({ colorIds })} />
        </FieldGroup>
        <FieldGroup label={i18n.t("taste.motifs")}>
          <ChipPicker options={options.motifs()} selected={form.motifIds} onChange={(motifIds) => set({ motifIds })} />
        </FieldGroup>
        <FieldGroup label={i18n.t("custom.fieldStyle")}>
          <ChipPicker multiple={false} options={options.styles()} selected={form.styleId ? [form.styleId] : []} onChange={(ids) => set({ styleId: ids[0] ?? null })} />
        </FieldGroup>

        <Field label={i18n.t("artwork.technique")} wide>
          <input value={form.technique} onChange={(event) => set({ technique: event.target.value })} />
        </Field>
        <div className="field field-wide">
          <span className="field-label">{i18n.t("artworks.measures")}</span>
          <div className="inline-inputs">
            <input type="number" min={0} step={0.1} aria-label={i18n.t("artworks.width")} placeholder={i18n.t("artworks.width")} value={form.widthCm ?? ""} onChange={(event) => set({ widthCm: number(event.target.value) })} />
            <input type="number" min={0} step={0.1} aria-label={i18n.t("artworks.height")} placeholder={i18n.t("artworks.height")} value={form.heightCm ?? ""} onChange={(event) => set({ heightCm: number(event.target.value) })} />
            <input type="number" min={0} step={0.1} aria-label={i18n.t("artworks.depth")} placeholder={i18n.t("artworks.depth")} value={form.depthCm ?? ""} onChange={(event) => set({ depthCm: number(event.target.value) })} />
            <input type="number" min={0} step={1} aria-label={i18n.t("artworks.weightG")} placeholder={i18n.t("artworks.weightG")} value={form.weightG ?? ""} onChange={(event) => set({ weightG: number(event.target.value) })} />
          </div>
        </div>

        <Field label={i18n.t("artworks.mode")}>
          <select disabled={locked} value={form.saleMode} onChange={(event) => set({ saleMode: event.target.value as SaleMode })}>
            {(["SALE", "AUCTION", "EXHIBITION"] as SaleMode[]).map((mode) => (
              <option key={mode} value={mode}>
                {i18n.tx(`status.saleMode.${mode}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={i18n.t("orders.status")}>
          <select disabled={locked} value={form.status} onChange={(event) => set({ status: event.target.value as ArtworkStatus })}>
            {(locked ? [form.status] : EDITABLE_STATUSES).map((status) => (
              <option key={status} value={status}>
                {i18n.tx(`status.artwork.${status}`)}
              </option>
            ))}
          </select>
        </Field>
        {form.saleMode === "SALE" && (
          <>
            <Field label={i18n.t("artworks.priceUsd")}>
              <input type="number" min={1} step={1} value={form.price ?? ""} onChange={(event) => set({ price: number(event.target.value) })} />
            </Field>
            <Field label={i18n.t("artworks.stock")} hint={i18n.t("artworks.stockHint")}>
              <input type="number" min={0} step={1} value={form.stock} onChange={(event) => set({ stock: Number(event.target.value) })} />
            </Field>
          </>
        )}
        {form.saleMode === "AUCTION" && (
          <Note>
            {i18n.t("artworks.auctionHint")}
          </Note>
        )}
        {error !== null && (
          <div className="field-wide">
            <ErrorNote error={error} />
          </div>
        )}
        <div className="actions field-wide">
          <button type="button" className="btn btn-quiet" onClick={() => navigate("/artisan/artworks")}>
            {i18n.t("common.cancel")}
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {i18n.t("common.save")}
          </button>
        </div>
      </form>
    </>
  );
}
