import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { SettingValue } from "../domain/admin";
import type { Catalogs } from "../domain/catalog";
import type { Id } from "../domain/common";
import { services } from "../services/ServiceRegistry";

interface CatalogValue {
  catalogs: Catalogs | null;
  /** Public settings, e.g. setting("commerce.shipping_flat_cost", 25). */
  setting<T extends SettingValue>(key: string, fallback: T): T;
  reload(): Promise<void>;
  color(id: Id | null | undefined): Catalogs["colors"][number] | undefined;
  shape(id: Id | null | undefined): Catalogs["shapes"][number] | undefined;
  style(id: Id | null | undefined): Catalogs["styles"][number] | undefined;
  motif(id: Id | null | undefined): Catalogs["motifs"][number] | undefined;
  avatar(id: Id | null | undefined): Catalogs["avatars"][number] | undefined;
  template(id: Id | null | undefined): Catalogs["templates"][number] | undefined;
}

const CatalogContext = createContext<CatalogValue | null>(null);

/** Loads the catalogs once (colors, shapes, motifs, styles, budgets, avatars, templates). */
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalogs, setCatalogs] = useState<Catalogs | null>(null);
  const [settings, setSettings] = useState<Record<string, SettingValue>>({});
  const reload = useCallback(async () => {
    const [nextCatalogs, nextSettings] = await Promise.all([services.catalog.getCatalogs(), services.catalog.getPublicSettings().catch(() => ({}))]);
    setCatalogs(nextCatalogs);
    setSettings(nextSettings);
  }, []);

  useEffect(() => {
    reload().catch(() => setCatalogs(null));
  }, [reload]);

  const value = useMemo<CatalogValue>(() => {
    const find = <T extends { id: Id }>(list: T[] | undefined, id: Id | null | undefined) => (id ? list?.find((item) => item.id === id) : undefined);
    return {
      catalogs,
      reload,
      setting: <T extends SettingValue>(key: string, fallback: T) => (settings[key] as T | undefined) ?? fallback,
      color: (id) => find(catalogs?.colors, id),
      shape: (id) => find(catalogs?.shapes, id),
      style: (id) => find(catalogs?.styles, id),
      motif: (id) => find(catalogs?.motifs, id),
      avatar: (id) => find(catalogs?.avatars, id),
      template: (id) => find(catalogs?.templates, id),
    };
  }, [catalogs, settings, reload]);
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalogs(): CatalogValue {
  const value = useContext(CatalogContext);
  if (!value) throw new Error("useCatalogs outside CatalogProvider");
  return value;
}
