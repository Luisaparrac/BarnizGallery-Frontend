import type { Id } from "../../domain/common";
import type { Cart, CheckoutRequest, Order, Payment, PaymentMethod, PaymentStatus } from "../../domain/commerce";
import { AppError } from "../../domain/errors";
import type { CommerceService } from "../contracts/CommerceService";
import { MockDatabase } from "./MockDatabase";
import { AccessPolicy } from "../../core/AccessPolicy";
import { money, rules } from "./MockRules";
import { copy, latency, MockSession } from "./MockSession";
import type { CartRow } from "./MockTables";
import { views } from "./MockViews";

export class MockCommerceService implements CommerceService {
  private get db() {
    return MockDatabase.instance;
  }

  private get t() {
    return this.db.tables;
  }

  private cartOf(userId: Id): CartRow {
    let cart = this.t.carts.find((row) => row.userId === userId);
    if (!cart) {
      cart = { userId, items: [] };
      this.t.carts.push(cart);
    }
    return cart;
  }

  private view(cart: CartRow): Cart {
    const items = cart.items
      .map((entry) => {
        const artwork = this.t.artworks.find((row) => row.id === entry.artworkId);
        if (!artwork || artwork.price === null) return null;
        return {
          artworkId: artwork.id,
          storeId: artwork.storeId,
          title: artwork.titleEs,
          titleEn: artwork.titleEn,
          coverUrl: artwork.photos.find((photo) => photo.isPrimary)?.url ?? "",
          unitPrice: artwork.price,
          currency: artwork.currency,
          quantity: entry.quantity,
          stock: artwork.status === "EXHIBITED" ? artwork.stock : 0,
        };
      })
      .filter((item) => item !== null);
    return { items, subtotal: money(items.reduce((total, item) => total + item.unitPrice * item.quantity, 0)), currency: "USD" };
  }

  async getCart(): Promise<Cart> {
    await latency();
    rules.syncOrders();
    return copy(this.view(this.cartOf(MockSession.requireUser(...AccessPolicy.rolesFor("buy")).id)));
  }

  async addToCart(artworkId: Id): Promise<Cart> {
    await latency();
    const user = MockSession.requireUser(...AccessPolicy.rolesFor("buy"));
    const artwork = this.db.require(this.t.artworks.find((row) => row.id === artworkId && !row.deletedAt), "Artwork");
    if (artwork.saleMode !== "SALE" || artwork.status !== "EXHIBITED" || artwork.price === null || artwork.stock < 1) {
      throw new AppError("notForSale", "This piece is not for sale right now", 422);
    }
    const cart = this.cartOf(user.id);
    if (!cart.items.some((item) => item.artworkId === artworkId)) cart.items.push({ artworkId, quantity: 1 });
    rules.recordInteraction(user.id, { action: "ADD_TO_CART", artworkId });
    this.db.save();
    return copy(this.view(cart));
  }

  async updateQuantity(artworkId: Id, quantity: number): Promise<Cart> {
    await latency();
    const cart = this.cartOf(MockSession.requireUser(...AccessPolicy.rolesFor("buy")).id);
    const artwork = this.db.require(this.t.artworks.find((row) => row.id === artworkId), "Artwork");
    const item = cart.items.find((entry) => entry.artworkId === artworkId);
    if (item) item.quantity = Math.max(1, Math.min(quantity, artwork.stock));
    this.db.save();
    return copy(this.view(cart));
  }

  async removeFromCart(artworkId: Id): Promise<Cart> {
    await latency();
    const cart = this.cartOf(MockSession.requireUser(...AccessPolicy.rolesFor("buy")).id);
    cart.items = cart.items.filter((entry) => entry.artworkId !== artworkId);
    this.db.save();
    return copy(this.view(cart));
  }

  async checkout(request: CheckoutRequest): Promise<Order> {
    await latency();
    const user = MockSession.requireUser(...AccessPolicy.rolesFor("buy"));
    const cart = this.view(this.cartOf(user.id));
    if (!cart.items.length) throw new AppError("emptyCart", "The cart is empty", 422);
    const unavailable = cart.items.find((item) => item.stock < item.quantity);
    if (unavailable) throw new AppError("noLongerAvailable", `“${unavailable.title}” is no longer available`, 409, { title: unavailable.title });
    const address = this.db.require(this.t.addresses.find((row) => row.id === request.addressId && row.userId === user.id), "Address");
    const { id: _id, userId: _user, isDefault: _default, ...shippingAddress } = address;
    const order = rules.createOrder(
      {
        buyerId: user.id,
        type: "PURCHASE",
        items: cart.items.map((item) => ({ storeId: item.storeId, artworkId: item.artworkId, description: item.title, unitPrice: item.unitPrice, quantity: item.quantity })),
        shippingAddress,
        shipping: true,
        notes: request.notes ?? null,
      },
      user.id,
    );
    // Unique pieces stay reserved while the customer pays.
    for (const item of cart.items) {
      const artwork = this.t.artworks.find((row) => row.id === item.artworkId)!;
      if (artwork.stock - item.quantity <= 0) artwork.status = "RESERVED";
    }
    this.db.save();
    return copy(views.order(order));
  }

