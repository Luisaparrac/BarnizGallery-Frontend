import type { Id } from "../../domain/common";
import type { ArtworkDetail, ArtworkSummary, GalleryFilters, ReportInput, StoreSummary } from "../../domain/gallery";

export interface GalleryService {
  listArtworks(filters: GalleryFilters): Promise<ArtworkSummary[]>;
  getArtwork(slug: string): Promise<ArtworkDetail>;
  listStores(): Promise<StoreSummary[]>;
  getStore(slug: string): Promise<StoreSummary>;
  toggleFavorite(artworkId: Id): Promise<boolean>;
  listFavorites(): Promise<ArtworkSummary[]>;
  report(input: ReportInput): Promise<void>;
}
