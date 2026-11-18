import type { Id } from "../../domain/common";
import type { Order, OrderItem, OrderStatus, OrderType, Payment } from "../../domain/commerce";
import type { InteractionInput } from "../../domain/taste";
import { MockDatabase } from "./MockDatabase";
import type { AuctionRow, OrderRow } from "./MockTables";

export interface NewOrderItem {
  storeId: Id;
  artworkId?: Id | null;
  auctionId?: Id | null;
  customOfferId?: Id | null;
  description: string;
  unitPrice: number;
  quantity?: number;
}

export interface NewOrder {
  buyerId: Id;
  type: OrderType;
  items: NewOrderItem[];
  shippingAddress: Order["shippingAddress"];
  shipping: boolean;
  notes?: string | null;
  paymentDueAt?: string | null;
  balanceOfOrderId?: Id | null;
  note?: string;
}

export const money = (value: number): number => Math.round(value * 100) / 100;

/**
 * Business rules shared by several simulated services: orders, payments, reservations and the
 * time-based changes the backend scheduler makes (auctions opening and closing, unpaid orders).
 */
export class MockRules {
  private get db() {
    return MockDatabase.instance;
  }

  private get t() {
    return this.db.tables;
  }

  get feePercent(): number {
    return Number(this.db.setting("commerce.platform_fee_percent", 10));
  }

  createOrder(input: NewOrder, actorId: Id | null): OrderRow {
    const db = this.db;
    const orderId = db.nextId("orders");
    const fee = this.feePercent / 100;
    const items: OrderItem[] = input.items.map((entry) => {
      const quantity = entry.quantity ?? 1;
      const lineTotal = money(entry.unitPrice * quantity);
      return {
        id: db.nextId("orderItems"),
        orderId,
        storeId: entry.storeId,
        storeName: "",
        artworkId: entry.artworkId ?? null,
        auctionId: entry.auctionId ?? null,
        customOfferId: entry.customOfferId ?? null,
        description: entry.description,
        quantity,
        unitPrice: entry.unitPrice,
        lineTotal,
        artisanAmount: money(lineTotal * (1 - fee)),
        fulfillmentStatus: "PENDING",
        carrier: null,
        trackingNumber: null,
        shippedAt: null,
        deliveredAt: null,
        payoutId: null,
      };
    });
    const subtotal = money(items.reduce((total, item) => total + item.lineTotal, 0));
    const shippingCost = input.shipping ? Number(db.setting("commerce.shipping_flat_cost", 25)) : 0;
    const now = db.now();
    const order: OrderRow = {
      id: orderId,
      code: `MUS-${new Date().getFullYear()}-${String(orderId).padStart(6, "0")}`,
      buyerId: input.buyerId,
      type: input.type,
      status: "PENDING_PAYMENT",
      currency: String(db.setting("currency.default", "USD")),
      subtotal,
      shippingCost,
      platformFee: money(subtotal * fee),
      total: money(subtotal + shippingCost),
      shippingAddress: input.shippingAddress,
      notes: input.notes ?? null,
      items,
      history: [{ fromStatus: null, toStatus: "PENDING_PAYMENT", changedAt: now, note: input.note ?? null }],
      paymentDueAt: input.paymentDueAt ?? null,
      paidAt: null,
      createdAt: now,
      balanceOfOrderId: input.balanceOfOrderId ?? null,
    };
    this.t.orders.push(order);
    db.audit("orders", order.id, "I", actorId, `Pedido ${order.code} creado (${order.type})`);
    return order;
  }

  setOrderStatus(order: OrderRow, status: OrderStatus, actorId: Id | null, note: string | null = null): void {
    if (order.status === status) return;
    order.history.push({ fromStatus: order.status, toStatus: status, changedAt: this.db.now(), note });
    order.status = status;
    this.db.audit("orders", order.id, "U", actorId, `Pedido ${order.code}: ${status}`);
  }

