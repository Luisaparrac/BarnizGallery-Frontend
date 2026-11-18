import type { Id, IsoDate } from "./common";
import type { ReportEntity, VerificationStatus, VerificationStep } from "./gallery";

/** View v_admin_dashboard. */
export interface AdminDashboard {
  activeCustomers: number;
  activeArtisans: number;
  pendingVerifications: number;
  publishedStores: number;
  visibleArtworks: number;
  activeAuctions: number;
  openCustomRequests: number;
  ordersWaitingPayment: number;
  ordersToShip: number;
  revenueThisMonth: number;
  feesThisMonth: number;
  suspiciousBids7d: number;
  openReports: number;
  currency: string;
}

/** View v_pending_verifications plus the steps to review. */
export interface PendingVerification {
  masterId: Id;
  masterName: string;
  email: string | null;
  workshop: string;
  verificationStatus: VerificationStatus;
  steps: VerificationStep[];
  requestedAt: IsoDate | null;
}

export type SettingValue = string | number | boolean | string[];

export interface AppSetting {
  key: string;
  value: SettingValue;
  description: string;
  isPublic: boolean;
  updatedAt: IsoDate;
}

export interface ContentReport {
  id: Id;
  reporterId: Id;
  reporterName: string;
  entityType: ReportEntity;
  entityId: Id;
  entityLabel: string;
  reason: string;
  status: "OPEN" | "RESOLVED" | "DISCARDED";
  createdAt: IsoDate;
  resolvedAt: IsoDate | null;
}

export interface AuditEntry {
  id: Id;
  tableName: string;
  rowId: string;
  operation: "I" | "U" | "D";
  userId: Id | null;
  userName: string | null;
  summary: string;
  changedAt: IsoDate;
}

export interface SuspiciousBid {
  bidId: Id;
  auctionId: Id;
  artworkTitle: string;
  userName: string;
  amount: number;
  currency: string;
  reason: string | null;
  bidDate: IsoDate;
}

export interface UserFilter {
  search?: string;
  role?: string;
  status?: string;
}
