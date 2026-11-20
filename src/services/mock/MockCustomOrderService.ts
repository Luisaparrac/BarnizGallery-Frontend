import { ArtImageCodec } from "../../art/ArtImageSpec";
import type { Id } from "../../domain/common";
import type { CustomRequest, CustomRequestInput, OfferInput } from "../../domain/customOrder";
import { AppError } from "../../domain/errors";
import type { CustomOrderService } from "../contracts/CustomOrderService";
import { MockDatabase } from "./MockDatabase";
import { money, rules } from "./MockRules";
import { copy, latency, MockSession } from "./MockSession";
import type { CustomRequestRow, DeclineRow } from "./MockTables";
import { views } from "./MockViews";

const OPEN = new Set(["PUBLISHED", "WITH_OFFERS"]);

/**
 * Custom orders: the customer describes the piece, the (simulated) AI draws designs from it,
 * artisans answer with offers and the customer accepts one, which creates the deposit order.
 */
export class MockCustomOrderService implements CustomOrderService {
  private get db() {
    return MockDatabase.instance;
  }

  private get t() {
    return this.db.tables;
  }

  private mine(id: Id): CustomRequestRow {
    const user = MockSession.requireUser();
    const row = this.db.require(this.t.customRequests.find((entry) => entry.id === id), "Custom request");
    if (row.buyerId !== user.id) throw new AppError("forbidden", "Not your request", 403);
    return row;
  }

  private expire(): void {
    const now = Date.now();
    for (const row of this.t.customRequests) {
      if (OPEN.has(row.status) && row.expiresAt && Date.parse(row.expiresAt) < now) {
        row.status = "EXPIRED";
        this.t.offers.filter((offer) => offer.requestId === row.id && offer.status === "SENT").forEach((offer) => (offer.status = "EXPIRED"));
      }
    }
  }

  private validate(input: CustomRequestInput): void {
    if (input.title.trim().length < 4) throw new AppError("titleShort", "Write a title of at least 4 characters", 422);
    if (input.description.trim().length < 20) throw new AppError("descriptionShort", "Describe the piece in at least 20 characters", 422);
    if (input.offeredPrice !== null && input.offeredPrice <= 0) throw new AppError("pricesPositive", "The price must be greater than zero", 422);
  }

  async create(input: CustomRequestInput): Promise<CustomRequest> {
    await latency();
    const user = MockSession.requireUser("CUSTOMER", "ARTISAN");
    this.validate(input);
    const row: CustomRequestRow = {
      ...input, id: this.db.nextId("customRequests"), buyerId: user.id, title: input.title.trim(), description: input.description.trim(),
      currency: "USD", status: "DRAFT", acceptedOfferId: null, designs: [], expiresAt: null, createdAt: this.db.now(),
    };
    this.t.customRequests.push(row);
    if (input.targetMasterId) {
      const store = this.t.stores.find((entry) => entry.masterId === input.targetMasterId);
      if (store) rules.recordInteraction(user.id, { action: "CUSTOM_ORDER", storeId: store.id });
    }
    this.db.save();
    return copy(views.customRequest(row));
  }

  async update(id: Id, input: CustomRequestInput): Promise<CustomRequest> {
    await latency();
    const row = this.mine(id);
    if (row.status !== "DRAFT") throw new AppError("onlyDraftsEditable", "Only drafts can be edited", 409);
    this.validate(input);
    Object.assign(row, input);
    this.db.save();
    return copy(views.customRequest(row));
  }

