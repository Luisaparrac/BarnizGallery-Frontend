import type { Auction, AuctionEvent, AuctionStatus, Bid, CreateAuctionRequest } from "../../domain/auction";
import type { Id } from "../../domain/common";
import { AppError } from "../../domain/errors";
import type { AuctionService } from "../contracts/AuctionService";
import { MockDatabase } from "./MockDatabase";
import { money, rules } from "./MockRules";
import { copy, latency, MockSession } from "./MockSession";
import type { AuctionRow } from "./MockTables";
import { views } from "./MockViews";

export class MockAuctionService implements AuctionService {
  private get db() {
    return MockDatabase.instance;
  }

  private get t() {
    return this.db.tables;
  }

  private row(id: Id): AuctionRow {
    return this.db.require(this.t.auctions.find((auction) => auction.id === id), "Auction");
  }

  private visible(row: AuctionRow): boolean {
    const artwork = this.t.artworks.find((entry) => entry.id === row.artworkId);
    return !!artwork && views.store(artwork.storeId).status === "PUBLISHED";
  }

  async list(status?: AuctionStatus): Promise<Auction[]> {
    await latency();
    rules.syncAuctions();
    this.db.save();
    const order: Record<AuctionStatus, number> = { ACTIVE: 0, SCHEDULED: 1, FINISHED: 2, CANCELLED: 3 };
    return copy(
      this.t.auctions
        .filter((row) => (!status || row.status === status) && this.visible(row))
        .sort((a, b) => order[a.status] - order[b.status] || a.endDate.localeCompare(b.endDate))
        .map((row) => views.auction(row)),
    );
  }

  async get(id: Id): Promise<Auction> {
    await latency();
    rules.syncAuctions();
    this.db.save();
    return copy(views.auction(this.row(id)));
  }

  async listBids(id: Id): Promise<Bid[]> {
    await latency();
    return copy(this.t.bids.filter((bid) => bid.auctionId === id).sort((a, b) => b.amount - a.amount).map((bid) => views.bid(bid)));
  }

  /** Same rules as the backend: active auction, minimum increment, 5 bids per minute, suspicious amounts flagged. */
  async placeBid(id: Id, amount: number): Promise<Bid> {
    await latency();
    rules.syncAuctions();
    const user = MockSession.requireUser("CUSTOMER", "ARTISAN");
    const auction = this.row(id);
    if (auction.status !== "ACTIVE") throw new AppError("auctionClosed", "This auction is not active", 422);
    const artwork = this.t.artworks.find((row) => row.id === auction.artworkId)!;
    const ownerUserId = this.t.masters.find((master) => master.id === views.store(artwork.storeId).masterId)?.userId;
    if (ownerUserId === user.id) throw new AppError("ownAuction", "You cannot bid on your own piece", 422);
    const bids = this.t.bids.filter((bid) => bid.auctionId === id);
    const highest = bids.reduce((max, bid) => Math.max(max, bid.amount), 0);
    const reference = highest || auction.basePrice;
    const minimum = money((highest ? highest : auction.basePrice) + auction.minIncrement);
    if (amount < minimum) throw new AppError("bidTooLow", `The minimum bid is ${minimum}`, 422, { min: minimum });
    const perMinute = Number(this.db.setting("auction.max_bids_per_minute", 5));
    const recent = this.t.bids.filter((bid) => bid.userId === user.id && Date.now() - Date.parse(bid.bidDate) < 60_000).length;
    if (recent >= perMinute) throw new AppError("tooMany", `Limit of ${perMinute} bids per minute`, 429, { limit: perMinute });
    const multiplier = Number(this.db.setting("auction.suspicious_multiplier", 10));
    const suspicious = amount > reference * multiplier;
    const previousLeader = bids.sort((a, b) => b.amount - a.amount)[0]?.userId;
    const bid = {
      id: this.db.nextId("bids"), auctionId: id, userId: user.id, amount: money(amount), currency: auction.currency, bidDate: this.db.now(),
      reviewStatus: suspicious ? ("SUSPICIOUS" as const) : ("VALID" as const),
      reviewReason: suspicious ? `El monto es más de ${multiplier} veces la referencia (${reference})` : null,
    };
    this.t.bids.push(bid);
    rules.recordInteraction(user.id, { action: "BID", artworkId: artwork.id });
    if (previousLeader && previousLeader !== user.id) {
      this.db.notify(previousLeader, "OUTBID", `Superaron tu oferta en «${artwork.titleEs}»`, `Nueva oferta: ${bid.amount} ${bid.currency}`, `/auctions/${id}`);
    }
    if (suspicious) this.db.notifyAdmins("SYSTEM", "Puja sospechosa", `${bid.amount} ${bid.currency} en «${artwork.titleEs}»`, "/admin/bids");
    this.db.save();
    return copy(views.bid(bid));
  }

