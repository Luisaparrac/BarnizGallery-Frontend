import { AppConfig, type ServiceName } from "../config/AppConfig";
import { ApiAdminService } from "./api/ApiAdminService";
import { ApiArtisanService } from "./api/ApiArtisanService";
import { ApiAuctionService } from "./api/ApiAuctionService";
import { ApiAuthService } from "./api/ApiAuthService";
import { ApiCatalogService } from "./api/ApiCatalogService";
import { ApiCommerceService } from "./api/ApiCommerceService";
import { ApiCustomOrderService } from "./api/ApiCustomOrderService";
import { ApiGalleryService } from "./api/ApiGalleryService";
import { ApiMessagingService } from "./api/ApiMessagingService";
import { ApiNotificationService } from "./api/ApiNotificationService";
import { ApiProfileService } from "./api/ApiProfileService";
import type { AdminService } from "./contracts/AdminService";
import type { ArtisanService } from "./contracts/ArtisanService";
import type { AuctionService } from "./contracts/AuctionService";
import type { AuthService } from "./contracts/AuthService";
import type { CatalogService } from "./contracts/CatalogService";
import type { CommerceService } from "./contracts/CommerceService";
import type { CustomOrderService } from "./contracts/CustomOrderService";
import type { GalleryService } from "./contracts/GalleryService";
import type { MessagingService } from "./contracts/MessagingService";
import type { NotificationService } from "./contracts/NotificationService";
import type { ProfileService } from "./contracts/ProfileService";
import { MockAdminService } from "./mock/MockAdminService";
import { MockArtisanService } from "./mock/MockArtisanService";
import { MockAuctionService } from "./mock/MockAuctionService";
import { MockAuthService } from "./mock/MockAuthService";
import { MockCatalogService } from "./mock/MockCatalogService";
import { MockCommerceService } from "./mock/MockCommerceService";
import { MockCustomOrderService } from "./mock/MockCustomOrderService";
import { MockGalleryService } from "./mock/MockGalleryService";
import { MockMessagingService } from "./mock/MockMessagingService";
import { MockNotificationService } from "./mock/MockNotificationService";
import { MockProfileService } from "./mock/MockProfileService";

/**
 * Creates every service once (Singleton + Factory) and picks, per service, the real backend or the
 * simulated one according to VITE_USE_MOCKS and VITE_REAL_SERVICES. Pages only see the interfaces.
 */
export class ServiceRegistry {
  private static instance: ServiceRegistry | null = null;

  static get shared(): ServiceRegistry {
    return (ServiceRegistry.instance ??= new ServiceRegistry());
  }

  readonly auth: AuthService = ServiceRegistry.pick<AuthService>("auth", () => new ApiAuthService(), () => new MockAuthService());
  readonly catalog: CatalogService = ServiceRegistry.pick<CatalogService>("catalog", () => new ApiCatalogService(), () => new MockCatalogService());
  readonly profile: ProfileService = ServiceRegistry.pick<ProfileService>("profile", () => new ApiProfileService(), () => new MockProfileService());
  readonly gallery: GalleryService = ServiceRegistry.pick<GalleryService>("gallery", () => new ApiGalleryService(), () => new MockGalleryService());
  readonly commerce: CommerceService = ServiceRegistry.pick<CommerceService>("commerce", () => new ApiCommerceService(), () => new MockCommerceService());
  readonly auction: AuctionService = ServiceRegistry.pick<AuctionService>("auction", () => new ApiAuctionService(), () => new MockAuctionService());
  readonly customOrder: CustomOrderService = ServiceRegistry.pick<CustomOrderService>("customOrder", () => new ApiCustomOrderService(), () => new MockCustomOrderService());
  readonly messaging: MessagingService = ServiceRegistry.pick<MessagingService>("messaging", () => new ApiMessagingService(), () => new MockMessagingService());
  readonly notification: NotificationService = ServiceRegistry.pick<NotificationService>("notification", () => new ApiNotificationService(), () => new MockNotificationService());
  readonly artisan: ArtisanService = ServiceRegistry.pick<ArtisanService>("artisan", () => new ApiArtisanService(), () => new MockArtisanService());
  readonly admin: AdminService = ServiceRegistry.pick<AdminService>("admin", () => new ApiAdminService(), () => new MockAdminService());

  private constructor() {}

  private static pick<T>(name: ServiceName, api: () => T, mock: () => T): T {
    return AppConfig.usesApi(name) ? api() : mock();
  }
}

export const services = ServiceRegistry.shared;
