import type { AdminDashboard, AppSetting, AuditEntry, ContentReport, PendingVerification, SettingValue, SuspiciousBid, UserFilter } from "../../domain/admin";
import type { Id } from "../../domain/common";
import type { Payout, StoreSales } from "../../domain/commerce";
import { AppError } from "../../domain/errors";
import type { StoreStatus, StoreSummary } from "../../domain/gallery";
import type { User, UserRole, UserStatus } from "../../domain/user";
import type { AdminService } from "../contracts/AdminService";
import { MockDatabase } from "./MockDatabase";
import { money, rules } from "./MockRules";
import { copy, latency, MockSession } from "./MockSession";
import { views } from "./MockViews";

const PAID = new Set(["PAID", "PREPARING", "SHIPPED", "DELIVERED"]);

export class MockAdminService implements AdminService {
  private get db() {
    return MockDatabase.instance;
  }

  private get t() {
    return this.db.tables;
  }

  private admin() {
    return MockSession.requireUser("ADMIN");
  }

  /** View v_admin_dashboard. */
  async getDashboard(): Promise<AdminDashboard> {
    await latency();
    this.admin();
    rules.syncAuctions();
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const paidThisMonth = this.t.orders.filter((order) => PAID.has(order.status) && order.paidAt && Date.parse(order.paidAt) >= monthStart.getTime());
    const weekAgo = Date.now() - 7 * 86_400_000;
    return {
      activeCustomers: this.t.users.filter((user) => user.role === "CUSTOMER" && user.status === "ACTIVE").length,
      activeArtisans: this.t.users.filter((user) => user.role === "ARTISAN" && user.status === "ACTIVE").length,
      pendingVerifications: this.t.masters.filter((master) => master.verificationStatus === "PENDING" || master.verificationStatus === "IN_REVIEW").length,
      publishedStores: this.t.stores.filter((store) => store.status === "PUBLISHED").length,
      visibleArtworks: this.t.artworks.filter((artwork) => views.isPublicArtwork(artwork)).length,
      activeAuctions: this.t.auctions.filter((auction) => auction.status === "ACTIVE").length,
      openCustomRequests: this.t.customRequests.filter((request) => request.status === "PUBLISHED" || request.status === "WITH_OFFERS").length,
      ordersWaitingPayment: this.t.orders.filter((order) => order.status === "PENDING_PAYMENT").length,
      ordersToShip: this.t.orders.filter((order) => order.status === "PAID" || order.status === "PREPARING").length,
      revenueThisMonth: money(paidThisMonth.reduce((total, order) => total + order.total, 0)),
      feesThisMonth: money(paidThisMonth.reduce((total, order) => total + order.platformFee, 0)),
      suspiciousBids7d: this.t.bids.filter((bid) => bid.reviewStatus === "SUSPICIOUS" && Date.parse(bid.bidDate) >= weekAgo).length,
      openReports: this.t.reports.filter((report) => report.status === "OPEN").length,
      currency: String(this.db.setting("currency.default", "USD")),
    };
  }

  async listPendingVerifications(): Promise<PendingVerification[]> {
    await latency();
    this.admin();
    return copy(
      this.t.masters
        .filter((master) => master.verificationStatus === "PENDING" || master.verificationStatus === "IN_REVIEW" || master.verificationStatus === "REJECTED")
        .map((master) => {
          const steps = this.t.verifications.filter((step) => step.masterId === master.id);
          return {
            masterId: master.id,
            masterName: master.name,
            email: this.t.users.find((user) => user.id === master.userId)?.email ?? null,
            workshop: master.workshop,
            verificationStatus: master.verificationStatus,
            steps,
            requestedAt: this.t.users.find((user) => user.id === master.userId)?.createdAt ?? null,
          };
        }),
    );
  }

