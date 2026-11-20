import type { Id } from "../../domain/common";
import type { ArtisanOrderItem, Payout, ShipmentInput, StoreSales } from "../../domain/commerce";
import { AppError } from "../../domain/errors";
import type { Artwork, ArtworkInput, Master, Store, VerificationStep, VerificationStepType } from "../../domain/gallery";
import { ImageResizer } from "../../utils/ImageResizer";
import type { ArtisanService } from "../contracts/ArtisanService";
import { MockDatabase } from "./MockDatabase";
import { money, rules } from "./MockRules";
import { SeedData } from "./SeedData";
import { copy, latency, MockSession } from "./MockSession";
import type { ArtworkRow, OrderRow } from "./MockTables";
import { views } from "./MockViews";

export class MockArtisanService implements ArtisanService {
  private get db() {
    return MockDatabase.instance;
  }

  private get t() {
    return this.db.tables;
  }

  async getMyMaster(): Promise<Master> {
    await latency();
    return copy(MockSession.requireArtisan().master);
  }

  async updateMyMaster(update: Partial<Master>): Promise<Master> {
    await latency();
    const { user, master } = MockSession.requireArtisan();
    const allowed: (keyof Master)[] = ["name", "city", "workshop", "biographyEs", "biographyEn", "profilePhotoUrl"];
    allowed.forEach((key) => {
      if (update[key] !== undefined) (master as unknown as Record<string, unknown>)[key] = update[key];
    });
    this.db.audit("masters", master.id, "U", user.id, "Datos del maestro actualizados");
    this.db.save();
    return copy(master);
  }

  async getVerification(): Promise<VerificationStep[]> {
    await latency();
    const { master } = MockSession.requireArtisan();
    return copy(this.t.verifications.filter((step) => step.masterId === master.id));
  }

  async submitStep(step: VerificationStepType, evidenceUrl: string): Promise<VerificationStep[]> {
    await latency();
    const { user, master } = MockSession.requireArtisan();
    if (step === "EMAIL" || step === "ADMIN_APPROVAL") throw new AppError("stepNoFile", "This step is not completed with a file", 422);
    const row = this.db.require(this.t.verifications.find((entry) => entry.masterId === master.id && entry.step === step), "Step");
    if (row.status === "APPROVED") throw new AppError("stepApproved", "This step is already approved", 409);
    row.status = "SUBMITTED";
    row.evidenceUrl = evidenceUrl;
    row.notes = null;
    if (master.verificationStatus !== "APPROVED") master.verificationStatus = "IN_REVIEW";
    this.db.audit("master_verifications", row.id, "U", user.id, `${master.name} envió el paso ${step}`);
    this.db.notifyAdmins("SYSTEM", `${master.name} envió documentos para verificación`, null, "/admin/verifications");
    this.db.save();
    return copy(this.t.verifications.filter((entry) => entry.masterId === master.id));
  }

  async getMyStore(): Promise<Store> {
    await latency();
    return copy(MockSession.requireApprovedArtisan().store);
  }

  async saveMyStore(update: Store): Promise<Store> {
    await latency();
    const { user, store } = MockSession.requireApprovedArtisan();
    if (!update.nameEs.trim()) throw new AppError("storeName", "The store needs a name", 422);
    const slug = SeedData.slug(update.slug || update.nameEs);
    if (this.t.stores.some((row) => row.slug === slug && row.id !== store.id)) throw new AppError("slugTaken", "That address is already used by another store", 409);
    const { id: _id, masterId: _master, status: _status, publishedAt: _published, ...editable } = update;
    Object.assign(store, editable, {
      slug,
      sections: update.sections.map((section, index) => ({ ...section, id: section.id || this.db.nextId("sections") * 1000, sortOrder: index })),
    });
    this.db.audit("stores", store.id, "U", user.id, "Tienda editada");
    this.db.save();
    return copy(store);
  }

