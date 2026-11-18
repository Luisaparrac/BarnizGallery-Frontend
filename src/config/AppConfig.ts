export type ServiceName =
  | "auth"
  | "catalog"
  | "profile"
  | "gallery"
  | "commerce"
  | "auction"
  | "customOrder"
  | "messaging"
  | "notification"
  | "artisan"
  | "admin";

/** Values read from the .env file. */
export class AppConfig {
  static readonly apiUrl: string = (import.meta.env.VITE_API_URL ?? "http://localhost:8080").replace(/\/$/, "");
  static readonly useMocks: boolean = (import.meta.env.VITE_USE_MOCKS ?? "true") !== "false";
  private static readonly realServices = new Set(
    String(import.meta.env.VITE_REAL_SERVICES ?? "")
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean),
  );

  /** True when the service must call the backend instead of the simulated data. */
  static usesApi(service: ServiceName): boolean {
    return !AppConfig.useMocks || AppConfig.realServices.has(service);
  }

  static get anyMock(): boolean {
    return AppConfig.useMocks;
  }
}
