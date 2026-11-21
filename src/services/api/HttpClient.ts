import { AppConfig } from "../../config/AppConfig";
import { AppError } from "../../domain/errors";
import { TokenStore } from "./TokenStore";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Small JSON client for the backend REST API with the session token. */
export class HttpClient {
  private static instance: HttpClient | null = null;

  static get shared(): HttpClient {
    return (HttpClient.instance ??= new HttpClient(AppConfig.apiUrl));
  }

  private constructor(private readonly baseUrl: string) {}

  get<T>(path: string, query?: Record<string, unknown>): Promise<T> {
    return this.request<T>("GET", path + HttpClient.queryString(query));
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PUT", path, body);
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PATCH", path, body);
  }

  delete<T = void>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }

  async upload(path: string, file: File): Promise<{ url: string }> {
    const form = new FormData();
    form.append("file", file);
    return this.request<{ url: string }>("POST", path, form);
  }

  private async request<T>(method: Method, path: string, body?: unknown): Promise<T> {
    // The backend writes its error messages in this language when the visitor has no saved one.
    const headers: Record<string, string> = { Accept: "application/json", "Accept-Language": HttpClient.language() };
    const token = TokenStore.token;
    if (token) headers.Authorization = `Bearer ${token}`;
    const isForm = body instanceof FormData;
    if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";

    let response: Response;
    try {
      response = await fetch(this.baseUrl + path, {
        method,
        headers,
        body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
      });
    } catch {
      throw new AppError("network", "The server could not be reached", 0);
    }
    if (response.status === 204) return undefined as T;
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const body = data as { code?: string; message?: string; params?: Record<string, string | number> } | null;
      const message = body?.message ?? response.statusText;
      const code = body?.code ? HttpClient.camelCase(body.code) : HttpClient.codeFor(response.status);
      throw new AppError(code, message, response.status, body?.params ?? {});
    }
    return data as T;
  }

  /** The backend's codes are snake_case (custom_request_incomplete); the texts use camelCase (error.customRequestIncomplete). */
  private static camelCase(code: string): string {
    return code.replace(/_([a-z0-9])/g, (_, letter: string) => letter.toUpperCase());
  }

  private static language(): string {
    return typeof document !== "undefined" && document.documentElement.lang === "en" ? "en" : "es";
  }

  private static codeFor(status: number): string {
    if (status === 401) return "unauthorized";
    if (status === 403) return "forbidden";
    if (status === 404) return "notFound";
    if (status === 409) return "conflict";
    if (status === 422) return "invalid";
    if (status === 429) return "tooMany";
    if (status === 503) return "disabled";
    return "server";
  }

  private static queryString(query?: Record<string, unknown>): string {
    if (!query) return "";
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      if (Array.isArray(value)) value.forEach((item) => params.append(key, String(item)));
      else params.append(key, String(value));
    }
    const text = params.toString();
    return text ? `?${text}` : "";
  }
}
