import type { LoginRequest, RegisterRequest, Session } from "../../domain/user";
import type { AuthService } from "../contracts/AuthService";
import { HttpClient } from "./HttpClient";
import { TokenStore } from "./TokenStore";

export class ApiAuthService implements AuthService {
  private readonly http = HttpClient.shared;

  async login(request: LoginRequest): Promise<Session> {
    const session = await this.http.post<Session>("/api/auth/login", request);
    TokenStore.save(session);
    return session;
  }

  async register(request: RegisterRequest): Promise<Session> {
    const session = await this.http.post<Session>("/api/auth/register", request);
    TokenStore.save(session);
    return session;
  }

  async logout(): Promise<void> {
    await this.http.post("/api/auth/logout").catch(() => undefined);
    TokenStore.clear();
  }

  async restore(): Promise<Session | null> {
    const saved = TokenStore.load();
    if (!saved) return null;
    try {
      const user = await this.http.get<Session["user"]>("/api/users/me");
      const session = { ...saved, user };
      TokenStore.save(session);
      return session;
    } catch {
      TokenStore.clear();
      return null;
    }
  }

  requestPasswordReset(email: string): Promise<void> {
    return this.http.post("/api/auth/forgot-password", { email });
  }

  verifyEmail(token: string): Promise<void> {
    return this.http.post("/api/auth/verify-email", { token });
  }
}
