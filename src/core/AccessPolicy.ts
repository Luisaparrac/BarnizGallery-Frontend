import type { User, UserRole } from "../domain/user";

/** What a person may do in MUSEO. */
export type Capability =
  /** Walk the 3D museum, see the pieces, the auctions and use the taste kiosk. */
  | "browse"
  | "buy"
  | "bid"
  | "commission"
  | "favorite"
  /** Notifications and the Account board. */
  | "account"
  /** Open panel.html at all. */
  | "panel"
  /** The artisan's pages: store, works, orders, custom orders and auctions (approved artisans only). */
  | "artisanPanel"
  /** The verification page (artisans, approved or not). */
  | "verification"
  | "adminPanel";

/** Who may use each capability ("visitor" = nobody signed in). */
type Who = UserRole | "VISITOR";

/**
 * The access matrix of MUSEO, in one place (the same rules the backend applies): the 3D experience,
 * the panel and the simulated services ask it before letting someone act.
 *
 * | Capability   | Visitor | Customer | Artisan | Admin |
 * | browse       |   yes   |   yes    |   yes   |  yes  |
 * | buy, bid, commission, favorite | sign in | yes | no | no |
 * | account (notifications)        |   no    |   yes    |   yes   |  yes  |
 * | panel        |   no    |    no    |   yes   |  yes  |
 * | artisanPanel |   no    |    no    | approved|   no  |
 * | verification |   no    |    no    |   yes   |   no  |
 * | adminPanel   |   no    |    no    |    no   |  yes  |
 */
export class AccessPolicy {
  private static readonly MATRIX: Record<Capability, readonly Who[]> = {
    browse: ["VISITOR", "CUSTOMER", "ARTISAN", "ADMIN"],
    buy: ["CUSTOMER"],
    bid: ["CUSTOMER"],
    commission: ["CUSTOMER"],
    favorite: ["CUSTOMER"],
    account: ["CUSTOMER", "ARTISAN", "ADMIN"],
    panel: ["ARTISAN", "ADMIN"],
    artisanPanel: ["ARTISAN"],
    verification: ["ARTISAN"],
    adminPanel: ["ADMIN"],
  };

  /** True when this person (null = visitor) may use the capability. `approved` matters for artisans. */
  static can(user: Pick<User, "role"> | null, capability: Capability, approved = true): boolean {
    const who: Who = user?.role ?? "VISITOR";
    if (!AccessPolicy.MATRIX[capability].includes(who)) return false;
    return !(capability === "artisanPanel" && !approved);
  }

  /** Signed-in roles allowed to use a capability (what the services require). */
  static rolesFor(capability: Capability): UserRole[] {
    return AccessPolicy.MATRIX[capability].filter((who): who is UserRole => who !== "VISITOR");
  }

  /** True when a visitor would be asked to sign in for this capability (a customer may use it). */
  static needsSignIn(user: Pick<User, "role"> | null, capability: Capability): boolean {
    return !user && AccessPolicy.MATRIX[capability].includes("CUSTOMER");
  }

  /** Where a signed-in person lands in the panel. */
  static panelHome(user: Pick<User, "role">, approved: boolean): string {
    if (user.role === "ADMIN") return "/admin";
    if (user.role === "ARTISAN") return approved ? "/artisan" : "/artisan/verification";
    return "/";
  }
}
