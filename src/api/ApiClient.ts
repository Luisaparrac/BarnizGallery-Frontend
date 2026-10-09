import type {
  GalleryNode,
  HealthResponse,
  IdentifyVisitorRequest,
  IdentifyVisitorResponse,
  Language,
  CameraMode,
  Recommendation,
  TasteProfile,
} from "../model/models";
import { RoomCatalog } from "../data/RoomCatalog";
import { ApiError } from "./ApiError";

/** Typed access to the BarnizGallery REST API. */
export class ApiClient {
  constructor(private readonly baseUrl: string) {}

  /** Render's free plan sleeps and takes ~1 min to wake up, hence the long health timeout. */
  getHealth(): Promise<HealthResponse> {
    return this.request("/api/health", {}, 70000);
  }

  getGallery(): Promise<GalleryNode> {
    return this.request("/api/gallery", {}, 30000);
  }

  identifyVisitor(body: IdentifyVisitorRequest): Promise<IdentifyVisitorResponse> {
    return this.request("/api/visitors/identify", { method: "POST", body: JSON.stringify(body) });
  }

  saveTasteProfile(visitorId: number, profile: TasteProfile): Promise<unknown> {
    return this.request(`/api/visitors/${visitorId}/taste-profile`, { method: "PUT", body: JSON.stringify(profile) });
  }

  async computeRecommendations(visitorId: number, strategy = "hybrid"): Promise<Recommendation[]> {
    const list = await this.request<Recommendation[]>(`/api/visitors/${visitorId}/recommendations?strategy=${strategy}`, {
      method: "POST",
    });
    return list.map((item) => ({ ...item, roomKey: RoomCatalog.matchKey(item.roomNameEs, item.roomNameEn) }));
  }

  updatePreferences(visitorId: number, body: { preferredLanguage?: Language; cameraMode?: CameraMode }): Promise<unknown> {
    return this.request(`/api/visitors/${visitorId}/preferences`, { method: "PATCH", body: JSON.stringify(body) });
  }

  private async request<T>(path: string, init: RequestInit = {}, timeoutMs = 15000): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(this.baseUrl + path, {
        ...init,
        signal: controller.signal,
        headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
      });
      if (!response.ok) {
        let message = response.statusText;
        try {
          message = (await response.json()).message ?? message;
        } catch {
          /* the error body is not JSON */
        }
        throw new ApiError(response.status, message);
      }
      return (response.status === 204 ? undefined : await response.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }
}
