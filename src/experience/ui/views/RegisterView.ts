import type { Language } from "../../../domain/common";
import type { Localizer } from "../../../i18n/Localizer";
import { COUNTRIES } from "../../../utils/countries";
import { BoardFormView } from "../board/BoardFormView";
import type { BoardContext } from "../board/BoardView";
import type { UiField, UiNode } from "../kit/UiKit";

/** What the ticket office needs to create a customer account. */
export interface CustomerSignUp {
  fullName: string;
  email: string;
  password: string;
  countryCode: string;
}

/** Create a customer account at the ticket office. Artisans sign up in the panel, so there is a link to it. */
export class RegisterView extends BoardFormView {
  readonly title: string;
  private fullName: UiField | null = null;
  private email: UiField | null = null;
  private password: UiField | null = null;
  private country: UiField | null = null;

  constructor(
    i18n: Localizer,
    back: () => void,
    private readonly register: (request: CustomerSignUp) => Promise<void>,
    private readonly openArtisanSignUp: () => void,
  ) {
    super(i18n, back);
    this.title = i18n.t("lobby.registerTitle");
  }

  protected fields({ kit }: BoardContext): UiNode {
    const column = kit.column("medium");
    column.add(kit.text(this.i18n.t("lobby.registerText"), true));
    this.fullName = kit.field(this.i18n.t("auth.fullName"), { autocomplete: "name" });
    this.email = kit.field(this.i18n.t("auth.email"), { type: "email", autocomplete: "email" });
    this.password = kit.field(this.i18n.t("auth.password"), { password: true, autocomplete: "new-password", placeholder: this.i18n.t("auth.passwordHint") });
    const home = this.i18n.language === "es" ? "CO" : "US";
    const language = this.i18n.language as Language;
    const countries = [...COUNTRIES].sort((a, b) => a[language].localeCompare(b[language])).map((country) => ({ value: country.code, label: country[language] }));
    this.country = kit.select(this.i18n.t("address.country"), countries, home);
    [this.fullName, this.email, this.password, this.country].forEach((field) => column.add(field));
    this.submitOnEnter(this.fullName, this.email, this.password);
    column.add(kit.link(this.i18n.t("lobby.artisanLink"), this.openArtisanSignUp, "ink"));
    return column;
  }

  protected submitLabel(): string {
    return this.i18n.t("auth.createAccount");
  }

  protected override validate(): string | null {
    const filled = [this.fullName, this.email, this.password].every((field) => field?.value.trim());
    return filled ? null : this.i18n.t("lobby.missingFields");
  }

  protected send(): Promise<void> {
    return this.register({
      fullName: this.fullName!.value.trim(),
      email: this.email!.value.trim(),
      password: this.password!.value,
      countryCode: this.country!.value,
    });
  }
}
