import type { Id } from "../../domain/common";
import type { Cart, CheckoutRequest, Order, Payment, PaymentMethod, PaymentStatus } from "../../domain/commerce";

export interface CommerceService {
  getCart(): Promise<Cart>;
  addToCart(artworkId: Id): Promise<Cart>;
  updateQuantity(artworkId: Id, quantity: number): Promise<Cart>;
  removeFromCart(artworkId: Id): Promise<Cart>;
  checkout(request: CheckoutRequest): Promise<Order>;
  /** Creates the payment at the gateway and returns where the customer pays. */
  startPayment(orderId: Id): Promise<Payment>;
  getPayment(paymentId: Id): Promise<Payment>;
  /** Only for the simulated gateway: plays the gateway's webhook. */
  simulateGatewayResult(paymentId: Id, method: PaymentMethod, result: Extract<PaymentStatus, "APPROVED" | "REJECTED">): Promise<Payment>;
  listMyOrders(): Promise<Order[]>;
  getOrder(orderId: Id): Promise<Order>;
  cancelOrder(orderId: Id): Promise<Order>;
}
