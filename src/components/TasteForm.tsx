import type { TasteProfile } from "../domain/taste";
import { useCatalogs } from "../state/CatalogContext";
import { useLocale } from "../state/LocaleContext";
import { CatalogOptions } from "./CatalogOptions";
import { ChipPicker } from "./ChipPicker";
import { FieldGroup } from "./Field";

export const EMPTY_TASTE: TasteProfile = { colorIds: [], shapeIds: [], styleIds: [], motifIds: [], budgetRangeId: null };

/** The welcome questionnaire: colors, shapes, figures, style and budget. */
export function TasteForm({ value, onChange }: { value: TasteProfile; onChange(next: TasteProfile): void }) {
  const { i18n } = useLocale();
  const { catalogs } = useCatalogs();
  const options = new CatalogOptions(catalogs, i18n);
  return (
    <div className="form-grid">
      <FieldGroup label={i18n.t("taste.colors")} hint={i18n.t("taste.multiHint")}>
        <ChipPicker options={options.colors()} selected={value.colorIds} onChange={(colorIds) => onChange({ ...value, colorIds })} />
      </FieldGroup>
      <FieldGroup label={i18n.t("taste.shapes")} hint={i18n.t("taste.multiHint")}>
        <ChipPicker options={options.shapes()} selected={value.shapeIds} onChange={(shapeIds) => onChange({ ...value, shapeIds })} />
      </FieldGroup>
      <FieldGroup label={i18n.t("taste.motifs")}>
        <ChipPicker options={options.motifs()} selected={value.motifIds} onChange={(motifIds) => onChange({ ...value, motifIds })} />
      </FieldGroup>
      <FieldGroup label={i18n.t("taste.styles")}>
        <ChipPicker options={options.styles()} selected={value.styleIds} onChange={(styleIds) => onChange({ ...value, styleIds })} />
      </FieldGroup>
      <FieldGroup label={i18n.t("taste.budget")} hint={i18n.t("taste.budgetHint")}>
        <ChipPicker
          multiple={false}
          options={options.budgets()}
          selected={value.budgetRangeId ? [value.budgetRangeId] : []}
          onChange={(ids) => onChange({ ...value, budgetRangeId: ids[0] ?? null })}
        />
      </FieldGroup>
    </div>
  );
}