  /** Simulated image AI: draws a design from the shape, colors and figures of the request. */
  async generateDesign(id: Id): Promise<CustomRequest> {
    const row = this.mine(id);
    if (row.status !== "DRAFT") throw new AppError("designsOnlyDraft", "Designs can only be generated while the request is a draft", 409);
    const limit = Number(this.db.setting("custom_orders.max_ai_designs", 4));
    if (row.designs.length >= limit) throw new AppError("designLimit", `Limit of ${limit} designs per request`, 422, { limit });
    const c = this.t.catalogs;
    const shape = c.shapes.find((entry) => entry.id === row.shapeId)?.code ?? "bandeja";
    const motifs = row.motifIds.map((motifId) => c.motifs.find((entry) => entry.id === motifId)?.code).filter((code): code is string => !!code);
    const colors = row.colorIds.map((colorId) => c.colors.find((entry) => entry.id === colorId)?.hex).filter((hex): hex is string => !!hex);
    const seed = row.id * 97 + row.designs.length * 13 + 7;
    const prompt = `Barniz de Pasto ${shape}, ${colors.join(" ")} ${motifs.join(", ")}: ${row.description}`.slice(0, 400);
    row.status = "GENERATING";
    this.db.save();
    await latency();
    await latency();
    await latency();
    row.designs.push({
      id: this.db.nextId("designs"), provider: "simulada", model: "demo", prompt, status: "COMPLETED",
      imageUrl: ArtImageCodec.encode({ shape, motif: motifs[row.designs.length % Math.max(1, motifs.length)] ?? "floral", colors, seed, view: "front" }),
      isSelected: row.designs.length === 0, createdAt: this.db.now(),
    });
    row.status = "DRAFT";
    this.t.aiUsage.push({ id: this.db.nextId("aiUsage"), feature: "diseno_encargo", provider: "simulada", userId: row.buyerId, referenceId: row.id, success: true, createdAt: this.db.now() });
    this.db.save();
    return copy(views.customRequest(row));
  }

  async selectDesign(id: Id, designId: Id): Promise<CustomRequest> {
    await latency();
    const row = this.mine(id);
    row.designs.forEach((design) => (design.isSelected = design.id === designId));
    this.db.save();
    return copy(views.customRequest(row));
  }

  async publish(id: Id): Promise<CustomRequest> {
    await latency();
    const row = this.mine(id);
    if (row.status !== "DRAFT") throw new AppError("requestPublished", "This request is already published", 409);
    const days = Number(this.db.setting("custom_orders.expiry_days", 15));
    row.status = "PUBLISHED";
    row.expiresAt = new Date(Date.now() + days * 86_400_000).toISOString();
    const artisans = this.t.masters.filter((master) => master.verificationStatus === "APPROVED" && (!row.targetMasterId || master.id === row.targetMasterId));
    const title = row.targetMasterId ? `Un cliente te pidió un encargo: «${row.title}»` : `Nuevo encargo abierto: «${row.title}»`;
    artisans.forEach((master) => this.db.notify(master.userId, "SYSTEM", title, null, "/artisan/custom-orders"));
    this.db.save();
    return copy(views.customRequest(row));
  }

  async cancel(id: Id): Promise<CustomRequest> {
    await latency();
    const row = this.mine(id);
    if (!["DRAFT", "PUBLISHED", "WITH_OFFERS"].includes(row.status)) throw new AppError("requestNotCancellable", "This request can no longer be cancelled", 409);
    row.status = "CANCELLED";
    this.t.offers.filter((offer) => offer.requestId === id && offer.status === "SENT").forEach((offer) => (offer.status = "REJECTED"));
    this.db.save();
    return copy(views.customRequest(row));
  }

