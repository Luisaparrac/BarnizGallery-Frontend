import type { LoginRequest, PasswordChange, RegisterRequest, Session } from "../../domain/user";

export interface AuthService {
  login(request: LoginRequest): Promise<Session>;
  register(request: RegisterRequest): Promise<Session>;
  logout(): Promise<void>;
  /** Session restored from storage, or null. */
  restore(): Promise<Session | null>;
  requestPasswordReset(email: string): Promise<void>;
  /** Changes the signed-in user's password after checking the current one. */
  changePassword(change: PasswordChange): Promise<void>;
  /** Confirms the email with the token sent by mail. */
  verifyEmail(token: string): Promise<void>;
}