  /** What the payment webhook does when the gateway approves. */
  approvePayment(payment: Payment): void {
    const db = this.db;
    const order = db.require(this.t.orders.find((row) => row.id === payment.orderId), "Order");
    payment.status = "APPROVED";
    payment.approvedAt = db.now();
    order.paidAt = payment.approvedAt;
    this.setOrderStatus(order, "PAID", null, "Pago aprobado");
    db.audit("payments", payment.id, "U", null, `Pago ${payment.reference} aprobado`);

    for (const item of order.items) {
      if (item.artworkId) {
        const artwork = this.t.artworks.find((row) => row.id === item.artworkId);
        if (artwork && !order.balanceOfOrderId) {
          artwork.stock = Math.max(0, artwork.stock - item.quantity);
          artwork.status = artwork.stock === 0 ? "SOLD" : "EXHIBITED";
        }
        this.recordInteraction(order.buyerId, { action: "BUY", artworkId: item.artworkId });
      }
      if (item.customOfferId && !order.balanceOfOrderId) {
        const offer = this.t.offers.find((row) => row.id === item.customOfferId);
        const request = this.t.customRequests.find((row) => row.id === offer?.requestId);
        if (request) request.status = "IN_PRODUCTION";
      }
      const store = this.t.stores.find((row) => row.id === item.storeId);
      const master = this.t.masters.find((row) => row.id === store?.masterId);
      db.notify(master?.userId, "NEW_ORDER", `Nuevo pedido ${order.code}`, item.description, "/artisan/orders");
    }
    const cart = this.t.carts.find((row) => row.userId === order.buyerId);
    if (cart) cart.items = cart.items.filter((entry) => !order.items.some((item) => item.artworkId === entry.artworkId));
    db.notify(order.buyerId, "PAYMENT_APPROVED", `Pago aprobado: ${order.code}`, null, `/account/orders/${order.id}`);
  }

  /** What the webhook does when the gateway rejects: purchases are cancelled and pieces released. */
  rejectPayment(payment: Payment): void {
    const order = this.db.require(this.t.orders.find((row) => row.id === payment.orderId), "Order");
    payment.status = "REJECTED";
    this.db.audit("payments", payment.id, "U", null, `Pago ${payment.reference} rechazado`);
    this.db.notify(order.buyerId, "PAYMENT_REJECTED", `Pago rechazado: ${order.code}`, null, `/account/orders/${order.id}`);
    if (order.type === "PURCHASE") this.cancelOrder(order, null, "Pago rechazado");
  }

  cancelOrder(order: OrderRow, actorId: Id | null, note: string): void {
    for (const item of order.items) {
      const artwork = this.t.artworks.find((row) => row.id === item.artworkId);
      if (artwork && artwork.status === "RESERVED" && order.type === "PURCHASE") artwork.status = "EXHIBITED";
      item.fulfillmentStatus = "CANCELLED";
    }
    this.setOrderStatus(order, "CANCELLED", actorId, note);
  }

  /** Scheduler work: unpaid purchases past the reservation time and unpaid auction orders past the deadline. */
  syncOrders(): void {
    const now = Date.now();
    const minutes = Number(this.db.setting("commerce.cart_reservation_minutes", 30));
    for (const order of this.t.orders.filter((row) => row.status === "PENDING_PAYMENT")) {
      if (order.type === "PURCHASE" && now - Date.parse(order.createdAt) > minutes * 60_000) {
        this.cancelOrder(order, null, "Reserva vencida");
      } else if (order.type === "AUCTION" && order.paymentDueAt && now > Date.parse(order.paymentDueAt)) {
        this.cancelOrder(order, null, "El ganador no pagó a tiempo");
        const auction = this.t.auctions.find((row) => row.orderId === order.id);
        if (auction) this.offerToNextBidder(auction, order.buyerId);
      }
    }
  }

  /** Scheduler work: scheduled auctions open and finished auctions close. */
  syncAuctions(): void {
    const now = Date.now();
    for (const auction of this.t.auctions) {
      if (auction.status === "SCHEDULED" && Date.parse(auction.startDate) <= now) this.startAuction(auction);
      if (auction.status === "ACTIVE" && Date.parse(auction.endDate) <= now) this.finishAuction(auction);
    }
    this.syncOrders();
  }

