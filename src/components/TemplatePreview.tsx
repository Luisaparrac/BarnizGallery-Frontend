import type { StoreTemplate } from "../domain/catalog";
import { useLocale } from "../state/LocaleContext";

/** Small schematic of a store template: its colors and the order of its sections. */
export function TemplatePreview({ template }: { template: StoreTemplate }) {
  const { i18n } = useLocale();
  const theme = template.defaultTheme;
  return (
    <div className="tpl-preview" style={{ background: theme.background, color: theme.primary }} aria-hidden="true">
      <div className="tpl-cover" style={{ background: theme.primary }}>
        <span style={{ background: theme.accent }} />
      </div>
      {template.defaultLayout.slice(1, 5).map((type) => (
        <div key={type} className={`tpl-row tpl-${type.toLowerCase()}`}>
          <small>{i18n.tx(`section.${type}`, type)}</small>
          {["GALLERY", "CATALOG", "FEATURED"].includes(type) ? (
            <span className="tpl-cells">
              <i style={{ background: theme.accent }} />
              <i />
              <i />
            </span>
          ) : (
            <span className="tpl-lines">
              <i />
              <i />
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
