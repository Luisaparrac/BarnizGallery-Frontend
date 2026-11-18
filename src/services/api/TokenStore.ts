import type { Session } from "../../domain/user";

const KEY = "museo.session";

/** Keeps the session (user + token) between visits. */
export class TokenStore {
  static save(session: Session): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(session));
    } catch {
      /* storage blocked: the session lives only in memory */
    }
  }

  static load(): Session | null {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  }

  static clear(): void {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }

  static get token(): string | null {
    return TokenStore.load()?.accessToken ?? null;
  }
}
