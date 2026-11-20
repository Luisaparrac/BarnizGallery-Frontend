import type { Id } from "../../domain/common";
import { AppError } from "../../domain/errors";
import type { Master, Store } from "../../domain/gallery";
import type { UserRole } from "../../domain/user";
import { TokenStore } from "../api/TokenStore";
import { MockDatabase } from "./MockDatabase";
import type { UserRow } from "./MockTables";

/** Who is calling the simulated backend, read from the stored session token ("mock-<userId>"). */
export class MockSession {
  static tokenFor(userId: Id): string {
    return `mock-${userId}`;
  }

  static currentUserId(): Id | null {
    const token = TokenStore.token;
    if (!token?.startsWith("mock-")) return null;
    return Number(token.slice(5)) || null;
  }

  static currentUser(): UserRow | null {
    const id = MockSession.currentUserId();
    return id ? (MockDatabase.instance.tables.users.find((user) => user.id === id) ?? null) : null;
  }

  static requireUser(...roles: UserRole[]): UserRow {
    const user = MockSession.currentUser();
    if (!user) throw new AppError("unauthorized", "Sign in to continue", 401);
    if (user.status === "SUSPENDED" || user.status === "DELETED") throw new AppError("suspended", "This account is suspended", 403);
    if (roles.length && !roles.includes(user.role)) throw new AppError("forbidden", "Not allowed for this role", 403);
    return user;
  }

  /**
   * The approved artisan calling: store, works, orders, auctions, custom orders and sales are closed
   * until the administration approves the account (only the verification is open before).
   */
  static requireApprovedArtisan(): { user: UserRow; master: Master; store: Store } {
    const artisan = MockSession.requireArtisan();
    if (artisan.master.verificationStatus !== "APPROVED") throw new AppError("forbidden", "Only approved artisans can use this", 403);
    return artisan;
  }

  /** The artisan calling, with the master record and the store it owns. */
  static requireArtisan(): { user: UserRow; master: Master; store: Store } {
    const user = MockSession.requireUser("ARTISAN");
    const db = MockDatabase.instance;
    const master = db.require(db.tables.masters.find((row) => row.userId === user.id), "Master");
    const store = db.require(db.tables.stores.find((row) => row.masterId === master.id), "Store");
    return { user, master, store };
  }
}

/** Simulated network latency so loading states are visible. */
export function latency(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 120 + Math.random() * 220));
}

/** Copies data before returning it, as a real API would. */
export function copy<T>(value: T): T {
  return structuredClone(value);
}
