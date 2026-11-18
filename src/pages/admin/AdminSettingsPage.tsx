import { useState } from "react";
import { ErrorNote, Loading } from "../../components/Feedback";
import { PageHeader } from "../../components/PageHeader";
import type { AppSetting, SettingValue } from "../../domain/admin";
import { useAsync } from "../../hooks/useAsync";
import { useErrorText } from "../../hooks/useErrorText";
import { services } from "../../services/ServiceRegistry";
import { useCatalogs } from "../../state/CatalogContext";
import { useLocale } from "../../state/LocaleContext";
import { useToast } from "../../state/ToastContext";

/** Values of app_settings: the rules the backend reads (commission, auctions, custom orders, gateway, AI). */
export function AdminSettingsPage() {
  const { i18n, format } = useLocale();
  const { reload } = useCatalogs();
  const toast = useToast();
  const errorText = useErrorText();
  const settings = useAsync(() => services.admin.listSettings(), []);
  const [drafts, setDrafts] = useState<Record<string, SettingValue>>({});

  const save = async (setting: AppSetting) => {
    try {
      await services.admin.updateSetting(setting.key, drafts[setting.key]);
      const next = { ...drafts };
      delete next[setting.key];
      setDrafts(next);
      await Promise.all([settings.reload(), reload()]);
      toast.show(i18n.t("adminSettings.saved", { key: setting.key }), "success");
    } catch (error) {
      toast.show(errorText(error), "error");
    }
  };

  if (settings.loading && !settings.data) return <Loading />;
  if (settings.error !== null || !settings.data) return <ErrorNote error={settings.error} />;
  const groups = new Map<string, AppSetting[]>();
  settings.data.forEach((setting) => groups.set(setting.key.split(".")[0], [...(groups.get(setting.key.split(".")[0]) ?? []), setting]));

  return (
    <>
      <PageHeader title={i18n.t("adminSettings.title")} lead={i18n.t("adminSettings.lead")} />
      {[...groups.entries()].map(([group, list]) => (
        <section key={group} className="block">
          <h2 className="h3">{i18n.tx(`adminSettings.group.${group}`, group)}</h2>
          <ul className="setting-list">
            {list.map((setting) => {
              const value = drafts[setting.key] ?? setting.value;
              const dirty = setting.key in drafts;
              const set = (next: SettingValue) => setDrafts({ ...drafts, [setting.key]: next });
              return (
                <li key={setting.key}>
                  <div>
                    <strong>{setting.description}</strong>
                    <small className="muted">
                      <code>{setting.key}</code> — {setting.isPublic ? i18n.t("adminSettings.public") : i18n.t("adminSettings.private")} — {format.dateTime(setting.updatedAt)}
                    </small>
                  </div>
                  <div className="setting-control">
                    {typeof setting.value === "boolean" ? (
                      <label className="check">
                        <input type="checkbox" checked={value as boolean} onChange={(event) => set(event.target.checked)} /> {value ? i18n.t("common.yes") : i18n.t("common.no")}
                      </label>
                    ) : typeof setting.value === "number" ? (
                      <input type="number" min={0} value={value as number} onChange={(event) => set(Number(event.target.value))} aria-label={setting.key} />
                    ) : Array.isArray(setting.value) ? (
                      <input value={(value as string[]).join(", ")} onChange={(event) => set(event.target.value.split(",").map((item) => item.trim()).filter(Boolean))} aria-label={setting.key} />
                    ) : (
                      <input value={value as string} onChange={(event) => set(event.target.value)} aria-label={setting.key} />
                    )}
                    <button type="button" className="btn btn-primary btn-small" disabled={!dirty} onClick={() => void save(setting)}>
                      {i18n.t("common.save")}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
