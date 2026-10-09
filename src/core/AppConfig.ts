/** Build-time configuration read from Vite environment variables. */
export class AppConfig {
  readonly apiUrl: string;
  readonly demoFallback: boolean;
  readonly requestedQuality: string | null;
  readonly requestedLanguage: string | null;
  readonly debug: boolean;

  constructor(env: ImportMetaEnv = import.meta.env, search = window.location.search) {
    const params = new URLSearchParams(search);
    this.apiUrl = String(env.VITE_API_URL ?? "http://localhost:8080").replace(/\/$/, "");
    this.demoFallback = String(env.VITE_DEMO_FALLBACK ?? "true") !== "false";
    this.requestedQuality = params.get("quality");
    this.requestedLanguage = params.get("lang");
    this.debug = params.has("debug");
  }
}
