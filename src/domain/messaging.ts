import type { Id, IsoDate } from "./common";

export interface Conversation {
  id: Id;
  customerId: Id;
  customerName: string;
  masterId: Id;
  masterName: string;
  artworkId: Id | null;
  customRequestId: Id | null;
  orderId: Id | null;
  subject: string;
  status: "OPEN" | "CLOSED";
  lastMessageAt: IsoDate;
  lastMessagePreview: string;
  unreadCount: number;
}

export interface Message {
  id: Id;
  conversationId: Id;
  senderId: Id;
  senderName: string;
  content: string;
  readAt: IsoDate | null;
  createdAt: IsoDate;
}

export interface StartConversationRequest {
  masterId: Id;
  subject: string;
  content: string;
  artworkId?: Id;
  customRequestId?: Id;
  orderId?: Id;
}

export type NotificationType =
  | "OUTBID"
  | "MATCHING_AUCTION"
  | "AUCTION_WON"
  | "NEW_CUSTOM_OFFER"
  | "OFFER_ACCEPTED"
  | "OFFER_REJECTED"
  | "PAYMENT_APPROVED"
  | "PAYMENT_REJECTED"
  | "ORDER_SHIPPED"
  | "NEW_MESSAGE"
  | "VERIFICATION_APPROVED"
  | "VERIFICATION_REJECTED"
  | "NEW_ORDER"
  | "SYSTEM";

export interface AppNotification {
  id: Id;
  type: NotificationType;
  title: string;
  body: string | null;
  /** Route inside the frontend to open. */
  link: string | null;
  readAt: IsoDate | null;
  createdAt: IsoDate;
}
