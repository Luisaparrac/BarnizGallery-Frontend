import type { Id } from "../../domain/common";
import type { ArtisanOrderItem, Payout, ShipmentInput, StoreSales } from "../../domain/commerce";
import type { Artwork, ArtworkInput, Master, Store, VerificationStep, VerificationStepType } from "../../domain/gallery";

export interface ArtisanService {
  getMyMaster(): Promise<Master>;
  updateMyMaster(update: Partial<Pick<Master, "name" | "city" | "workshop" | "biographyEs" | "biographyEn" | "profilePhotoUrl">>): Promise<Master>;
  getVerification(): Promise<VerificationStep[]>;
  submitStep(step: VerificationStepType, evidenceUrl: string): Promise<VerificationStep[]>;
  getMyStore(): Promise<Store>;
  saveMyStore(store: Store): Promise<Store>;
  /** Applies a template: theme and sections of the template. */
  applyTemplate(templateId: Id): Promise<Store>;
  publishStore(): Promise<Store>;
  unpublishStore(): Promise<Store>;
  listMyArtworks(): Promise<Artwork[]>;
  getMyArtwork(id: Id): Promise<Artwork>;
  saveArtwork(input: ArtworkInput, id?: Id): Promise<Artwork>;
  deleteArtwork(id: Id): Promise<void>;
  /** Uploads an image to the storage provider and returns its public URL. */
  uploadImage(file: File): Promise<string>;
  getSales(): Promise<StoreSales>;
  listOrderItems(): Promise<ArtisanOrderItem[]>;
  markPreparing(itemId: Id): Promise<void>;
  markShipped(itemId: Id, shipment: ShipmentInput): Promise<void>;
  markDelivered(itemId: Id): Promise<void>;
  /** Custom piece finished: creates the balance order for the customer. */
  requestBalance(itemId: Id): Promise<void>;
  listPayouts(): Promise<Payout[]>;
}
