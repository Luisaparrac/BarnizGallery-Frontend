import type { Control } from "@babylonjs/gui";
import { AppConfig } from "../../../config/AppConfig";
import type { LoginRequest, UserRole } from "../../../domain/user";
import type { Localizer } from "../../../i18n/Localizer";
import { BoardFormView } from "../board/BoardFormView";
import type { BoardField } from "../board/BoardKit";
import type { BoardContext } from "../board/BoardView";

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
  private email: BoardField | null = null;
  private password: BoardField | null = null;

  constructor(
    i18n: Localizer,
    back: () => void,
    private readonly login: (request: LoginRequest) => Promise<void>,
  ) {
    super(i18n, back);
    this.title = i18n.t("lobby.loginTitle");
  }

  protected fields({ kit }: BoardContext, width: number): Control {
    const column = kit.column();
    this.email = kit.field(this.i18n.t("auth.email"), width);
    this.password = kit.field(this.i18n.t("auth.password"), width, { password: true });
    column.addControl(this.email.control);
    column.addControl(this.password.control);
    this.submitOnEnter(this.email.input, this.password.input);

    if (AppConfig.anyMock) {
      const demo = kit.column(8);
      demo.addControl(kit.note(`${this.i18n.t("demo.accountsTitle")} ${this.i18n.t("demo.accountsText")}`, width));
      demo.addControl(
        kit.choice(DEMO_ACCOUNTS, width, null, (account) => [account.email, this.i18n.t(`role.${account.role}`)], (account) => this.fill(account.email)),
      );
      column.addControl(demo);
    }
    return column;
  }

  protected submitLabel(): string {
    return this.i18n.t("auth.login");
  }

  protected override validate(): string | null {
    return this.email?.input.text.trim() && this.password?.input.text ? null : this.i18n.t("lobby.missingFields");
  }

  protected submit(): Promise<void> {
    return this.login({ email: this.email!.input.text.trim(), password: this.password!.input.text });
  }

  private fill(email: string): void {
    if (this.email) this.email.input.text = email;
    if (this.password) this.password.input.text = DEMO_PASSWORD;
  }
}
