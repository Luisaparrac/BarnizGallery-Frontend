import type { SettingValue } from "../../domain/admin";
import type { Id } from "../../domain/common";
import { AppError } from "../../domain/errors";
import type { NotificationType } from "../../domain/messaging";
import type { MockTables } from "./MockTables";
import { SeedData } from "./SeedData";

const STORAGE_KEY = "museo.mock.v3";

/**
 * In-browser stand-in for the PostgreSQL database (Singleton). Keeps every table in memory,
 * saves them in localStorage after each change and offers the helpers the triggers do in the real DB
 * (ids, timestamps, audit log, notifications).
 */
export class MockDatabase {
  private static current: MockDatabase | null = null;

  static get instance(): MockDatabase {
    return (MockDatabase.current ??= new MockDatabase());
  }

  readonly tables: MockTables;

  private constructor() {
    this.tables = MockDatabase.load() ?? SeedData.build();
    this.save();
  }

  /** Throws away every change and starts again from the demo data. */
  static reset(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    MockDatabase.current = null;
  }

  private static load(): MockTables | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as MockTables) : null;
    } catch {
      return null;
    }
  }

  save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.tables));
    } catch {
      throw new AppError("storageFull", "The browser storage is full: use smaller images or reset the demo data");
    }
  }

  nextId(table: string): Id {
    const value = (this.tables.counters[table] ?? 0) + 1;
    this.tables.counters[table] = value;
    return value;
  }

  now(): string {
    return new Date().toISOString();
  }

  setting<T extends SettingValue>(key: string, fallback: T): T {
    const found = this.tables.settings.find((setting) => setting.key === key);
    return (found?.value as T | undefined) ?? fallback;
  }

  audit(tableName: string, rowId: Id | string, operation: "I" | "U" | "D", userId: Id | null, summary: string): void {
    this.tables.audit.unshift({
      id: this.nextId("audit"),
      tableName,
      rowId: String(rowId),
      operation,
      userId,
      summary,
      changedAt: this.now(),
    });
    this.tables.audit.length = Math.min(this.tables.audit.length, 400);
  }

  notify(userId: Id | null | undefined, type: NotificationType, title: string, body: string | null, link: string | null): void {
    if (!userId) return;
    this.tables.notifications.unshift({
      id: this.nextId("notifications"),
      userId,
      type,
      title,
      body,
      link,
      readAt: null,
      createdAt: this.now(),
    });
  }

  /** Notifies every active administrator. */
  notifyAdmins(type: NotificationType, title: string, body: string | null, link: string | null): void {
    this.tables.users
      .filter((user) => user.role === "ADMIN" && user.status === "ACTIVE")
      .forEach((admin) => this.notify(admin.id, type, title, body, link));
  }

  require<T>(row: T | undefined, what: string): T {
    if (!row) throw new AppError("notFound", `${what} not found`, 404);
    return row;
  }
}
