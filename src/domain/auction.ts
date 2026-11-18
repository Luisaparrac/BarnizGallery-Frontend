import type { Id, IsoDate } from "./common";

export type AuctionStatus = "SCHEDULED" | "ACTIVE" | "FINISHED" | "CANCELLED";
export type BidReview = "VALID" | "SUSPICIOUS";

export interface Bid {
  id: Id;
  auctionId: Id;
  userId: Id;
  userName: string;
  amount: number;
  currency: string;
  bidDate: IsoDate;
  reviewStatus: BidReview;
  reviewReason: string | null;
}

export interface Auction {
  id: Id;
  artworkId: Id;
  artworkTitleEs: string;
  artworkTitleEn: string;
  coverUrl: string;
  storeId: Id;
  storeName: string;
  basePrice: number;
  reservePrice: number | null;
  minIncrement: number;
  currency: string;
  startDate: IsoDate;
  endDate: IsoDate;
  status: AuctionStatus;
  highestBid: number | null;
  highestBidderId: Id | null;
  bidCount: number;
  winningBidId: Id | null;
  orderId: Id | null;
}

export interface CreateAuctionRequest {
  artworkId: Id;
  basePrice: number;
  reservePrice: number | null;
  minIncrement: number;
  startDate: IsoDate;
  endDate: IsoDate;
}

export type AuctionEventType = "BID_PLACED" | "AUCTION_STARTED" | "AUCTION_FINISHED" | "AUCTION_CANCELLED";

export interface AuctionEvent {
  type: AuctionEventType;
  auction: Auction;
}
