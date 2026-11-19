import type { Id, Language } from "../../domain/common";
import type { User } from "../../domain/user";

/** One avatar of the catalog as the lobby shows it. */
export interface LobbyAvatar {
  /** Null when the catalog could not be loaded and the default codes are used. */
  id: Id | null;
  code: string;
  nameEs: string;
  nameEn: string;
}

/** What the visitor decided in the lobby; the plaza is built from it. */
export interface LobbyResult {
  language: Language;
  user: User | null;
  avatar: LobbyAvatar | null;
}
