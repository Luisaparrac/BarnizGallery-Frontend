import type { Id } from "../domain/common";
import { useCatalogs } from "../state/CatalogContext";
import { useLocale } from "../state/LocaleContext";

/** Grid of the avatars of the catalog; the chosen one is highlighted. */
export function AvatarPicker({ value, onChange }: { value: Id | null; onChange(id: Id): void }) {
  const { catalogs } = useCatalogs();
  const { i18n } = useLocale();
  return (
    <div className="avatar-grid" role="radiogroup" aria-label={i18n.t("welcome.avatarTitle")}>
      {(catalogs?.avatars ?? [])
        .filter((avatar) => avatar.isActive)
        .map((avatar) => (
          <button key={avatar.id} type="button" role="radio" aria-checked={value === avatar.id} className={value === avatar.id ? "is-on" : ""} onClick={() => onChange(avatar.id)}>
            <img src={avatar.imageUrl} alt="" width={88} height={88} />
            <span>{i18n.name(avatar)}</span>
          </button>
        ))}
    </div>
  );
}
