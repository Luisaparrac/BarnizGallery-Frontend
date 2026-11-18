import type { Id } from "../../domain/common";
import type { ArtworkDetail, ArtworkSummary, GalleryFilters, ReportInput, StoreSummary } from "../../domain/gallery";
import type { GalleryService } from "../contracts/GalleryService";
import { HttpClient } from "./HttpClient";

export class ApiGalleryService implements GalleryService {
  private readonly http = HttpClient.shared;

  listArtworks(filters: GalleryFilters): Promise<ArtworkSummary[]> {
    return this.http.get<ArtworkSummary[]>("/api/artworks", { ...filters });
  }

  getArtwork(slug: string): Promise<ArtworkDetail> {
    return this.http.get<ArtworkDetail>(`/api/artworks/${encodeURIComponent(slug)}`);
  }

  listStores(): Promise<StoreSummary[]> {
    return this.http.get<StoreSummary[]>("/api/stores");
  }

  getStore(slug: string): Promise<StoreSummary> {
    return this.http.get<StoreSummary>(`/api/stores/${encodeURIComponent(slug)}`);
  }

  async toggleFavorite(artworkId: Id): Promise<boolean> {
    const result = await this.http.post<{ favorite: boolean }>(`/api/favorites/${artworkId}/toggle`);
    return result.favorite;
  }

  listFavorites(): Promise<ArtworkSummary[]> {
    return this.http.get<ArtworkSummary[]>("/api/favorites");
  }

  async report(input: ReportInput): Promise<void> {
    await this.http.post("/api/reports", input);
  }
}
