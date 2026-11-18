import type { Address } from "./user";
import type { Id, IsoDate } from "./common";

export interface CartItem {
  artworkId: Id;
  storeId: Id;
  title: string;
  titleEn: string;
  coverUrl: string;
  unitPrice: number;
  currency: string;
  quantity: number;
  stock: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  currency: string;
}

export type OrderType = "PURCHASE" | "AUCTION" | "CUSTOM";
export type OrderStatus = "PENDING_PAYMENT" | "PAID" | "PREPARING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";
export type FulfillmentStatus = "PENDING" | "PREPARING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

export interface OrderItem {
  id: Id;
  orderId: Id;
  storeId: Id;
  storeName: string;
  artworkId: Id | null;
  auctionId: Id | null;
  customOfferId: Id | null;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  artisanAmount: number;
  fulfillmentStatus: FulfillmentStatus;
  carrier: string | null;
  trackingNumber: string | null;
  shippedAt: IsoDate | null;
  deliveredAt: IsoDate | null;
  payoutId: Id | null;
}

export interface OrderStatusChange {
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedAt: IsoDate;
  note: string | null;
}

export interface Order {
  id: Id;
  code: string;
  buyerId: Id;
  buyerName: string;
  type: OrderType;
  status: OrderStatus;
  currency: string;
  subtotal: number;
  shippingCost: number;
  platformFee: number;
  total: number;
  shippingAddress: Omit<Address, "id" | "isDefault"> | null;
  notes: string | null;
  items: OrderItem[];
  history: OrderStatusChange[];
  paymentDueAt: IsoDate | null;
  paidAt: IsoDate | null;
  createdAt: IsoDate;
}

export type PaymentGateway = "WOMPI" | "PAYPAL" | "MERCADOPAGO" | "SIMULATED";
export type PaymentStatus = "CREATED" | "PENDING" | "APPROVED" | "REJECTED" | "VOIDED" | "ERROR" | "REFUNDED";
export type PaymentMethod = "CARD" | "PSE" | "NEQUI" | "PAYPAL";

export interface Payment {
  id: Id;
  orderId: Id;
  gateway: PaymentGateway;
  reference: string;
  method: PaymentMethod | null;
  status: PaymentStatus;
  amount: number;
  currency: string;
  /** Page of the gateway where the customer pays. */
  checkoutUrl: string;
  createdAt: IsoDate;
  approvedAt: IsoDate | null;
}

export interface CheckoutRequest {
  addressId: Id;
  notes?: string;
}

/** Item that an artisan has to prepare and ship. */
export interface ArtisanOrderItem {
  item: OrderItem;
  orderCode: string;
  orderType: OrderType;
  orderStatus: OrderStatus;
  buyerName: string;
  shippingAddress: Order["shippingAddress"];
  /** Deposit of a custom order: when the piece is finished the artisan asks for the balance. */
  isDeposit: boolean;
  createdAt: IsoDate;
}

export interface ShipmentInput {
  carrier: string;
  trackingNumber: string;
}

export type PayoutStatus = "PENDING" | "PAID" | "FAILED";

export interface Payout {
  id: Id;
  masterId: Id;
  masterName: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  reference: string | null;
  itemCount: number;
  createdAt: IsoDate;
  paidAt: IsoDate | null;
}

/** View v_store_sales. */
export interface StoreSales {
  storeId: Id;
  storeName: string;
  masterId: Id;
  masterName: string;
  paidOrders: number;
  grossSales: number;
  artisanEarnings: number;
  pendingPayout: number;
}