  async startPayment(orderId: Id): Promise<Payment> {
    await latency();
    const user = MockSession.requireUser(...AccessPolicy.rolesFor("buy"));
    const order = this.db.require(this.t.orders.find((row) => row.id === orderId && row.buyerId === user.id), "Order");
    if (order.status !== "PENDING_PAYMENT") throw new AppError("orderNotPending", "This order is not waiting for payment", 409);
    const id = this.db.nextId("payments");
    const payment: Payment = {
      id, orderId, gateway: "SIMULATED", reference: `MUS-PAY-${id}`, method: null, status: "CREATED",
      amount: order.total, currency: order.currency, checkoutUrl: `/pay/${id}`, createdAt: this.db.now(), approvedAt: null,
    };
    this.t.payments.push(payment);
    this.db.audit("payments", id, "I", user.id, `Pago ${payment.reference} creado para ${order.code}`);
    this.db.save();
    return copy(payment);
  }

  async getPayment(paymentId: Id): Promise<Payment> {
    await latency();
    const user = MockSession.requireUser(...AccessPolicy.rolesFor("buy"));
    const payment = this.db.require(this.t.payments.find((row) => row.id === paymentId), "Payment");
    const order = this.t.orders.find((row) => row.id === payment.orderId);
    if (order?.buyerId !== user.id) throw new AppError("forbidden", "Not your payment", 403);
    return copy(payment);
  }

  /** Plays the gateway webhook: the event is stored once, then the payment and the order change. */
  async simulateGatewayResult(paymentId: Id, method: PaymentMethod, result: Extract<PaymentStatus, "APPROVED" | "REJECTED">): Promise<Payment> {
    await latency();
    await latency();
    const payment = this.db.require(this.t.payments.find((row) => row.id === paymentId), "Payment");
    if (payment.status !== "CREATED" && payment.status !== "PENDING") return copy(payment);
    const order = this.db.require(this.t.orders.find((row) => row.id === payment.orderId), "Order");
    if (order.status !== "PENDING_PAYMENT") throw new AppError("orderNotPending", "This order is no longer waiting for payment", 409);
    payment.method = method;
    this.t.paymentEvents.push({ id: this.db.nextId("paymentEvents"), paymentId, gatewayEventId: `sim-${paymentId}-${Date.now()}`, eventType: "transaction.updated", receivedAt: this.db.now() });
    if (result === "APPROVED") rules.approvePayment(payment);
    else rules.rejectPayment(payment);
    this.db.save();
    return copy(payment);
  }

  async listMyOrders(): Promise<Order[]> {
    await latency();
    rules.syncAuctions();
    const user = MockSession.requireUser(...AccessPolicy.rolesFor("buy"));
    this.db.save();
    return copy(this.t.orders.filter((row) => row.buyerId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((row) => views.order(row)));
  }

  async getOrder(orderId: Id): Promise<Order> {
    await latency();
    rules.syncAuctions();
    const user = MockSession.requireUser(...AccessPolicy.rolesFor("buy"));
    const order = this.db.require(this.t.orders.find((row) => row.id === orderId), "Order");
    if (order.buyerId !== user.id && user.role !== "ADMIN") throw new AppError("forbidden", "Not your order", 403);
    return copy(views.order(order));
  }

  async cancelOrder(orderId: Id): Promise<Order> {
    await latency();
    const user = MockSession.requireUser(...AccessPolicy.rolesFor("buy"));
    const order = this.db.require(this.t.orders.find((row) => row.id === orderId && row.buyerId === user.id), "Order");
    if (order.status !== "PENDING_PAYMENT" || order.type !== "PURCHASE") throw new AppError("onlyUnpaidCancel", "Only unpaid purchases can be cancelled", 409);
    rules.cancelOrder(order, user.id, "Cancelado por el cliente");
    this.db.save();
    return copy(views.order(order));
  }
}
