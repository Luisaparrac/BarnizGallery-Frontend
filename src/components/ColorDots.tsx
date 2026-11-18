import type { Id } from "../domain/common";
import { useCatalogs } from "../state/CatalogContext";
import { useLocale } from "../state/LocaleContext";

/** The resin colors of a piece, as small dots with the names for screen readers. */
export function ColorDots({ colorIds }: { colorIds: Id[] }) {
  const { color } = useCatalogs();
  const { i18n } = useLocale();
  const colors = colorIds.map((id) => color(id)).filter((item) => !!item);
  if (!colors.length) return null;
  return (
    <span className="dots" aria-label={colors.map((item) => i18n.name(item)).join(", ")} role="img">
      {colors.map((item) => (
        <span key={item.id} className={`dot${item.hex ? "" : " swatch-multi"}`} style={item.hex ? { background: item.hex } : undefined} title={i18n.name(item)} />
      ))}
    </span>
  );
}