  /** Approving the last step (ADMIN_APPROVAL) approves the artisan and activates the account. */
  async reviewStep(stepId: Id, approved: boolean, notes: string): Promise<void> {
    await latency();
    const admin = this.admin();
    const step = this.db.require(this.t.verifications.find((row) => row.id === stepId), "Step");
    const master = this.db.require(this.t.masters.find((row) => row.id === step.masterId), "Master");
    const steps = this.t.verifications.filter((row) => row.masterId === master.id);
    if (!approved && !notes.trim()) throw new AppError("rejectReason", "Write the reason for the rejection", 422);
    if (approved && step.step === "ADMIN_APPROVAL" && steps.some((row) => row.step !== "ADMIN_APPROVAL" && row.status !== "APPROVED")) {
      throw new AppError("mustApproveSteps", "Approve the other steps first", 409);
    }
    step.status = approved ? "APPROVED" : "REJECTED";
    step.notes = notes.trim() || null;
    step.reviewedAt = this.db.now();
    this.db.audit("master_verifications", step.id, "U", admin.id, `${master.name}: paso ${step.step} ${approved ? "aprobado" : "rechazado"}`);
    if (approved && step.step === "ADMIN_APPROVAL") {
      master.verificationStatus = "APPROVED";
      master.verifiedAt = this.db.now();
      const user = this.t.users.find((row) => row.id === master.userId);
      if (user) user.status = "ACTIVE";
      this.db.audit("masters", master.id, "U", admin.id, `Artesano ${master.name} aprobado`);
      this.db.notify(master.userId, "VERIFICATION_APPROVED", "Tu cuenta de artesano fue aprobada", "Ya puedes publicar tu tienda.", "/artisan/store");
    } else if (!approved) {
      master.verificationStatus = "IN_REVIEW";
      this.db.notify(master.userId, "VERIFICATION_REJECTED", "Un paso de tu verificación fue rechazado", notes, "/artisan/verification");
    }
    this.db.save();
  }

  async listUsers(filter: UserFilter): Promise<User[]> {
    await latency();
    this.admin();
    const search = filter.search?.trim().toLowerCase();
    return copy(
      this.t.users
        .filter((user) => (!filter.role || user.role === filter.role) && (!filter.status || user.status === filter.status))
        .filter((user) => !search || user.fullName.toLowerCase().includes(search) || user.email.toLowerCase().includes(search))
        .map((user) => views.user(user)),
    );
  }

  async updateUser(id: Id, change: { role?: UserRole; status?: UserStatus }): Promise<User> {
    await latency();
    const admin = this.admin();
    if (id === admin.id) throw new AppError("ownAccount", "You cannot change your own account here", 422);
    const user = this.db.require(this.t.users.find((row) => row.id === id), "User");
    if (change.role === "ARTISAN" && !this.t.masters.some((master) => master.userId === id)) {
      throw new AppError("artisanByRegister", "A user becomes an artisan by registering as one (it needs a master record and verification)", 422);
    }
    Object.assign(user, change);
    this.db.audit("users", id, "U", admin.id, `Usuario ${user.email}: ${JSON.stringify(change)}`);
    this.db.save();
    return copy(views.user(user));
  }

  async listStores(): Promise<StoreSummary[]> {
    await latency();
    this.admin();
    return copy(this.t.stores.map((store) => views.storeSummary(store)));
  }

  async setStoreStatus(storeId: Id, status: StoreStatus): Promise<void> {
    await latency();
    const admin = this.admin();
    const store = this.db.require(this.t.stores.find((row) => row.id === storeId), "Store");
    const master = this.t.masters.find((row) => row.id === store.masterId);
    if (status === "PUBLISHED" && master?.verificationStatus !== "APPROVED") throw new AppError("notApprovedArtisan", "The artisan is not approved yet", 409);
    store.status = status;
    if (status === "PUBLISHED") store.publishedAt = store.publishedAt ?? this.db.now();
    this.db.audit("stores", store.id, "U", admin.id, `Tienda ${store.slug}: ${status}`);
    if (status === "SUSPENDED") this.db.notify(master?.userId, "SYSTEM", "Tu tienda fue suspendida", "Escribe a la administración para más información.", "/artisan/store");
    this.db.save();
  }

  async listSettings(): Promise<AppSetting[]> {
    await latency();
    this.admin();
    return copy(this.t.settings);
  }

  async updateSetting(key: string, value: SettingValue): Promise<void> {
    await latency();
    const admin = this.admin();
    const setting = this.db.require(this.t.settings.find((row) => row.key === key), "Setting");
    if (typeof setting.value !== typeof value || Array.isArray(setting.value) !== Array.isArray(value)) throw new AppError("settingType", "The value has the wrong type", 422);
    if (typeof value === "number" && (!Number.isFinite(value) || value < 0)) throw new AppError("positiveNumber", "Use a positive number", 422);
    const before = setting.value;
    setting.value = value;
    setting.updatedAt = this.db.now();
    this.db.audit("app_settings", key, "U", admin.id, `${key}: ${JSON.stringify(before)} → ${JSON.stringify(value)}`);
    this.db.save();
  }

  async listSuspiciousBids(): Promise<SuspiciousBid[]> {
    await latency();
    this.admin();
    return copy(
      this.t.bids
        .filter((bid) => bid.reviewStatus === "SUSPICIOUS")
        .sort((a, b) => b.bidDate.localeCompare(a.bidDate))
        .map((bid) => {
          const auction = this.t.auctions.find((row) => row.id === bid.auctionId)!;
          const artwork = this.t.artworks.find((row) => row.id === auction.artworkId)!;
          return { bidId: bid.id, auctionId: bid.auctionId, artworkTitle: artwork.titleEs, userName: views.userName(bid.userId), amount: bid.amount, currency: bid.currency, reason: bid.reviewReason, bidDate: bid.bidDate };
        }),
    );
  }

