import type { Id } from "../../domain/common";
import { AppError } from "../../domain/errors";
import type { ArtworkDetail, ArtworkSummary, GalleryFilters, ReportInput, StoreSummary } from "../../domain/gallery";
import type { GalleryService } from "../contracts/GalleryService";
import { MockDatabase } from "./MockDatabase";
import { rules } from "./MockRules";
import { copy, latency, MockSession } from "./MockSession";
import { views } from "./MockViews";

export class MockGalleryService implements GalleryService {
  private get t() {
    return MockDatabase.instance.tables;
  }

  async listArtworks(filters: GalleryFilters): Promise<ArtworkSummary[]> {
    await latency();
    rules.syncAuctions();
    const search = filters.search?.trim().toLowerCase();
    const has = (list: Id[] | undefined, test: (id: Id) => boolean) => !list?.length || list.some(test);
    const rows = this.t.artworks.filter((artwork) => {
      if (!views.isPublicArtwork(artwork)) return false;
      if (filters.storeId && artwork.storeId !== filters.storeId) return false;
      if (!has(filters.colorIds, (id) => artwork.colorIds.includes(id))) return false;
      if (!has(filters.shapeIds, (id) => artwork.shapeId === id)) return false;
      if (!has(filters.styleIds, (id) => artwork.styleId === id)) return false;
      if (!has(filters.motifIds, (id) => artwork.motifIds.includes(id))) return false;
      if (filters.saleModes?.length && !filters.saleModes.includes(artwork.saleMode)) return false;
      if (filters.minPrice !== undefined && (artwork.price ?? 0) < filters.minPrice) return false;
      if (filters.maxPrice !== undefined && (artwork.price === null || artwork.price > filters.maxPrice)) return false;
      if (search) {
        const master = views.storeSummary(views.store(artwork.storeId)).master.name;
        if (![artwork.titleEs, artwork.titleEn, master].some((text) => text.toLowerCase().includes(search))) return false;
      }
      return true;
    });
    const summaries = rows.map((row) => views.artworkSummary(row));
    const sort = filters.sort ?? "recent";
    summaries.sort((a, b) => {
      if (sort === "priceAsc") return (a.artwork.price ?? Infinity) - (b.artwork.price ?? Infinity);
      if (sort === "priceDesc") return (b.artwork.price ?? -1) - (a.artwork.price ?? -1);
      if (sort === "popular") return b.favoriteCount - a.favoriteCount;
      return (b.artwork.publishedAt ?? "").localeCompare(a.artwork.publishedAt ?? "");
    });
    MockDatabase.instance.save();
    return copy(summaries);
  }

  async getArtwork(slug: string): Promise<ArtworkDetail> {
    await latency();
    rules.syncAuctions();
    const row = this.t.artworks.find((artwork) => artwork.slug === slug || String(artwork.id) === slug);
    const viewer = MockSession.currentUser();
    const owner = row && this.t.masters.find((master) => master.id === views.store(row.storeId).masterId)?.userId === viewer?.id;
    if (!row || (!views.isPublicArtwork(row) && !owner && viewer?.role !== "ADMIN")) throw new AppError("notFound", "Artwork not found", 404);
    const auction = this.t.auctions.find((entry) => entry.artworkId === row.id && (entry.status === "ACTIVE" || entry.status === "SCHEDULED"));
    return copy({
      ...views.artworkSummary(row),
      activeAuctionId: auction?.id ?? null,
      isFavorite: !!viewer && this.t.favorites.some((favorite) => favorite.userId === viewer.id && favorite.artworkId === row.id),
    });
  }

  async listStores(): Promise<StoreSummary[]> {
    await latency();
    return copy(this.t.stores.filter((store) => store.status === "PUBLISHED").map((store) => views.storeSummary(store)));
  }

  async getStore(slug: string): Promise<StoreSummary> {
    await latency();
    const store = this.t.stores.find((row) => row.slug === slug);
    const viewer = MockSession.currentUser();
    const owner = store && this.t.masters.find((master) => master.id === store.masterId)?.userId === viewer?.id;
    if (!store || (store.status !== "PUBLISHED" && !owner && viewer?.role !== "ADMIN")) throw new AppError("notFound", "Store not found", 404);
    return copy(views.storeSummary(store));
  }

  async toggleFavorite(artworkId: Id): Promise<boolean> {
    await latency();
    const user = MockSession.requireUser();
    const index = this.t.favorites.findIndex((row) => row.userId === user.id && row.artworkId === artworkId);
    if (index >= 0) this.t.favorites.splice(index, 1);
    else {
      this.t.favorites.push({ userId: user.id, artworkId, createdAt: new Date().toISOString() });
      rules.recordInteraction(user.id, { action: "FAVORITE", artworkId });
    }
    MockDatabase.instance.save();
    return index < 0;
  }

  async listFavorites(): Promise<ArtworkSummary[]> {
    await latency();
    const user = MockSession.requireUser();
    const ids = this.t.favorites.filter((row) => row.userId === user.id).map((row) => row.artworkId);
    return copy(this.t.artworks.filter((row) => ids.includes(row.id) && !row.deletedAt).map((row) => views.artworkSummary(row)));
  }

  async report(input: ReportInput): Promise<void> {
    await latency();
    const user = MockSession.requireUser();
    const db = MockDatabase.instance;
    if (input.reason.trim().length < 10) throw new AppError("reasonShort", "Explain the problem in at least 10 characters", 422);
    this.t.reports.push({ id: db.nextId("reports"), reporterId: user.id, entityType: input.entityType, entityId: input.entityId, reason: input.reason.trim(), status: "OPEN", createdAt: db.now(), resolvedAt: null });
    db.notifyAdmins("SYSTEM", "Nuevo reporte de contenido", input.reason.slice(0, 80), "/admin/reports");
    db.save();
  }
}
