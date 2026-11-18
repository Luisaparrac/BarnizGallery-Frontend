import type { Auction, AuctionEvent, AuctionStatus, Bid, CreateAuctionRequest } from "../../domain/auction";
import type { Id } from "../../domain/common";
import type { AuctionService } from "../contracts/AuctionService";
import { HttpClient } from "./HttpClient";

export class ApiAuctionService implements AuctionService {
  private readonly http = HttpClient.shared;

  list(status?: AuctionStatus): Promise<Auction[]> {
    return this.http.get<Auction[]>("/api/auctions", { status });
  }

  get(id: Id): Promise<Auction> {
    return this.http.get<Auction>(`/api/auctions/${id}`);
  }

  listBids(id: Id): Promise<Bid[]> {
    return this.http.get<Bid[]>(`/api/auctions/${id}/bids`);
  }

  placeBid(id: Id, amount: number): Promise<Bid> {
    return this.http.post<Bid>(`/api/auctions/${id}/bids`, { amount });
  }

  listMine(): Promise<Auction[]> {
    return this.http.get<Auction[]>("/api/artisan/auctions");
  }

  create(request: CreateAuctionRequest): Promise<Auction> {
    return this.http.post<Auction>("/api/auctions", request);
  }

  cancel(id: Id): Promise<Auction> {
    return this.http.post<Auction>(`/api/auctions/${id}/cancel`);
  }

  /**
   * Until the STOMP client is added (topic /topic/auctions/{id}), the auction is polled every 5 s.
   */
  subscribe(id: Id, listener: (event: AuctionEvent) => void): () => void {
    let last = -1;
    const timer = window.setInterval(async () => {
      const auction = await this.get(id).catch(() => null);
      if (auction && auction.bidCount !== last) {
        if (last >= 0) listener({ type: "BID_PLACED", auction });
        last = auction.bidCount;
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }
}