  startAuction(auction: AuctionRow): void {
    const db = this.db;
    auction.status = "ACTIVE";
    const artwork = this.t.artworks.find((row) => row.id === auction.artworkId)!;
    artwork.status = "IN_AUCTION";
    db.audit("auctions", auction.id, "U", null, `Subasta ${auction.id} iniciada`);
    // Visitors whose taste matches the piece are invited (MatchingAuctionNotifier).
    for (const taste of this.t.tastes) {
      const p = taste.profile;
      const matches = p.colorIds.some((id) => artwork.colorIds.includes(id)) || (artwork.shapeId !== null && p.shapeIds.includes(artwork.shapeId));
      if (matches) db.notify(taste.userId, "MATCHING_AUCTION", `Abrió una subasta afín a tus gustos: «${artwork.titleEs}»`, null, `/auctions/${auction.id}`);
    }
  }

  finishAuction(auction: AuctionRow): void {
    const db = this.db;
    auction.status = "FINISHED";
    db.audit("auctions", auction.id, "U", null, `Subasta ${auction.id} finalizada`);
    if (!this.offerToNextBidder(auction, null)) {
      const artwork = this.t.artworks.find((row) => row.id === auction.artworkId)!;
      artwork.status = "EXHIBITED";
    }
  }

  /** Gives the piece to the highest valid bid above the reserve, skipping an excluded bidder. */
  private offerToNextBidder(auction: AuctionRow, excludedUserId: Id | null): boolean {
    const db = this.db;
    const excluded = new Set<Id>();
    if (excludedUserId) excluded.add(excludedUserId);
    const previousOrders = this.t.orders.filter((order) => order.type === "AUCTION" && order.items.some((item) => item.auctionId === auction.id));
    previousOrders.forEach((order) => excluded.add(order.buyerId));
    const bid = this.t.bids
      .filter((row) => row.auctionId === auction.id && !excluded.has(row.userId))
      .filter((row) => auction.reservePrice === null || row.amount >= auction.reservePrice)
      .sort((a, b) => b.amount - a.amount)[0];
    const artwork = this.t.artworks.find((row) => row.id === auction.artworkId)!;
    if (!bid) {
      auction.winningBidId = null;
      auction.orderId = null;
      return false;
    }
    const hours = Number(db.setting("auction.winner_payment_hours", 48));
    const address = this.t.addresses.find((row) => row.userId === bid.userId && row.isDefault);
    const order = this.createOrder(
      {
        buyerId: bid.userId,
        type: "AUCTION",
        items: [{ storeId: artwork.storeId, artworkId: artwork.id, auctionId: auction.id, description: `${artwork.titleEs} (subasta)`, unitPrice: bid.amount }],
        shippingAddress: address ? { recipientName: address.recipientName, line1: address.line1, line2: address.line2, city: address.city, region: address.region, postalCode: address.postalCode, countryCode: address.countryCode, phone: address.phone } : null,
        shipping: true,
        paymentDueAt: new Date(Date.now() + hours * 3_600_000).toISOString(),
        note: "Subasta ganada",
      },
      null,
    );
    auction.winningBidId = bid.id;
    auction.orderId = order.id;
    artwork.status = "RESERVED";
    db.notify(bid.userId, "AUCTION_WON", `Ganaste la subasta de «${artwork.titleEs}»`, `Tienes ${hours} horas para pagar.`, `/account/orders/${order.id}`);
    return true;
  }

  recordInteraction(userId: Id, input: InteractionInput): void {
    this.t.interactions.push({
      id: this.db.nextId("interactions"),
      userId,
      artworkId: input.artworkId ?? null,
      storeId: input.storeId ?? null,
      action: input.action,
      durationSeconds: input.durationSeconds ?? null,
      date: this.db.now(),
    });
    if (this.t.interactions.length > 2000) this.t.interactions.splice(0, this.t.interactions.length - 2000);
  }
}

export const rules = new MockRules();
