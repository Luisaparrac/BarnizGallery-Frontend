import type { TasteProfile } from "../model/models";

export interface SavedVisitor {
  name: string;
  email: string;
  country: string;
  profile: TasteProfile;
}

/** Remembers the kiosk form in localStorage (best effort: storage may be unavailable). */
export class VisitorSession {
  constructor(private readonly storageKey = "museo.visitor") {}

  load(): SavedVisitor | null {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) ?? "null");
    } catch {
      return null;
    }
  }

  save(data: SavedVisitor): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch {
      /* the form simply starts empty next time */
    }
  }
}
