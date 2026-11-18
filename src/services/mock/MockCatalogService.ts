import type { SettingValue } from "../../domain/admin";
import type { CatalogItem, CatalogKind, Catalogs } from "../../domain/catalog";
import type { CatalogService } from "../contracts/CatalogService";
import { MockDatabase } from "./MockDatabase";
import { copy, latency, MockSession } from "./MockSession";

export class MockCatalogService implements CatalogService {
  async getCatalogs(): Promise<Catalogs> {
    await latency();
    return copy(MockDatabase.instance.tables.catalogs);
  }

  async getPublicSettings(): Promise<Record<string, SettingValue>> {
    await latency();
    return Object.fromEntries(MockDatabase.instance.tables.settings.filter((setting) => setting.isPublic).map((setting) => [setting.key, setting.value]));
  }

  async saveItem(kind: CatalogKind, item: CatalogItem & Record<string, unknown>): Promise<void> {
    await latency();
    const admin = MockSession.requireUser("ADMIN");
    const db = MockDatabase.instance;
    const list = db.tables.catalogs[kind] as unknown as (CatalogItem & Record<string, unknown>)[];
    if (item.id) {
      const index = list.findIndex((entry) => entry.id === item.id);
      list[index] = { ...list[index], ...item };
      db.audit(kind, item.id, "U", admin.id, `Catálogo ${kind}: ${item.code} actualizado`);
    } else {
      const id = list.reduce((max, entry) => Math.max(max, entry.id), 0) + 1;
      list.push({ ...item, id });
      db.audit(kind, id, "I", admin.id, `Catálogo ${kind}: ${item.code} creado`);
    }
    db.save();
  }
}
