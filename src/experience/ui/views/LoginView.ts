import { AppConfig } from "../../../config/AppConfig";
import type { LoginRequest, UserRole } from "../../../domain/user";
import type { Localizer } from "../../../i18n/Localizer";
import { BoardFormView } from "../board/BoardFormView";
import type { BoardContext } from "../board/BoardView";
import type { UiField, UiNode } from "../kit/UiKit";

/** Demo accounts shown only with simulated data (same as the panel login). */
const DEMO_ACCOUNTS: { email: string; role: UserRole }[] = [
  { email: "ana@example.com", role: "CUSTOMER" },
  { email: "valderrama@museo.co", role: "ARTISAN" },
  { email: "admin@museo.co", role: "ADMIN" },
];
const DEMO_PASSWORD = "museo123";

/** Sign in with email and password (at the ticket office or from a board in the plaza). */
export class LoginView extends BoardFormView {
  readonly title: string;
  private email: UiField | null = null;
  private password: UiField | null = null;

  constructor(
    i18n: Localizer,
    back: () => void,
    private readonly login: (request: LoginRequest) => Promise<void>,
  ) {
    super(i18n, back);
    this.title = i18n.t("lobby.loginTitle");
  }

  protected fields({ kit }: BoardContext): UiNode {
    const column = kit.column("medium");
    this.email = kit.field(this.i18n.t("auth.email"), { type: "email", autocomplete: "email" });
    this.password = kit.field(this.i18n.t("auth.password"), { password: true, autocomplete: "current-password" });
    column.add(this.email);
    column.add(this.password);
    this.submitOnEnter(this.email, this.password);

    if (AppConfig.anyMock) {
      const demo = kit.column("small");
      demo.add(kit.note(`${this.i18n.t("demo.accountsTitle")} ${this.i18n.t("demo.accountsText")}`));
      demo.add(kit.choice(DEMO_ACCOUNTS, null, (account) => [account.email, this.i18n.t(`role.${account.role}`)], (account) => this.fill(account.email)));
      column.add(demo);
    }
    return column;
  }

  protected submitLabel(): string {
    return this.i18n.t("auth.login");
  }

  protected override validate(): string | null {
    return this.email?.value.trim() && this.password?.value ? null : this.i18n.t("lobby.missingFields");
  }

  protected send(): Promise<void> {
    return this.login({ email: this.email!.value.trim(), password: this.password!.value });
  }

  private fill(email: string): void {
    this.email?.setValue(email);
    this.password?.setValue(DEMO_PASSWORD);
  }
}
