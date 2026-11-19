import { Control } from "@babylonjs/gui";
import { AppConfig } from "../../../config/AppConfig";
import type { LoginRequest } from "../../../domain/user";
import type { Localizer } from "../../../i18n/Localizer";
import type { Field, Toggle } from "../UiKit";
import type { PanelContext } from "../PanelView";
import { FormView } from "./FormView";

/** Demo accounts shown only with simulated data (same as the panel login). */
const DEMO_ACCOUNTS = ["ana@example.com", "valderrama@museo.co", "admin@museo.co"];
const DEMO_PASSWORD = "museo123";

/** Sign in at the ticket office with email and password. */
export class LoginView extends FormView {
  readonly title: string;
  private email: Field | null = null;
  private password: Field | null = null;

  constructor(
    i18n: Localizer,
    back: () => void,
    private readonly login: (request: LoginRequest) => Promise<void>,
  ) {
    super(i18n, back);
    this.title = i18n.t("lobby.loginTitle");
  }

  protected fields({ kit }: PanelContext, width: number): Control {
    const column = kit.column();
    const fieldWidth = Math.min(760, width);
    this.email = kit.field(this.i18n.t("auth.email"), { width: fieldWidth });
    this.password = kit.field(this.i18n.t("auth.password"), { password: true, width: fieldWidth });
    for (const field of [this.email, this.password]) {
      field.control.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      column.addControl(field.control);
    }
    this.submitOnEnter(this.email.input, this.password.input);

    if (AppConfig.anyMock) {
      const note = kit.text(`${this.i18n.t("demo.accountsTitle")} ${this.i18n.t("demo.accountsText")}`, { small: true, muted: true });
      note.widthInPixels = width;
      column.addControl(note);
      const chips = kit.row(14);
      chips.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      const toggles: Toggle[] = [];
      for (const email of DEMO_ACCOUNTS) {
        const chip = kit.chip(email, false, () => {
          toggles.forEach((toggle) => toggle.setSelected(toggle === chip));
          this.fill(email);
        });
        toggles.push(chip);
        chips.addControl(chip.control);
      }
      column.addControl(chips);
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