  async applyTemplate(templateId: Id): Promise<Store> {
    await latency();
    const { user, store } = MockSession.requireApprovedArtisan();
    const template = this.db.require(this.t.catalogs.templates.find((entry) => entry.id === templateId && entry.isActive), "Template");
    const kept = new Map(store.sections.map((section) => [section.type, section]));
    store.templateId = template.id;
    store.theme = {};
    store.sections = template.defaultLayout.map((type, index) => {
      const existing = kept.get(type);
      return existing ? { ...existing, sortOrder: index, isVisible: true } : { ...SeedData.sections([type], this.db.nextId("sections") * 1000)[0], sortOrder: index };
    });
    this.db.audit("stores", store.id, "U", user.id, `Plantilla ${template.code} aplicada`);
    this.db.save();
    return copy(store);
  }

  /** Same rule as the trigger tg_stores_publication: only approved artisans publish. */
  async publishStore(): Promise<Store> {
    await latency();
    const { user, master, store } = MockSession.requireApprovedArtisan();
    if (master.verificationStatus !== "APPROVED") throw new AppError("storeNeedsApproval", "The store can be published once your account is approved", 409);
    if (store.status === "SUSPENDED") throw new AppError("storeSuspended", "The store was suspended by the administrator", 409);
    store.status = "PUBLISHED";
    store.publishedAt = store.publishedAt ?? this.db.now();
    this.db.audit("stores", store.id, "U", user.id, "Tienda publicada");
    this.db.save();
    return copy(store);
  }

  async unpublishStore(): Promise<Store> {
    await latency();
    const { user, store } = MockSession.requireApprovedArtisan();
    if (store.status === "SUSPENDED") throw new AppError("storeSuspended", "The store was suspended by the administrator", 409);
    store.status = "DRAFT";
    this.db.audit("stores", store.id, "U", user.id, "Tienda pasada a borrador");
    this.db.save();
    return copy(store);
  }

  async listMyArtworks(): Promise<Artwork[]> {
    await latency();
    rules.syncAuctions();
    const { store } = MockSession.requireApprovedArtisan();
    return copy(this.t.artworks.filter((row) => row.storeId === store.id && !row.deletedAt).map(({ deletedAt: _deleted, ...artwork }) => artwork));
  }

  private ownArtwork(id: Id): ArtworkRow {
    const { store } = MockSession.requireApprovedArtisan();
    return this.db.require(this.t.artworks.find((row) => row.id === id && row.storeId === store.id && !row.deletedAt), "Artwork");
  }

  async getMyArtwork(id: Id): Promise<Artwork> {
    await latency();
    const { deletedAt: _deleted, ...artwork } = this.ownArtwork(id);
    return copy(artwork);
  }

  async saveArtwork(input: ArtworkInput, id?: Id): Promise<Artwork> {
    await latency();
    const { user, store } = MockSession.requireApprovedArtisan();
    if (!input.titleEs.trim() || !input.titleEn.trim()) throw new AppError("titlesBoth", "Write the title in both languages", 422);
    if (input.saleMode === "SALE" && input.status !== "DRAFT" && (input.price === null || input.price <= 0)) {
      throw new AppError("priceRequired", "A piece for sale needs a price before leaving draft", 422);
    }
    if (input.status !== "DRAFT" && input.photos.length === 0) throw new AppError("photoRequired", "Add at least one photo before publishing", 422);
    const photos = input.photos.map((photo, index) => ({ ...photo, id: photo.id || this.db.nextId("photos"), sortOrder: index }));
    if (photos.length && !photos.some((photo) => photo.isPrimary)) photos[0].isPrimary = true;
    let row: ArtworkRow;
    if (id) {
      row = this.ownArtwork(id);
      const locked = ["IN_AUCTION", "RESERVED", "SOLD"].includes(row.status);
      Object.assign(row, input, { photos, status: locked ? row.status : input.status, saleMode: locked ? row.saleMode : input.saleMode });
      if (row.status !== "DRAFT" && !row.publishedAt) row.publishedAt = this.db.now();
      this.db.audit("artworks", row.id, "U", user.id, `Obra «${row.titleEs}» editada`);
    } else {
      const newId = this.db.nextId("artworks");
      row = {
        ...input, photos, id: newId, storeId: store.id, slug: `${SeedData.slug(input.titleEs)}-${newId}`,
        publishedAt: input.status === "DRAFT" ? null : this.db.now(), createdAt: this.db.now(), deletedAt: null,
      };
      this.t.artworks.push(row);
      this.db.audit("artworks", newId, "I", user.id, `Obra «${row.titleEs}» creada`);
    }
    this.db.save();
    const { deletedAt: _deleted, ...artwork } = row;
    return copy(artwork);
  }

