import type { SettingValue } from "../../domain/admin";
import type { CatalogItem, CatalogKind, Catalogs } from "../../domain/catalog";
import type { CatalogService } from "../contracts/CatalogService";
import { HttpClient } from "./HttpClient";

export class ApiCatalogService implements CatalogService {
  private readonly http = HttpClient.shared;

  getCatalogs(): Promise<Catalogs> {
    return this.http.get<Catalogs>("/api/catalogs");
  }

  getPublicSettings(): Promise<Record<string, SettingValue>> {
    return this.http.get<Record<string, SettingValue>>("/api/settings/public");
  }

  async saveItem(kind: CatalogKind, item: CatalogItem & Record<string, unknown>): Promise<void> {
    if (item.id) await this.http.put(`/api/admin/catalogs/${kind}/${item.id}`, item);
    else await this.http.post(`/api/admin/catalogs/${kind}`, item);
  }
}
