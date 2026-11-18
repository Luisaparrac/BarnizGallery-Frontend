import type { AdminDashboard, AppSetting, AuditEntry, ContentReport, PendingVerification, SettingValue, SuspiciousBid, UserFilter } from "../../domain/admin";
import type { Id } from "../../domain/common";
import type { Payout, StoreSales } from "../../domain/commerce";
import type { StoreStatus, StoreSummary } from "../../domain/gallery";
import type { User, UserRole, UserStatus } from "../../domain/user";

export interface AdminService {
  getDashboard(): Promise<AdminDashboard>;
  listPendingVerifications(): Promise<PendingVerification[]>;
  reviewStep(stepId: Id, approved: boolean, notes: string): Promise<void>;
  listUsers(filter: UserFilter): Promise<User[]>;
  updateUser(id: Id, change: { role?: UserRole; status?: UserStatus }): Promise<User>;
  listStores(): Promise<StoreSummary[]>;
  setStoreStatus(storeId: Id, status: StoreStatus): Promise<void>;
  listSettings(): Promise<AppSetting[]>;
  updateSetting(key: string, value: SettingValue): Promise<void>;
  listSuspiciousBids(): Promise<SuspiciousBid[]>;
  markBidValid(bidId: Id): Promise<void>;
  listReports(): Promise<ContentReport[]>;
  resolveReport(id: Id, status: "RESOLVED" | "DISCARDED"): Promise<void>;
  listStoreSales(): Promise<StoreSales[]>;
  listPayouts(): Promise<Payout[]>;
  createPayout(masterId: Id): Promise<Payout>;
  markPayoutPaid(id: Id, reference: string): Promise<void>;
  listAudit(): Promise<AuditEntry[]>;
}
