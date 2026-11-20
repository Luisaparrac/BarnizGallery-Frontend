import type { SectionType, StoreTheme } from "./catalog";
import type { Id, IsoDate } from "./common";

export type VerificationStatus = "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED";
export type VerificationStepType = "EMAIL" | "IDENTITY" | "WORKSHOP" | "SAMPLES" | "ADMIN_APPROVAL";
export type StepStatus = "PENDING" | "SUBMITTED" | "APPROVED" | "REJECTED";

/** Master artisan (maestro). */
export interface Master {
  id: Id;
  userId: Id | null;
  name: string;
  slug: string;
  city: string;
  workshop: string;
  biographyEs: string;
  biographyEn: string;
  profilePhotoUrl: string | null;
  verificationStatus: VerificationStatus;
  verifiedAt: IsoDate | null;
  /** WhatsApp number in international format (digits only); missing or null when there is none. */
  whatsapp?: string | null;
}

export interface VerificationStep {
  id: Id;
  masterId: Id;
  step: VerificationStepType;
  status: StepStatus;
  evidenceUrl: string | null;
  notes: string | null;
  reviewedAt: IsoDate | null;
}

export type StoreStatus = "DRAFT" | "PUBLISHED" | "SUSPENDED";

export interface StoreSection {
  id: Id;
  type: SectionType;
  titleEs: string;
  titleEn: string;
  contentEs: string;
  contentEn: string;
  imageUrl: string | null;
  sortOrder: number;
  isVisible: boolean;
}

export interface Store {
  id: Id;
  masterId: Id;
  slug: string;
  nameEs: string;
  nameEn: string;
  descriptionEs: string;
  descriptionEn: string;
  templateId: Id;
  status: StoreStatus;
  logoUrl: string | null;
  bannerUrl: string | null;
  theme: Partial<StoreTheme>;
  acceptsCustomOrders: boolean;
  sections: StoreSection[];
  publishedAt: IsoDate | null;
}

/** Public card of a store: the store plus its master. */
export interface StoreSummary {
  store: Store;
  master: Master;
  artworkCount: number;
}

export type SaleMode = "EXHIBITION" | "SALE" | "AUCTION";
export type ArtworkStatus = "DRAFT" | "EXHIBITED" | "IN_AUCTION" | "RESERVED" | "SOLD" | "ARCHIVED";

export interface Photo {
  id: Id;
  url: string;
  altEs: string;
  altEn: string;
  angle: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface Artwork {
  id: Id;
  storeId: Id;
  slug: string;
  titleEs: string;
  titleEn: string;
  historyEs: string;
  historyEn: string;
  technique: string;
  widthCm: number | null;
  heightCm: number | null;
  depthCm: number | null;
  weightG: number | null;
  shapeId: Id | null;
  styleId: Id | null;
  colorIds: Id[];
  motifIds: Id[];
  saleMode: SaleMode;
  status: ArtworkStatus;
  price: number | null;
  currency: string;
  stock: number;
  photos: Photo[];
  publishedAt: IsoDate | null;
  createdAt: IsoDate;
}

export type ArtworkInput = Omit<Artwork, "id" | "storeId" | "slug" | "publishedAt" | "createdAt">;

/** One row of the public catalog (view v_artwork_catalog). */
export interface ArtworkSummary {
  artwork: Artwork;
  storeSlug: string;
  storeNameEs: string;
  storeNameEn: string;
  masterId: Id;
  masterName: string;
  favoriteCount: number;
}

export interface ArtworkDetail extends ArtworkSummary {
  activeAuctionId: Id | null;
  isFavorite: boolean;
}

export type GallerySort = "recent" | "priceAsc" | "priceDesc" | "popular";

export interface GalleryFilters {
  search?: string;
  colorIds?: Id[];
  shapeIds?: Id[];
  styleIds?: Id[];
  motifIds?: Id[];
  saleModes?: SaleMode[];
  storeId?: Id;
  minPrice?: number;
  maxPrice?: number;
  sort?: GallerySort;
}

export type ReportEntity = "ARTWORK" | "STORE" | "MESSAGE" | "CUSTOM_REQUEST" | "USER";

export interface ReportInput {
  entityType: ReportEntity;
  entityId: Id;
  reason: string;
}
