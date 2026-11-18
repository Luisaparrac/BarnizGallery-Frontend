import type { Auction, AuctionEvent, AuctionStatus, Bid, CreateAuctionRequest } from "../../domain/auction";
import type { Id } from "../../domain/common";

export interface AuctionService {
  list(status?: AuctionStatus): Promise<Auction[]>;
  get(id: Id): Promise<Auction>;
  listBids(id: Id): Promise<Bid[]>;
  placeBid(id: Id, amount: number): Promise<Bid>;
  /** Artisan: auctions of the own store. */
  listMine(): Promise<Auction[]>;
  create(request: CreateAuctionRequest): Promise<Auction>;
  cancel(id: Id): Promise<Auction>;
  /** Live updates (STOMP /topic/auctions/{id} in the backend). Returns the unsubscribe function. */
  subscribe(id: Id, listener: (event: AuctionEvent) => void): () => void;
}
