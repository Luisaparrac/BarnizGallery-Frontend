import { useEffect, useState } from "react";
import { TemplatePreview } from "../../components/TemplatePreview";
import { Loading } from "../../components/Feedback";
import { Icon } from "../../components/Icon";
import { PageHeader } from "../../components/PageHeader";
import type { CatalogItem, CatalogKind } from "../../domain/catalog";
import { useErrorText } from "../../hooks/useErrorText";
import { services } from "../../services/ServiceRegistry";
import { useCatalogs } from "../../state/CatalogContext";
import { useLocale } from "../../state/LocaleContext";
import { useToast } from "../../state/ToastContext";

type Row = CatalogItem & Record<string, unknown>;
const KINDS: CatalogKind[] = ["colors", "shapes", "motifs", "styles", "budgets", "avatars", "templates"];

/** Administrator edits the catalogs the whole app reads: colors, shapes, figures, styles, budgets, avatars, templates. */
export function AdminCatalogsPage() {
  const { i18n } = useLocale();
  const { catalogs, reload } = useCatalogs();
  const toast = useToast();
  const errorText = useErrorText();
  const [kind, setKind] = useState<CatalogKind>("colors");
  const [rows, setRows] = useState<Row[]>([]);
  const [changed, setChanged] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (catalogs) setRows((catalogs[kind] as unknown as Row[]).map((row) => ({ ...row })).sort((a, b) => a.sortOrder - b.sortOrder));
    setChanged(new Set());
  }, [catalogs, kind]);

  if (!catalogs) return <Loading />;

  const edit = (index: number, patch: Partial<Row>) => {
    setRows(rows.map((row, position) => (position === index ? { ...row, ...patch } : row)));
    setChanged(new Set(changed).add(index));
  };

  const add = () => {
    const base: Row = { id: 0, code: "", nameEs: "", nameEn: "", sortOrder: rows.length + 1, isActive: true };
    const extra: Record<CatalogKind, Record<string, unknown>> = {
      colors: { hex: "#000000" }, shapes: { iconUrl: null }, motifs: {}, styles: {},
      budgets: { minAmount: 0, maxAmount: null, currency: "USD" }, avatars: { imageUrl: "/avatars/" }, templates: {},
    };
    setRows([...rows, { ...base, ...extra[kind] }]);
    setChanged(new Set(changed).add(rows.length));
  };

  const save = async () => {
    try {
      for (const index of changed) {
        const row = rows[index];
        if (!row.code.trim() || !row.nameEs.trim() || !row.nameEn.trim()) throw new Error(i18n.t("adminCatalogs.required"));
        await services.catalog.saveItem(kind, row);
      }
      await reload();
      toast.show(i18n.t("adminCatalogs.saved"), "success");
    } catch (error) {
      toast.show(errorText(error), "error");
    }
  };

  return (
    <>
      <PageHeader
        title={i18n.t("adminCatalogs.title")}
        lead={i18n.t("adminCatalogs.lead")}
        actions={
          <button type="button" className="btn btn-primary" disabled={!changed.size} onClick={() => void save()}>
            {i18n.t("adminCatalogs.save", { count: changed.size })}
          </button>
        }
      />
      <div className="tabs" role="tablist">
        {KINDS.map((name) => (
          <button key={name} role="tab" aria-selected={kind === name} className={kind === name ? "is-on" : ""} onClick={() => setKind(name)}>
            {i18n.tx(`adminCatalogs.kind.${name}`)}
          </button>
        ))}
      </div>
      <table className="table editable">
        <thead>
          <tr>
            {kind !== "templates" && <th>{i18n.t("adminCatalogs.code")}</th>}
            <th>{i18n.t("adminCatalogs.nameEs")}</th>
            <th>{i18n.t("adminCatalogs.nameEn")}</th>
            {kind === "colors" && <th>{i18n.t("adminCatalogs.hex")}</th>}
            {kind === "budgets" && (
              <>
                <th>{i18n.t("adminCatalogs.min")}</th>
                <th>{i18n.t("adminCatalogs.max")}</th>
              </>
            )}
            {kind === "avatars" && <th>{i18n.t("adminCatalogs.image")}</th>}
            {kind === "templates" && <th>{i18n.t("adminCatalogs.preview")}</th>}
            <th>{i18n.t("adminCatalogs.order")}</th>
            <th>{i18n.t("adminCatalogs.active")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.id}-${index}`} className={changed.has(index) ? "is-changed" : ""}>
              {kind !== "templates" && (
                <td>
                  <input value={row.code} disabled={row.id !== 0} aria-label={i18n.t("adminCatalogs.code")} onChange={(event) => edit(index, { code: event.target.value })} />
                </td>
              )}
              <td>
                <input value={row.nameEs} aria-label={i18n.t("adminCatalogs.nameEs")} onChange={(event) => edit(index, { nameEs: event.target.value })} />
              </td>
              <td>
                <input value={row.nameEn} aria-label={i18n.t("adminCatalogs.nameEn")} onChange={(event) => edit(index, { nameEn: event.target.value })} />
              </td>
              {kind === "colors" && (
                <td>
                  {row.hex === null ? (
                    <span className="muted">{i18n.t("adminCatalogs.noHex")}</span>
                  ) : (
                    <input type="color" value={String(row.hex)} aria-label={i18n.t("adminCatalogs.hex")} onChange={(event) => edit(index, { hex: event.target.value })} />
                  )}
                </td>
              )}
              {kind === "budgets" && (
                <>
                  <td>
                    <input type="number" min={0} value={Number(row.minAmount)} aria-label={i18n.t("adminCatalogs.min")} onChange={(event) => edit(index, { minAmount: Number(event.target.value) })} />
                  </td>
                  <td>
                    <input type="number" min={0} value={row.maxAmount === null ? "" : Number(row.maxAmount)} placeholder="∞" aria-label={i18n.t("adminCatalogs.max")} onChange={(event) => edit(index, { maxAmount: event.target.value ? Number(event.target.value) : null })} />
                  </td>
                </>
              )}
              {kind === "avatars" && (
                <td className="cell-with-image">
                  <img className="avatar" src={String(row.imageUrl)} alt="" width={32} height={32} />
                  <input value={String(row.imageUrl)} aria-label={i18n.t("adminCatalogs.image")} onChange={(event) => edit(index, { imageUrl: event.target.value })} />
                </td>
              )}
              {kind === "templates" && (
                <td className="tpl-cell">
                  <TemplatePreview template={catalogs.templates.find((template) => template.id === row.id) ?? catalogs.templates[0]} />
                </td>
              )}
              <td>
                <input type="number" className="narrow-input" value={row.sortOrder} aria-label={i18n.t("adminCatalogs.order")} onChange={(event) => edit(index, { sortOrder: Number(event.target.value) })} />
              </td>
              <td>
                <input type="checkbox" checked={row.isActive} aria-label={i18n.t("adminCatalogs.active")} onChange={(event) => edit(index, { isActive: event.target.checked })} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {kind !== "templates" && (
        <button type="button" className="btn btn-quiet" onClick={add}>
          <Icon name="plus" /> {i18n.t("adminCatalogs.add")}
        </button>
      )}
    </>
  );
}
