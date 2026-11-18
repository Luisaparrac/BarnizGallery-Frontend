import type { Id } from "../../domain/common";
import type { ArtisanOrderItem, Payout, ShipmentInput, StoreSales } from "../../domain/commerce";
import type { Artwork, ArtworkInput, Master, Store, VerificationStep, VerificationStepType } from "../../domain/gallery";
import type { ArtisanService } from "../contracts/ArtisanService";
import { HttpClient } from "./HttpClient";

export class ApiArtisanService implements ArtisanService {
  private readonly http = HttpClient.shared;
  private readonly base = "/api/artisan";

  getMyMaster(): Promise<Master> {
    return this.http.get<Master>(`${this.base}/master`);
  }

  updateMyMaster(update: Partial<Master>): Promise<Master> {
    return this.http.patch<Master>(`${this.base}/master`, update);
  }

  getVerification(): Promise<VerificationStep[]> {
    return this.http.get<VerificationStep[]>(`${this.base}/verification`);
  }

  submitStep(step: VerificationStepType, evidenceUrl: string): Promise<VerificationStep[]> {
    return this.http.post<VerificationStep[]>(`${this.base}/verification/${step}`, { evidenceUrl });
  }

  getMyStore(): Promise<Store> {
    return this.http.get<Store>(`${this.base}/store`);
  }

  saveMyStore(store: Store): Promise<Store> {
    return this.http.put<Store>(`${this.base}/store`, store);
  }

  applyTemplate(templateId: Id): Promise<Store> {
    return this.http.post<Store>(`${this.base}/store/template/${templateId}`);
  }

  publishStore(): Promise<Store> {
    return this.http.post<Store>(`${this.base}/store/publish`);
  }

  unpublishStore(): Promise<Store> {
    return this.http.post<Store>(`${this.base}/store/unpublish`);
  }

  listMyArtworks(): Promise<Artwork[]> {
    return this.http.get<Artwork[]>(`${this.base}/artworks`);
  }

  getMyArtwork(id: Id): Promise<Artwork> {
    return this.http.get<Artwork>(`${this.base}/artworks/${id}`);
  }

  saveArtwork(input: ArtworkInput, id?: Id): Promise<Artwork> {
    return id ? this.http.put<Artwork>(`${this.base}/artworks/${id}`, input) : this.http.post<Artwork>(`${this.base}/artworks`, input);
  }

  deleteArtwork(id: Id): Promise<void> {
    return this.http.delete(`${this.base}/artworks/${id}`);
  }

  async uploadImage(file: File): Promise<string> {
    return (await this.http.upload("/api/uploads/images", file)).url;
  }

  getSales(): Promise<StoreSales> {
    return this.http.get<StoreSales>(`${this.base}/sales`);
  }

  listOrderItems(): Promise<ArtisanOrderItem[]> {
    return this.http.get<ArtisanOrderItem[]>(`${this.base}/order-items`);
  }

  async markPreparing(itemId: Id): Promise<void> {
    await this.http.post(`${this.base}/order-items/${itemId}/preparing`);
  }

  async markShipped(itemId: Id, shipment: ShipmentInput): Promise<void> {
    await this.http.post(`${this.base}/order-items/${itemId}/shipped`, shipment);
  }

  async markDelivered(itemId: Id): Promise<void> {
    await this.http.post(`${this.base}/order-items/${itemId}/delivered`);
  }

  async requestBalance(itemId: Id): Promise<void> {
    await this.http.post(`${this.base}/order-items/${itemId}/balance`);
  }

  listPayouts(): Promise<Payout[]> {
    return this.http.get<Payout[]>(`${this.base}/payouts`);
  }
}