  async markBidValid(bidId: Id): Promise<void> {
    await latency();
    const admin = this.admin();
    const bid = this.db.require(this.t.bids.find((row) => row.id === bidId), "Bid");
    bid.reviewStatus = "VALID";
    bid.reviewReason = `Revisada por ${admin.fullName}`;
    this.db.audit("bids", bidId, "U", admin.id, `Puja ${bidId} marcada como válida`);
    this.db.save();
  }

  async listReports(): Promise<ContentReport[]> {
    await latency();
    this.admin();
    return copy(
      this.t.reports
        .slice()
        .sort((a, b) => (a.status === "OPEN" ? -1 : 1) - (b.status === "OPEN" ? -1 : 1) || b.createdAt.localeCompare(a.createdAt))
        .map((report) => ({ ...report, reporterName: views.userName(report.reporterId), entityLabel: this.entityLabel(report.entityType, report.entityId) })),
    );
  }

  private entityLabel(type: string, id: Id): string {
    if (type === "ARTWORK") return this.t.artworks.find((row) => row.id === id)?.titleEs ?? `#${id}`;
    if (type === "STORE") return this.t.stores.find((row) => row.id === id)?.nameEs ?? `#${id}`;
    if (type === "CUSTOM_REQUEST") return this.t.customRequests.find((row) => row.id === id)?.title ?? `#${id}`;
    if (type === "USER") return views.userName(id);
    return `#${id}`;
  }

  async resolveReport(id: Id, status: "RESOLVED" | "DISCARDED"): Promise<void> {
    await latency();
    const admin = this.admin();
    const report = this.db.require(this.t.reports.find((row) => row.id === id), "Report");
    report.status = status;
    report.resolvedAt = this.db.now();
    this.db.audit("content_reports", id, "U", admin.id, `Reporte ${id}: ${status}`);
    this.db.save();
  }

  async listStoreSales(): Promise<StoreSales[]> {
    await latency();
    this.admin();
    return copy(this.t.stores.map((store) => views.storeSales(store)).sort((a, b) => b.pendingPayout - a.pendingPayout));
  }

  async listPayouts(): Promise<Payout[]> {
    await latency();
    this.admin();
    return copy(this.t.payouts.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((row) => views.payout(row)));
  }

  /** Groups the delivered, not yet paid items of an artisan into one payout. */
  async createPayout(masterId: Id): Promise<Payout> {
    await latency();
    const admin = this.admin();
    const store = this.db.require(this.t.stores.find((row) => row.masterId === masterId), "Store");
    const items = this.t.orders
      .filter((order) => PAID.has(order.status))
      .flatMap((order) => order.items)
      .filter((item) => item.storeId === store.id && item.fulfillmentStatus === "DELIVERED" && item.payoutId === null);
    if (!items.length) throw new AppError("nothingToPay", "There are no delivered items waiting for payout", 422);
    const payout = { id: this.db.nextId("payouts"), masterId, amount: money(items.reduce((total, item) => total + item.artisanAmount, 0)), currency: "USD", status: "PENDING" as const, reference: null, createdAt: this.db.now(), paidAt: null };
    this.t.payouts.push(payout);
    items.forEach((item) => (item.payoutId = payout.id));
    this.db.audit("payouts", payout.id, "I", admin.id, `Liquidación de ${payout.amount} USD`);
    this.db.save();
    return copy(views.payout(payout));
  }

  async markPayoutPaid(id: Id, reference: string): Promise<void> {
    await latency();
    const admin = this.admin();
    const payout = this.db.require(this.t.payouts.find((row) => row.id === id), "Payout");
    if (!reference.trim()) throw new AppError("payoutReference", "Write the transfer reference", 422);
    payout.status = "PAID";
    payout.reference = reference.trim();
    payout.paidAt = this.db.now();
    const master = this.t.masters.find((row) => row.id === payout.masterId);
    this.db.notify(master?.userId, "SYSTEM", `Te pagamos ${payout.amount} ${payout.currency}`, `Referencia: ${payout.reference}`, "/artisan");
    this.db.audit("payouts", id, "U", admin.id, `Liquidación ${id} pagada (${payout.reference})`);
    this.db.save();
  }

  async listAudit(): Promise<AuditEntry[]> {
    await latency();
    this.admin();
    return copy(this.t.audit.slice(0, 200).map((row) => ({ ...row, userName: row.userId ? views.userName(row.userId) : null })));
  }
}