  async listMine(): Promise<CustomRequest[]> {
    await latency();
    this.expire();
    const user = MockSession.requireUser();
    return copy(this.t.customRequests.filter((row) => row.buyerId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((row) => views.customRequest(row)));
  }

  async get(id: Id): Promise<CustomRequest> {
    await latency();
    this.expire();
    const user = MockSession.requireUser();
    const row = this.db.require(this.t.customRequests.find((entry) => entry.id === id), "Custom request");
    const master = this.t.masters.find((entry) => entry.userId === user.id);
    const isArtisanViewer = !!master && (OPEN.has(row.status) || this.t.offers.some((offer) => offer.requestId === id && offer.masterId === master.id));
    if (row.buyerId !== user.id && user.role !== "ADMIN" && !isArtisanViewer) throw new AppError("forbidden", "Not allowed", 403);
    return copy(views.customRequest(row));
  }

  async acceptOffer(id: Id, offerId: Id): Promise<{ request: CustomRequest; orderId: Id }> {
    await latency();
    const user = MockSession.requireUser();
    const row = this.mine(id);
    if (!OPEN.has(row.status)) throw new AppError("requestClosed", "This request is not open", 409);
    const offer = this.db.require(this.t.offers.find((entry) => entry.id === offerId && entry.requestId === id && entry.status === "SENT"), "Offer");
    const master = this.t.masters.find((entry) => entry.id === offer.masterId)!;
    const store = this.t.stores.find((entry) => entry.masterId === master.id)!;
    offer.status = "ACCEPTED";
    this.t.offers
      .filter((entry) => entry.requestId === id && entry.id !== offerId && entry.status === "SENT")
      .forEach((entry) => {
        entry.status = "REJECTED";
        const other = this.t.masters.find((m) => m.id === entry.masterId);
        this.db.notify(other?.userId, "OFFER_REJECTED", `Tu oferta para «${row.title}» no fue elegida`, null, "/artisan/custom-orders");
      });
    row.status = "ACCEPTED";
    row.acceptedOfferId = offerId;
    const deposit = Number(this.db.setting("custom_orders.deposit_percent", 50));
    const address = this.t.addresses.find((entry) => entry.userId === user.id && entry.isDefault);
    const order = rules.createOrder(
      {
        buyerId: user.id,
        type: "CUSTOM",
        items: [{ storeId: store.id, customOfferId: offer.id, description: `Anticipo ${deposit}% · ${row.title}`, unitPrice: money((offer.price * deposit) / 100) }],
        shippingAddress: address ? { recipientName: address.recipientName, line1: address.line1, line2: address.line2, city: address.city, region: address.region, postalCode: address.postalCode, countryCode: address.countryCode, phone: address.phone } : null,
        shipping: false,
        note: "Anticipo del encargo",
      },
      user.id,
    );
    this.db.audit("custom_offers", offer.id, "U", user.id, `Oferta de ${master.name} aceptada para «${row.title}»`);
    this.db.notify(master.userId, "OFFER_ACCEPTED", `Aceptaron tu oferta para «${row.title}»`, `Precio: ${offer.price} ${offer.currency}`, "/artisan/custom-orders");
    this.db.save();
    return copy({ request: views.customRequest(row), orderId: order.id });
  }

  async rejectOffer(id: Id, offerId: Id): Promise<CustomRequest> {
    await latency();
    const row = this.mine(id);
    const offer = this.db.require(this.t.offers.find((entry) => entry.id === offerId && entry.requestId === id && entry.status === "SENT"), "Offer");
    offer.status = "REJECTED";
    const master = this.t.masters.find((entry) => entry.id === offer.masterId);
    this.db.notify(master?.userId, "OFFER_REJECTED", `Tu oferta para «${row.title}» fue rechazada`, null, "/artisan/custom-orders");
    if (!this.t.offers.some((entry) => entry.requestId === id && entry.status === "SENT")) row.status = "PUBLISHED";
    this.db.save();
    return copy(views.customRequest(row));
  }

  async listOpen(): Promise<CustomRequest[]> {
    await latency();
    this.expire();
    const { master, store } = MockSession.requireArtisan();
    if (master.verificationStatus !== "APPROVED" || !store.acceptsCustomOrders) return [];
    return copy(
      this.t.customRequests
        .filter((row) => OPEN.has(row.status) && (!row.targetMasterId || row.targetMasterId === master.id) && row.buyerId !== master.userId)
        .filter((row) => !this.declines.some((entry) => entry.requestId === row.id && entry.masterId === master.id))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((row) => views.customRequest(row)),
    );
  }

  async sendOffer(id: Id, input: OfferInput): Promise<CustomRequest> {
    await latency();
    const { user, master } = MockSession.requireArtisan();
    if (master.verificationStatus !== "APPROVED") throw new AppError("notApproved", "Your account must be approved first", 403);
    const row = this.db.require(this.t.customRequests.find((entry) => entry.id === id), "Custom request");
    if (!OPEN.has(row.status)) throw new AppError("requestClosed", "This request is no longer open", 409);
    if (this.t.offers.some((offer) => offer.requestId === id && offer.masterId === master.id && (offer.status === "SENT" || offer.status === "ACCEPTED"))) {
      throw new AppError("offerExists", "You already have an offer for this request", 409);
    }
    if (input.price <= 0 || input.estimatedDays <= 0) throw new AppError("offerNumbers", "Price and days must be greater than zero", 422);
    const price = input.type === "ACCEPT_PRICE" && row.offeredPrice ? row.offeredPrice : input.price;
    const offerId = this.db.nextId("offers");
    this.t.offers.push({
      id: offerId, requestId: id, masterId: master.id, type: input.type, price, currency: row.currency, estimatedDays: input.estimatedDays,
      message: input.message.trim() || null, designId: input.designId, status: "SENT", createdAt: this.db.now(),
    });
    row.status = "WITH_OFFERS";
    this.db.audit("custom_offers", offerId, "I", user.id, `Oferta de ${master.name} para «${row.title}»`);
    this.db.notify(row.buyerId, "NEW_CUSTOM_OFFER", `Nueva oferta para «${row.title}»`, `${master.name}: ${price} ${row.currency}, ${input.estimatedDays} días`, `/account/custom/${row.id}`);
    this.db.save();
    return copy(views.customRequest(row));
  }

  async withdrawOffer(id: Id, offerId: Id): Promise<CustomRequest> {
    await latency();
    const { master } = MockSession.requireArtisan();
    const row = this.db.require(this.t.customRequests.find((entry) => entry.id === id), "Custom request");
    const offer = this.db.require(this.t.offers.find((entry) => entry.id === offerId && entry.masterId === master.id && entry.status === "SENT"), "Offer");
    offer.status = "WITHDRAWN";
    if (!this.t.offers.some((entry) => entry.requestId === id && entry.status === "SENT") && row.status === "WITH_OFFERS") row.status = "PUBLISHED";
    this.db.save();
    return copy(views.customRequest(row));
  }

  /** Declines kept in the database (older saved databases may not have the table yet). */
  private get declines(): DeclineRow[] {
    return (this.t.declines ??= []);
  }

  async decline(id: Id, reason: string | null): Promise<void> {
    await latency();
    const { user, master } = MockSession.requireArtisan();
    if (master.verificationStatus !== "APPROVED") throw new AppError("notApproved", "Your account must be approved first", 403);
    const row = this.db.require(this.t.customRequests.find((entry) => entry.id === id), "Custom request");
    if (!OPEN.has(row.status) || (row.targetMasterId && row.targetMasterId !== master.id)) throw new AppError("requestClosed", "This request is no longer open", 409);
    if (!this.declines.some((entry) => entry.requestId === id && entry.masterId === master.id)) {
      this.declines.push({ requestId: id, masterId: master.id, reason: reason?.trim() || null, createdAt: this.db.now() });
    }
    this.db.audit("custom_request_declines", id, "I", user.id, `${master.name} rechazó «${row.title}»`);
    // The customer hears about it when the request was addressed to this master.
    if (row.targetMasterId === master.id) {
      this.db.notify(row.buyerId, "SYSTEM", `${master.name} no puede hacer tu encargo «${row.title}»`, reason?.trim() || null, `/account/custom/${row.id}`);
    }
    this.db.save();
  }

  async listDeclined(): Promise<CustomRequest[]> {
    await latency();
    const { master } = MockSession.requireArtisan();
    return copy(
      this.declines
        .filter((entry) => entry.masterId === master.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .flatMap((entry) => {
          const row = this.t.customRequests.find((request) => request.id === entry.requestId);
          return row ? [{ ...views.customRequest(row), declineReason: entry.reason }] : [];
        }),
    );
  }

  async listAccepted(): Promise<CustomRequest[]> {
    await latency();
    const { master } = MockSession.requireArtisan();
    const offerIds = new Set(this.t.offers.filter((offer) => offer.masterId === master.id).map((offer) => offer.requestId));
    return copy(this.t.customRequests.filter((row) => offerIds.has(row.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((row) => views.customRequest(row)));
  }
}
