import type { Id } from "../domain/common";
import { useCatalogs } from "../state/CatalogContext";
import { useLocale } from "../state/LocaleContext";

export function AvatarImage({ avatarId, name, size = 36 }: { avatarId: Id | null | undefined; name: string; size?: number }) {
  const { avatar } = useCatalogs();
  const { i18n } = useLocale();
  const item = avatar(avatarId);
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return item ? (
    <img className="avatar" src={item.imageUrl} alt={i18n.name(item)} width={size} height={size} />
  ) : (
    <span className="avatar avatar-initials" style={{ width: size, height: size }} aria-hidden="true">
      {initials}
    </span>
  );
}
