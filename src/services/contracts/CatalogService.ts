import type { SettingValue } from "../../domain/admin";
import type { CatalogItem, CatalogKind, Catalogs } from "../../domain/catalog";

export interface CatalogService {
  getCatalogs(): Promise<Catalogs>;
  /** Settings marked is_public (shipping cost, deposit percent, limits...). */
  getPublicSettings(): Promise<Record<string, SettingValue>>;
  /** Administrator: create (id 0) or update an item of a catalog. */
  saveItem(kind: CatalogKind, item: CatalogItem & Record<string, unknown>): Promise<void>;
}
