import { ArtworkImageFactory } from "../../art/ArtworkImageFactory";
import { VisitorSetupStore } from "../../core/VisitorSetupStore";
import type { Id } from "../../domain/common";
import type { Artwork, ArtworkSummary, StoreSummary } from "../../domain/gallery";
import type { Recommendation } from "../../domain/taste";
import type { User } from "../../domain/user";
import type { Localizer } from "../../i18n/Localizer";
import { services } from "../../services/ServiceRegistry";
import type { Formatter } from "../../utils/Formatter";
import type { WorldPiece, WorldRoom } from "./WorldTypes";

/** What the 3D page needs: one room per published store, with its pieces, already translated. */
export interface WorldData {
  rooms: WorldRoom[];
  /** Pieces by id, to open the panel of the piece the visitor picks. */
  slugs: Map<Id, string>;
}

/** Turns the gallery services' data into the rooms of the 3D plaza (Adapter between services and the world). */
export class WorldRoomsLoader {
  /** How many salas glow as recommended. */
  private static readonly RECOMMENDED_ROOMS = 2;

  constructor(
    private readonly i18n: Localizer,
    private readonly format: Formatter,
  ) {}

  async load(user: User | null): Promise<WorldData> {
    const [stores, artworks] = await Promise.all([services.gallery.listStores(), services.gallery.listArtworks({ sort: "recent" })]);
    const recommended = await this.recommendedStores(user, artworks);
    const slugs = new Map<Id, string>();
    const rooms = stores
      .filter((summary) => summary.store.status === "PUBLISHED")
      .map((summary) => {
        const pieces = artworks.filter((row) => row.artwork.storeId === summary.store.id).map((row) => this.piece(row));
        pieces.forEach((piece) => slugs.set(piece.id, piece.slug));
        return this.room(summary, pieces, recommended.has(summary.store.id));
      });
    return { rooms, slugs };
  }

  private room(summary: StoreSummary, pieces: WorldPiece[], recommended: boolean): WorldRoom {
    const name = summary.master.name;
    const surname = name.trim().split(/\s+/).pop() ?? name;
    return {
      key: summary.store.slug,
      masterName: name,
      banner: this.i18n.t("world.banner", { surname: surname.toUpperCase(), name }),
      insideSign: this.i18n.pick(summary.store.nameEs, summary.store.nameEn),
      pieces,
      recommended,
    };
  }

  private piece(row: ArtworkSummary): WorldPiece {
    const { artwork } = row;
    const photo = [...artwork.photos].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder)[0];
    return {
      id: artwork.id,
      slug: artwork.slug,
      title: this.i18n.pick(artwork.titleEs, artwork.titleEn),
      photoUrl: ArtworkImageFactory.resolve(photo?.url),
      caption: this.caption(artwork),
    };
  }

  private caption(artwork: Artwork): string {
    if (artwork.status === "SOLD") return this.i18n.t("world.captionSold");
    if (artwork.status === "RESERVED") return this.i18n.t("world.captionReserved");
    if (artwork.status === "IN_AUCTION" || artwork.saleMode === "AUCTION") return this.i18n.t("world.captionAuction");
    if (artwork.saleMode === "EXHIBITION") return this.i18n.t("world.captionExhibition");
    return this.format.money(artwork.price, artwork.currency);
  }

  /** Stores whose pieces best match the visitor's taste (account or welcome questionnaire). */
  private async recommendedStores(user: User | null, artworks: ArtworkSummary[]): Promise<Set<Id>> {
    let recommendations: Recommendation[] = [];
    try {
      const taste = VisitorSetupStore.load().taste;
      if (user) recommendations = await services.profile.computeRecommendations("hybrid");
      else if (taste) recommendations = await services.profile.recommendForVisitor(taste);
    } catch {
      return new Set();
    }
    const storeOf = new Map(artworks.map((row) => [row.artwork.id, row.artwork.storeId]));
    const scores = new Map<Id, number>();
    for (const recommendation of recommendations) {
      const storeId = recommendation.storeId ?? (recommendation.artworkId !== null ? storeOf.get(recommendation.artworkId) : undefined);
      if (storeId !== undefined) scores.set(storeId, (scores.get(storeId) ?? 0) + recommendation.score);
    }
    return new Set(
      [...scores.entries()]
        .filter(([, score]) => score > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, WorldRoomsLoader.RECOMMENDED_ROOMS)
        .map(([storeId]) => storeId),
    );
  }
}
