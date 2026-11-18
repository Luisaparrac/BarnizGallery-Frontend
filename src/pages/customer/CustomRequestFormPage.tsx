import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CatalogOptions } from "../../components/CatalogOptions";
import { ChipPicker } from "../../components/ChipPicker";
import { ErrorNote, Loading } from "../../components/Feedback";
import { Field, FieldGroup } from "../../components/Field";
import { PageHeader } from "../../components/PageHeader";
import type { CustomRequestInput } from "../../domain/customOrder";
import { useAsync } from "../../hooks/useAsync";
import { services } from "../../services/ServiceRegistry";
import { useCatalogs } from "../../state/CatalogContext";
import { useLocale } from "../../state/LocaleContext";

const EMPTY: CustomRequestInput = { title: "", description: "", shapeId: null, styleId: null, colorIds: [], motifIds: [], sizeNotes: null, offeredPrice: null, desiredDate: null, targetMasterId: null };

/** New or draft custom request: what the piece should look like; the AI uses this description. */
export function CustomRequestFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { i18n } = useLocale();
  const { catalogs } = useCatalogs();
  const navigate = useNavigate();
  const stores = useAsync(() => services.gallery.listStores(), []);
  const existing = useAsync(async () => (id ? services.customOrder.get(Number(id)) : null), [id]);
  const [form, setForm] = useState<CustomRequestInput>({ ...EMPTY, targetMasterId: params.get("master") ? Number(params.get("master")) : null });
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const options = new CatalogOptions(catalogs, i18n);
  const set = (patch: Partial<CustomRequestInput>) => setForm((current) => ({ ...current, ...patch }));

  useEffect(() => {
    const request = existing.data;
    if (request) setForm({ title: request.title, description: request.description, shapeId: request.shapeId, styleId: request.styleId, colorIds: request.colorIds, motifIds: request.motifIds, sizeNotes: request.sizeNotes, offeredPrice: request.offeredPrice, desiredDate: request.desiredDate, targetMasterId: request.targetMasterId });
  }, [existing.data]);

  if (id && existing.loading) return <Loading />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const saved = id ? await services.customOrder.update(Number(id), form) : await services.customOrder.create(form);
      navigate(`/account/custom/${saved.id}`, { replace: true });
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container narrow">
      <PageHeader title={id ? i18n.t("custom.editTitle") : i18n.t("custom.newTitle")} lead={i18n.t("custom.formLead")} />
      <form className="form-grid two" onSubmit={(event) => void submit(event)}>
        <Field label={i18n.t("custom.fieldTitle")} wide>
          <input required minLength={4} value={form.title} onChange={(event) => set({ title: event.target.value })} placeholder={i18n.t("custom.titlePlaceholder")} />
        </Field>
        <Field label={i18n.t("custom.fieldDescription")} hint={i18n.t("custom.descriptionHint")} wide>
          <textarea required minLength={20} rows={5} value={form.description} onChange={(event) => set({ description: event.target.value })} />
        </Field>
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
        <Field label={i18n.t("custom.fieldSize")}>
          <input value={form.sizeNotes ?? ""} onChange={(event) => set({ sizeNotes: event.target.value || null })} placeholder={i18n.t("custom.sizePlaceholder")} />
        </Field>
        <Field label={i18n.t("custom.fieldPrice")} hint={i18n.t("custom.priceHint")}>
          <input type="number" min={1} step={1} value={form.offeredPrice ?? ""} onChange={(event) => set({ offeredPrice: event.target.value ? Number(event.target.value) : null })} />
        </Field>
        <Field label={i18n.t("custom.fieldDate")}>
          <input type="date" value={form.desiredDate ?? ""} onChange={(event) => set({ desiredDate: event.target.value || null })} />
        </Field>
        <Field label={i18n.t("custom.fieldMaster")} hint={i18n.t("custom.masterHint")}>
          <select value={form.targetMasterId ?? ""} onChange={(event) => set({ targetMasterId: event.target.value ? Number(event.target.value) : null })}>
            <option value="">{i18n.t("custom.anyMaster")}</option>
            {stores.data
              ?.filter((entry) => entry.store.acceptsCustomOrders)
              .map((entry) => (
                <option key={entry.master.id} value={entry.master.id}>
                  {entry.master.name}
                </option>
              ))}
          </select>
        </Field>
        {error !== null && (
          <div className="field-wide">
            <ErrorNote error={error} />
          </div>
        )}
        <div className="actions field-wide">
          <button type="button" className="btn btn-quiet" onClick={() => navigate(-1)}>
            {i18n.t("common.cancel")}
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {i18n.t("custom.saveDraft")}
          </button>
        </div>
      </form>
    </div>
  );
}
