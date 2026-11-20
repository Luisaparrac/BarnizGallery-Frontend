import { AppConfig } from "./AppConfig";

/** A demo account offered on the login screens: its e-mail and the label of its role. */
export interface DemoAccount {
  email: string;
  /** Key of `demo.role.<role>` in the texts. */
  role: "CUSTOMER" | "ARTISAN" | "ARTISAN_PENDING" | "ADMIN";
}

/** True only in development (`npm run dev`) with simulated data. */
const SHOWN = import.meta.env.DEV && AppConfig.useMocks;

/**
 * The demo accounts of the simulated data and their shared password, offered on the login screens
 * only while developing with mocks. In the production build `import.meta.env.DEV` is the constant
 * `false`, so these lists and the password are removed from the bundle and never reach the screen.
 */
export class DemoAccounts {
  static readonly shown: boolean = SHOWN;
  static readonly password: string = SHOWN ? "museo123" : "";
  /** Accounts of the 3D login (the museum's visitors). */
  static readonly museum: readonly DemoAccount[] = SHOWN
    ? [
        { email: "ana@example.com", role: "CUSTOMER" },
        { email: "valderrama@museo.co", role: "ARTISAN" },
        { email: "admin@museo.co", role: "ADMIN" },
      ]
    : [];
  /** Accounts of the panel login (artisans and administration). */
  static readonly panel: readonly DemoAccount[] = SHOWN
    ? [
        { email: "valderrama@museo.co", role: "ARTISAN" },
        { email: "nueva@museo.co", role: "ARTISAN_PENDING" },
        { email: "admin@museo.co", role: "ADMIN" },
      ]
    : [];
}
