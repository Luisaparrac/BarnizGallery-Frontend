import type { Id } from "../../domain/common";
import type { Cart, CheckoutRequest, Order, Payment, PaymentMethod, PaymentStatus } from "../../domain/commerce";
import { AppError } from "../../domain/errors";
import type { CommerceService } from "../contracts/CommerceService";
import { HttpClient } from "./HttpClient";

export class ApiCommerceService implements CommerceService {
  private readonly http = HttpClient.shared;

  getCart(): Promise<Cart> {
    return this.http.get<Cart>("/api/cart");
  }

  addToCart(artworkId: Id): Promise<Cart> {
    return this.http.post<Cart>("/api/cart/items", { artworkId, quantity: 1 });
  }

  updateQuantity(artworkId: Id, quantity: number): Promise<Cart> {
    return this.http.put<Cart>(`/api/cart/items/${artworkId}`, { quantity });
  }

  removeFromCart(artworkId: Id): Promise<Cart> {
    return this.http.delete<Cart>(`/api/cart/items/${artworkId}`);
  }

  checkout(request: CheckoutRequest): Promise<Order> {
    return this.http.post<Order>("/api/orders/checkout", request);
  }

  startPayment(orderId: Id): Promise<Payment> {
    return this.http.post<Payment>(`/api/orders/${orderId}/payments`);
  }

  getPayment(paymentId: Id): Promise<Payment> {
    return this.http.get<Payment>(`/api/payments/${paymentId}`);
  }

  simulateGatewayResult(_paymentId: Id, _method: PaymentMethod, _result: Extract<PaymentStatus, "APPROVED" | "REJECTED">): Promise<Payment> {
    // With a real gateway the result arrives through the webhook, never from the browser.
    return Promise.reject(new AppError("disabled", "Only available with the simulated gateway"));
  }

  listMyOrders(): Promise<Order[]> {
    return this.http.get<Order[]>("/api/orders");
  }

  getOrder(orderId: Id): Promise<Order> {
    return this.http.get<Order>(`/api/orders/${orderId}`);
  }

  cancelOrder(orderId: Id): Promise<Order> {
    return this.http.post<Order>(`/api/orders/${orderId}/cancel`);
  }
}
