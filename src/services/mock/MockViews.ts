import type { Auction, Bid } from "../../domain/auction";
import type { Id } from "../../domain/common";
import type { Order, Payout, StoreSales } from "../../domain/commerce";
import type { CustomRequest } from "../../domain/customOrder";
import type { ArtworkSummary, Store, StoreSummary } from "../../domain/gallery";
import type { Conversation, Message } from "../../domain/messaging";
import type { User } from "../../domain/user";
import { MockDatabase } from "./MockDatabase";
import type { ArtworkRow, AuctionRow, BidRow, ConversationRow, CustomRequestRow, MessageRow, OrderRow, PayoutRow, UserRow } from "./MockTables";

const PAID_STATUSES = new Set(["PAID", "PREPARING", "SHIPPED", "DELIVERED"]);

/** Builds the API responses from the table rows (what the views and DTO mappers do in the backend). */
export class MockViews {
  private get db() {
    return MockDatabase.instance;
  }

  private get t() {
    return this.db.tables;
  }

  user(row: UserRow): User {
    const { passwordHash: _hash, ...user } = row;
    return user;
  }

  userName(id: Id | null): string {
    return this.t.users.find((user) => user.id === id)?.fullName ?? "—";
  }

  store(id: Id): Store {
    return this.db.require(this.t.stores.find((store) => store.id === id), "Store");
  }

  isPublicArtwork(row: ArtworkRow): boolean {
    if (row.deletedAt || row.status === "DRAFT" || row.status === "ARCHIVED") return false;
    return this.store(row.storeId).status === "PUBLISHED";
  }

  artworkSummary(row: ArtworkRow): ArtworkSummary {
    const store = this.store(row.storeId);
    const master = this.t.masters.find((entry) => entry.id === store.masterId)!;
    const { deletedAt: _deleted, ...artwork } = row;
    return {
      artwork,
      storeSlug: store.slug,
      storeNameEs: store.nameEs,
      storeNameEn: store.nameEn,
      masterId: master.id,
      masterName: master.name,
      favoriteCount: this.t.favorites.filter((favorite) => favorite.artworkId === row.id).length,
    };
  }

  storeSummary(store: Store): StoreSummary {
    return {
      store,
      master: this.t.masters.find((master) => master.id === store.masterId)!,
      artworkCount: this.t.artworks.filter((artwork) => artwork.storeId === store.id && this.isPublicArtwork(artwork)).length,
    };
  }

  auction(row: AuctionRow): Auction {
    const artwork = this.t.artworks.find((entry) => entry.id === row.artworkId)!;
    const store = this.store(artwork.storeId);
    const bids = this.t.bids.filter((bid) => bid.auctionId === row.id).sort((a, b) => b.amount - a.amount);
    return {
      id: row.id,
      artworkId: row.artworkId,
      artworkTitleEs: artwork.titleEs,
      artworkTitleEn: artwork.titleEn,
      coverUrl: artwork.photos.find((photo) => photo.isPrimary)?.url ?? artwork.photos[0]?.url ?? "",
      storeId: store.id,
      storeName: store.nameEs,
      basePrice: row.basePrice,
      reservePrice: row.reservePrice,
      minIncrement: row.minIncrement,
      currency: row.currency,
      startDate: row.startDate,
      endDate: row.endDate,
      status: row.status,
      highestBid: bids[0]?.amount ?? null,
      highestBidderId: bids[0]?.userId ?? null,
      bidCount: bids.length,
      winningBidId: row.winningBidId,
      orderId: row.orderId,
    };
  }

  bid(row: BidRow): Bid {
    return { ...row, userName: this.userName(row.userId) };
  }

  order(row: OrderRow): Order {
    const { balanceOfOrderId: _balance, ...order } = row;
    return {
      ...order,
      buyerName: this.userName(row.buyerId),
      items: row.items.map((item) => ({ ...item, storeName: this.store(item.storeId).nameEs })),
    };
  }

  customRequest(row: CustomRequestRow): CustomRequest {
    return {
      ...row,
      buyerName: this.userName(row.buyerId),
      offers: this.t.offers
        .filter((offer) => offer.requestId === row.id)
        .map((offer) => {
          const master = this.t.masters.find((entry) => entry.id === offer.masterId)!;
          return { ...offer, masterName: master.name, storeSlug: this.t.stores.find((store) => store.masterId === master.id)?.slug ?? "" };
        }),
    };
  }

  conversation(row: ConversationRow, viewerId: Id): Conversation {
    const messages = this.t.messages.filter((message) => message.conversationId === row.id);
    const last = messages[messages.length - 1];
    return {
      ...row,
      customerName: this.userName(row.customerId),
      masterName: this.t.masters.find((master) => master.id === row.masterId)?.name ?? "—",
      lastMessagePreview: last?.content.slice(0, 90) ?? "",
      unreadCount: messages.filter((message) => message.senderId !== viewerId && !message.readAt).length,
    };
  }

  message(row: MessageRow): Message {
    return { ...row, senderName: this.userName(row.senderId) };
  }

  payout(row: PayoutRow): Payout {
    return {
      ...row,
      masterName: this.t.masters.find((master) => master.id === row.masterId)?.name ?? "—",
      itemCount: this.t.orders.flatMap((order) => order.items).filter((item) => item.payoutId === row.id).length,
    };
  }

  /** View v_store_sales. */
  storeSales(store: Store): StoreSales {
    const master = this.t.masters.find((entry) => entry.id === store.masterId)!;
    const paid = this.t.orders
      .filter((order) => PAID_STATUSES.has(order.status))
      .flatMap((order) => order.items.filter((item) => item.storeId === store.id && item.fulfillmentStatus !== "CANCELLED").map((item) => ({ order, item })));
    const sum = (values: number[]) => Math.round(values.reduce((total, value) => total + value, 0) * 100) / 100;
    return {
      storeId: store.id,
      storeName: store.nameEs,
      masterId: master.id,
      masterName: master.name,
      paidOrders: new Set(paid.map(({ order }) => order.id)).size,
      grossSales: sum(paid.map(({ item }) => item.lineTotal)),
      artisanEarnings: sum(paid.map(({ item }) => item.artisanAmount)),
      pendingPayout: sum(paid.filter(({ item }) => item.payoutId === null).map(({ item }) => item.artisanAmount)),
    };
  }
}

export const views = new MockViews();
