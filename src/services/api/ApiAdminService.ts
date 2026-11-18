import type { AdminDashboard, AppSetting, AuditEntry, ContentReport, PendingVerification, SettingValue, SuspiciousBid, UserFilter } from "../../domain/admin";
import type { Id } from "../../domain/common";
import type { Payout, StoreSales } from "../../domain/commerce";
import type { StoreStatus, StoreSummary } from "../../domain/gallery";
import type { User, UserRole, UserStatus } from "../../domain/user";
import type { AdminService } from "../contracts/AdminService";
import { HttpClient } from "./HttpClient";

export class ApiAdminService implements AdminService {
  private readonly http = HttpClient.shared;
  private readonly base = "/api/admin";

  getDashboard(): Promise<AdminDashboard> {
    return this.http.get<AdminDashboard>(`${this.base}/dashboard`);
  }

  listPendingVerifications(): Promise<PendingVerification[]> {
    return this.http.get<PendingVerification[]>(`${this.base}/verifications`);
  }

  async reviewStep(stepId: Id, approved: boolean, notes: string): Promise<void> {
    await this.http.post(`${this.base}/verifications/steps/${stepId}`, { approved, notes });
  }

  listUsers(filter: UserFilter): Promise<User[]> {
    return this.http.get<User[]>(`${this.base}/users`, { ...filter });
  }

  updateUser(id: Id, change: { role?: UserRole; status?: UserStatus }): Promise<User> {
    return this.http.patch<User>(`${this.base}/users/${id}`, change);
  }

  listStores(): Promise<StoreSummary[]> {
    return this.http.get<StoreSummary[]>(`${this.base}/stores`);
  }

  async setStoreStatus(storeId: Id, status: StoreStatus): Promise<void> {
    await this.http.patch(`${this.base}/stores/${storeId}`, { status });
  }

  listSettings(): Promise<AppSetting[]> {
    return this.http.get<AppSetting[]>(`${this.base}/settings`);
  }

  async updateSetting(key: string, value: SettingValue): Promise<void> {
    await this.http.put(`${this.base}/settings/${encodeURIComponent(key)}`, { value });
  }

  listSuspiciousBids(): Promise<SuspiciousBid[]> {
    return this.http.get<SuspiciousBid[]>(`${this.base}/bids/suspicious`);
  }

  async markBidValid(bidId: Id): Promise<void> {
    await this.http.post(`${this.base}/bids/${bidId}/valid`);
  }

  listReports(): Promise<ContentReport[]> {
    return this.http.get<ContentReport[]>(`${this.base}/reports`);
  }

  async resolveReport(id: Id, status: "RESOLVED" | "DISCARDED"): Promise<void> {
    await this.http.patch(`${this.base}/reports/${id}`, { status });
  }

  listStoreSales(): Promise<StoreSales[]> {
    return this.http.get<StoreSales[]>(`${this.base}/sales`);
  }

  listPayouts(): Promise<Payout[]> {
    return this.http.get<Payout[]>(`${this.base}/payouts`);
  }

  createPayout(masterId: Id): Promise<Payout> {
    return this.http.post<Payout>(`${this.base}/payouts`, { masterId });
  }

  async markPayoutPaid(id: Id, reference: string): Promise<void> {
    await this.http.post(`${this.base}/payouts/${id}/paid`, { reference });
  }

  listAudit(): Promise<AuditEntry[]> {
    return this.http.get<AuditEntry[]>(`${this.base}/audit`);
  }
}