  async deleteArtwork(id: Id): Promise<void> {
    await latency();
    const { user } = MockSession.requireApprovedArtisan();
    const row = this.ownArtwork(id);
    if (["IN_AUCTION", "RESERVED"].includes(row.status)) throw new AppError("pieceBusy", "This piece has an open auction or order", 409);
    row.deletedAt = this.db.now();
    this.db.audit("artworks", id, "D", user.id, `Obra «${row.titleEs}» eliminada`);
    this.db.save();
  }

  async uploadImage(file: File): Promise<string> {
    MockSession.requireUser();
    if (file.size > 12 * 1024 * 1024) throw new AppError("tooLarge", "The image is larger than 12 MB", 422);
    try {
      return await ImageResizer.toDataUrl(file);
    } catch (error) {
      throw new AppError("invalidImage", (error as Error).message, 422);
    }
  }

  async getSales(): Promise<StoreSales> {
    await latency();
    return copy(views.storeSales(MockSession.requireApprovedArtisan().store));
  }

  async listOrderItems(): Promise<ArtisanOrderItem[]> {
    await latency();
    rules.syncAuctions();
    const { store } = MockSession.requireApprovedArtisan();
    return copy(
      this.t.orders
        .filter((order) => order.status !== "PENDING_PAYMENT" && order.status !== "CANCELLED")
        .flatMap((order) =>
          order.items
            .filter((item) => item.storeId === store.id)
            .map((item) => ({ item: { ...item, storeName: store.nameEs }, orderCode: order.code, orderType: order.type, orderStatus: order.status, buyerName: views.userName(order.buyerId), shippingAddress: order.shippingAddress, isDeposit: order.type === "CUSTOM" && order.balanceOfOrderId === null, createdAt: order.createdAt })),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  }

  private ownItem(itemId: Id): { order: OrderRow; item: OrderRow["items"][number] } {
    const { store } = MockSession.requireApprovedArtisan();
    for (const order of this.t.orders) {
      const item = order.items.find((entry) => entry.id === itemId && entry.storeId === store.id);
      if (item) return { order, item };
    }
    throw new AppError("notFound", "Order item not found", 404);
  }

  /** Order status follows its items: preparing, shipped when all shipped, delivered when all delivered. */
  private refreshOrder(order: OrderRow, actorId: Id): void {
    const active = order.items.filter((item) => item.fulfillmentStatus !== "CANCELLED");
    if (active.every((item) => item.fulfillmentStatus === "DELIVERED")) rules.setOrderStatus(order, "DELIVERED", actorId);
    else if (active.every((item) => item.fulfillmentStatus === "SHIPPED" || item.fulfillmentStatus === "DELIVERED")) rules.setOrderStatus(order, "SHIPPED", actorId);
    else if (order.status === "PAID") rules.setOrderStatus(order, "PREPARING", actorId);
  }

  async markPreparing(itemId: Id): Promise<void> {
    await latency();
    const { user } = MockSession.requireApprovedArtisan();
    const { order, item } = this.ownItem(itemId);
    if (item.fulfillmentStatus !== "PENDING") throw new AppError("itemNotPending", "This item is not pending", 409);
    item.fulfillmentStatus = "PREPARING";
    this.refreshOrder(order, user.id);
    this.db.save();
  }

  async markShipped(itemId: Id, shipment: ShipmentInput): Promise<void> {
    await latency();
    const { user } = MockSession.requireApprovedArtisan();
    const { order, item } = this.ownItem(itemId);
    if (!["PENDING", "PREPARING"].includes(item.fulfillmentStatus)) throw new AppError("itemShipped", "This item was already shipped", 409);
    if (!shipment.carrier.trim() || !shipment.trackingNumber.trim()) throw new AppError("shipmentData", "Write the carrier and the tracking number", 422);
    item.fulfillmentStatus = "SHIPPED";
    item.carrier = shipment.carrier.trim();
    item.trackingNumber = shipment.trackingNumber.trim();
    item.shippedAt = this.db.now();
    this.refreshOrder(order, user.id);
    this.db.notify(order.buyerId, "ORDER_SHIPPED", `Tu pedido ${order.code} va en camino`, `${item.description}: ${item.carrier} ${item.trackingNumber}`, `/account/orders/${order.id}`);
    this.db.save();
  }

  async markDelivered(itemId: Id): Promise<void> {
    await latency();
    const { user } = MockSession.requireApprovedArtisan();
    const { order, item } = this.ownItem(itemId);
    if (item.fulfillmentStatus !== "SHIPPED") throw new AppError("onlyShippedDelivered", "Only shipped items can be delivered", 409);
    item.fulfillmentStatus = "DELIVERED";
    item.deliveredAt = this.db.now();
    this.refreshOrder(order, user.id);
    if (order.balanceOfOrderId && item.customOfferId) {
      const offer = this.t.offers.find((entry) => entry.id === item.customOfferId);
      const request = this.t.customRequests.find((entry) => entry.id === offer?.requestId);
      if (request) request.status = "DELIVERED";
    }
    this.db.save();
  }

  /** The custom piece is finished: the customer gets the order for the rest of the price. */
  async requestBalance(itemId: Id): Promise<void> {
    await latency();
    const { user, store } = MockSession.requireApprovedArtisan();
    const { order, item } = this.ownItem(itemId);
    if (order.type !== "CUSTOM" || order.balanceOfOrderId || !item.customOfferId || order.status === "PENDING_PAYMENT") {
      throw new AppError("balanceOnlyDeposit", "Only paid custom-order deposits can ask for the balance", 409);
    }
    if (this.t.orders.some((row) => row.balanceOfOrderId === order.id && row.status !== "CANCELLED")) throw new AppError("balanceRequested", "The balance was already requested", 409);
    const offer = this.db.require(this.t.offers.find((entry) => entry.id === item.customOfferId), "Offer");
    const request = this.t.customRequests.find((entry) => entry.id === offer.requestId);
    const balance = money(offer.price - item.lineTotal);
    const balanceOrder = rules.createOrder(
      {
        buyerId: order.buyerId,
        type: "CUSTOM",
        items: [{ storeId: store.id, customOfferId: offer.id, description: `Saldo · ${request?.title ?? item.description}`, unitPrice: balance }],
        shippingAddress: order.shippingAddress,
        shipping: true,
        balanceOfOrderId: order.id,
        note: "Saldo del encargo",
      },
      user.id,
    );
    item.fulfillmentStatus = "DELIVERED";
    item.deliveredAt = this.db.now();
    this.refreshOrder(order, user.id);
    this.db.notify(order.buyerId, "SYSTEM", `Tu encargo «${request?.title ?? ""}» está listo`, `Paga el saldo de ${balance} ${offer.currency} para que lo envíen.`, `/account/orders/${balanceOrder.id}`);
    this.db.save();
  }

  async listPayouts(): Promise<Payout[]> {
    await latency();
    const { master } = MockSession.requireApprovedArtisan();
    return copy(this.t.payouts.filter((row) => row.masterId === master.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((row) => views.payout(row)));
  }
}