  async listMine(): Promise<Auction[]> {
    await latency();
    rules.syncAuctions();
    const { store } = MockSession.requireArtisan();
    const artworkIds = new Set(this.t.artworks.filter((row) => row.storeId === store.id).map((row) => row.id));
    return copy(this.t.auctions.filter((row) => artworkIds.has(row.artworkId)).sort((a, b) => b.startDate.localeCompare(a.startDate)).map((row) => views.auction(row)));
  }

  async create(request: CreateAuctionRequest): Promise<Auction> {
    await latency();
    const { user, master, store } = MockSession.requireArtisan();
    if (master.verificationStatus !== "APPROVED") throw new AppError("notApproved", "Your account must be approved first", 403);
    const artwork = this.db.require(this.t.artworks.find((row) => row.id === request.artworkId && row.storeId === store.id && !row.deletedAt), "Artwork");
    if (artwork.status === "SOLD" || artwork.status === "RESERVED" || artwork.status === "DRAFT") throw new AppError("auctionNotAllowed", "This piece cannot go to auction", 422);
    if (this.t.auctions.some((row) => row.artworkId === artwork.id && (row.status === "ACTIVE" || row.status === "SCHEDULED"))) {
      throw new AppError("openAuctionExists", "This piece already has an open auction", 409);
    }
    if (Date.parse(request.endDate) <= Date.parse(request.startDate)) throw new AppError("endBeforeStart", "The end must be after the start", 422);
    if (request.basePrice <= 0 || request.minIncrement <= 0) throw new AppError("pricesPositive", "Prices must be greater than zero", 422);
    const row: AuctionRow = {
      id: this.db.nextId("auctions"), artworkId: artwork.id, basePrice: request.basePrice, reservePrice: request.reservePrice, minIncrement: request.minIncrement,
      currency: "USD", startDate: request.startDate, endDate: request.endDate, status: "SCHEDULED", createdBy: user.id, winningBidId: null, orderId: null,
    };
    this.t.auctions.push(row);
    artwork.saleMode = "AUCTION";
    this.db.audit("auctions", row.id, "I", user.id, `Subasta creada para «${artwork.titleEs}»`);
    rules.syncAuctions();
    this.db.save();
    return copy(views.auction(row));
  }

  async cancel(id: Id): Promise<Auction> {
    await latency();
    const user = MockSession.requireUser("ARTISAN", "ADMIN");
    const row = this.row(id);
    if (row.status !== "SCHEDULED" && row.status !== "ACTIVE") throw new AppError("onlyOpenAuctionsCancel", "Only open auctions can be cancelled", 409);
    row.status = "CANCELLED";
    const artwork = this.t.artworks.find((entry) => entry.id === row.artworkId)!;
    artwork.status = "EXHIBITED";
    this.db.audit("auctions", id, "U", user.id, `Subasta ${id} cancelada`);
    this.db.save();
    return copy(views.auction(row));
  }

  /** Simulated live channel: checks the table every 2 s and reports new bids or status changes. */
  subscribe(id: Id, listener: (event: AuctionEvent) => void): () => void {
    let last = { bids: -1, status: "" };
    const timer = window.setInterval(() => {
      rules.syncAuctions();
      const row = this.t.auctions.find((auction) => auction.id === id);
      if (!row) return;
      const auction = views.auction(row);
      if (last.bids >= 0 && auction.bidCount !== last.bids) listener({ type: "BID_PLACED", auction: copy(auction) });
      if (last.status && auction.status !== last.status) {
        listener({ type: auction.status === "ACTIVE" ? "AUCTION_STARTED" : auction.status === "FINISHED" ? "AUCTION_FINISHED" : "AUCTION_CANCELLED", auction: copy(auction) });
      }
      last = { bids: auction.bidCount, status: auction.status };
    }, 2000);
    return () => window.clearInterval(timer);
  }
}
