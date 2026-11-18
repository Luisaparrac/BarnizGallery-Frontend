import type { AppSetting, ContentReport } from "../../domain/admin";
import type { BidReview, AuctionStatus } from "../../domain/auction";
import type { Catalogs } from "../../domain/catalog";
import type { Id, IsoDate } from "../../domain/common";
import type { Order, OrderItem, Payment, PayoutStatus } from "../../domain/commerce";
import type { CustomRequest, OfferStatus, OfferType } from "../../domain/customOrder";
import type { Artwork, Master, Store, VerificationStep } from "../../domain/gallery";
import type { AppNotification } from "../../domain/messaging";
import type { InteractionAction, Recommendation, TasteProfile } from "../../domain/taste";
import type { Address, User } from "../../domain/user";

/** Rows of the simulated database: the same tables as the PostgreSQL model v2. */
export interface UserRow extends User {
  passwordHash: string;
}

export interface ArtworkRow extends Artwork {
  deletedAt: IsoDate | null;
}

export interface FavoriteRow {
  userId: Id;
  artworkId: Id;
  createdAt: IsoDate;
}

export interface TasteRow {
  userId: Id;
  profile: TasteProfile;
  updatedAt: IsoDate;
}

export interface InteractionRow {
  id: Id;
  userId: Id;
  artworkId: Id | null;
  storeId: Id | null;
  action: InteractionAction;
  durationSeconds: number | null;
  date: IsoDate;
}

export interface RecommendationRow extends Recommendation {
  userId: Id;
}

export interface AddressRow extends Address {
  userId: Id;
}

export interface CartRow {
  userId: Id;
  items: { artworkId: Id; quantity: number }[];
}

export interface OrderRow extends Omit<Order, "buyerName" | "items"> {
  items: OrderItem[];
  /** For the balance order of a custom piece: the deposit order it completes. */
  balanceOfOrderId: Id | null;
}

export interface PaymentEventRow {
  id: Id;
  paymentId: Id;
  gatewayEventId: string;
  eventType: string;
  receivedAt: IsoDate;
}

export interface PayoutRow {
  id: Id;
  masterId: Id;
  amount: number;
  currency: string;
  status: PayoutStatus;
  reference: string | null;
  createdAt: IsoDate;
  paidAt: IsoDate | null;
}

export interface AuctionRow {
  id: Id;
  artworkId: Id;
  basePrice: number;
  reservePrice: number | null;
  minIncrement: number;
  currency: string;
  startDate: IsoDate;
  endDate: IsoDate;
  status: AuctionStatus;
  createdBy: Id | null;
  winningBidId: Id | null;
  orderId: Id | null;
}

export interface BidRow {
  id: Id;
  auctionId: Id;
  userId: Id;
  amount: number;
  currency: string;
  bidDate: IsoDate;
  reviewStatus: BidReview;
  reviewReason: string | null;
}

export type CustomRequestRow = Omit<CustomRequest, "buyerName" | "offers">;

export interface OfferRow {
  id: Id;
  requestId: Id;
  masterId: Id;
  type: OfferType;
  price: number;
  currency: string;
  estimatedDays: number;
  message: string | null;
  designId: Id | null;
  status: OfferStatus;
  createdAt: IsoDate;
}

export interface ConversationRow {
  id: Id;
  customerId: Id;
  masterId: Id;
  artworkId: Id | null;
  customRequestId: Id | null;
  orderId: Id | null;
  subject: string;
  status: "OPEN" | "CLOSED";
  createdAt: IsoDate;
  lastMessageAt: IsoDate;
}

export interface MessageRow {
  id: Id;
  conversationId: Id;
  senderId: Id;
  content: string;
  readAt: IsoDate | null;
  createdAt: IsoDate;
}

export interface NotificationRow extends AppNotification {
  userId: Id;
}

export type ReportRow = Omit<ContentReport, "reporterName" | "entityLabel">;

export interface AuditRow {
  id: Id;
  tableName: string;
  rowId: string;
  operation: "I" | "U" | "D";
  userId: Id | null;
  summary: string;
  changedAt: IsoDate;
}

export interface AiUsageRow {
  id: Id;
  feature: string;
  provider: string;
  userId: Id | null;
  referenceId: Id | null;
  success: boolean;
  createdAt: IsoDate;
}

export interface MockTables {
  catalogs: Catalogs;
  users: UserRow[];
  masters: Master[];
  verifications: VerificationStep[];
  stores: Store[];
  artworks: ArtworkRow[];
  favorites: FavoriteRow[];
  tastes: TasteRow[];
  interactions: InteractionRow[];
  recommendations: RecommendationRow[];
  addresses: AddressRow[];
  carts: CartRow[];
  orders: OrderRow[];
  payments: Payment[];
  paymentEvents: PaymentEventRow[];
  payouts: PayoutRow[];
  auctions: AuctionRow[];
  bids: BidRow[];
  customRequests: CustomRequestRow[];
  offers: OfferRow[];
  conversations: ConversationRow[];
  messages: MessageRow[];
  notifications: NotificationRow[];
  settings: AppSetting[];
  reports: ReportRow[];
  audit: AuditRow[];
  aiUsage: AiUsageRow[];
  counters: Record<string, number>;
}
