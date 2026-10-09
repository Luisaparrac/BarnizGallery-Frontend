// Types mirrored from the BarnizGallery backend DTOs (see the backend README, "REST API").

export type Language = "es" | "en";
export type CameraMode = "FIRST_PERSON" | "THIRD_PERSON";
export type ApiStatus = "connecting" | "online" | "demo" | "offline";

export interface GalleryNode {
  id?: number;
  type: "GALLERY" | "ROOM" | "ARTWORK";
  nameEs: string;
  nameEn: string;
  artworkCount: number;
  availableForAuctionCount: number;
  status?: string;
  glbFileUrl?: string;
  thumbnailUrl?: string;
  scene3dUrl?: string;
  masterId?: number;
  masterName?: string;
  children?: GalleryNode[];
}

export interface Visitor {
  visitorId: number;
  name: string;
  email: string;
  country: string | null;
  preferredLanguage: Language;
  cameraMode: CameraMode;
}

export interface IdentifyVisitorRequest {
  email: string;
  name: string;
  country: string;
  preferredLanguage: Language;
  cameraMode: CameraMode;
}

export interface IdentifyVisitorResponse {
  visitor: Visitor;
  isNew: boolean;
}

export interface TasteProfile {
  preferredColors: string[];
  preferredTypes: string[];
  preferredStyles: string[];
  budgetRange: string;
}

export interface Recommendation {
  recommendationId?: number;
  roomId: number | null;
  roomNameEs: string;
  roomNameEn: string;
  score: number;
  reason: string;
  /** Key of the matching sala in the 3D world, when it could be resolved. */
  roomKey?: string;
}

export interface HealthResponse {
  status: string;
  aiEnabled: boolean;
  hyper3dEnabled: boolean;
  storageEnabled: boolean;
}

/** Everything the kiosk collects before asking for recommendations. */
export interface TasteSubmission {
  name: string;
  email: string;
  country: string;
  language: Language;
  cameraMode: CameraMode;
  profile: TasteProfile;
}

export interface RecommendationOutcome {
  visitor: Visitor | null;
  recommendations: Recommendation[];
  /** True when the list came from the offline demo strategy instead of the backend. */
  isDemo: boolean;
}
