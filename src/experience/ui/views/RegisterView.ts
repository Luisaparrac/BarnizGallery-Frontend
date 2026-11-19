import { Control, type TextBlock } from "@babylonjs/gui";
import type { Language } from "../../../domain/common";
import type { Localizer } from "../../../i18n/Localizer";
import { COUNTRIES } from "../../../utils/countries";
import type { PanelContext } from "../PanelView";
import type { Field } from "../UiKit";
import { UiTheme } from "../UiTheme";
import { FormView } from "./FormView";

/** What the ticket office needs to create a customer account. */
export interface CustomerSignUp {
  fullName: string;
  email: string;
  password: string;
  countryCode: string;
}

/**
 * Create a customer account at the ticket office. Artisans sign up in the panel, so there is a
 * link to it. The country is picked with the arrows (the 3D interface has no drop-down list).
 */
export class RegisterView extends FormView {
  readonly title: string;
  private fullName: Field | null = null;
  private email: Field | null = null;
  private password: Field | null = null;
  private countryLabel: TextBlock | null = null;
  private countryIndex: number;

  constructor(
    i18n: Localizer,
    back: () => void,
    private readonly register: (request: CustomerSignUp) => Promise<void>,
    private readonly openArtisanSignUp: () => void,
  ) {
    super(i18n, back);
    this.title = i18n.t("lobby.registerTitle");
    const home = i18n.language === "es" ? "CO" : "US";
    this.countryIndex = Math.max(0, COUNTRIES.findIndex((country) => country.code === home));
  }

  protected fields({ kit }: PanelContext, width: number): Control {
    const column = kit.column();
    const intro = kit.text(this.i18n.t("lobby.registerText"), { muted: true });
    intro.widthInPixels = width;
    column.addControl(intro);

    const half = (width - UiTheme.panel.gap * 2) / 2;
    this.fullName = kit.field(this.i18n.t("auth.fullName"), { width: half });
    this.email = kit.field(this.i18n.t("auth.email"), { width: half });
    this.password = kit.field(`${this.i18n.t("auth.password")} · ${this.i18n.t("auth.passwordHint")}`, { password: true, width: half });
    const first = kit.row(UiTheme.panel.gap * 2);
    first.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    first.addControl(this.fullName.control);
    first.addControl(this.email.control);
    const second = kit.row(UiTheme.panel.gap * 2);
    second.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    second.addControl(this.password.control);
    second.addControl(this.countryPicker(kit, half));
    column.addControl(first);
    column.addControl(second);
    this.submitOnEnter(this.fullName.input, this.email.input, this.password.input);

    const artisan = kit.button(this.i18n.t("lobby.artisanLink"), this.openArtisanSignUp, "quiet", 620);
    artisan.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    column.addControl(artisan);
    return column;
  }

  protected submitLabel(): string {
    return this.i18n.t("auth.createAccount");
  }

  protected override validate(): string | null {
    const filled = [this.fullName, this.email, this.password].every((field) => field?.input.text.trim());
    return filled ? null : this.i18n.t("lobby.missingFields");
  }

  protected submit(): Promise<void> {
    return this.register({
      fullName: this.fullName!.input.text.trim(),
      email: this.email!.input.text.trim(),
      password: this.password!.input.text,
      countryCode: COUNTRIES[this.countryIndex].code,
    });
  }

  /** "‹ Colombia ›": a caption and the arrows to go through the list of countries. */
  private countryPicker(kit: PanelContext["kit"], width: number): Control {
    const block = kit.column(8);
    block.widthInPixels = width;
    const caption = kit.text(this.i18n.t("address.country"), { small: true, muted: true });
    block.addControl(caption);
    const row = kit.row(16);
    row.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    const arrow = 84;
    row.addControl(kit.button("‹", () => this.moveCountry(-1), "quiet", arrow));
    this.countryLabel = kit.text(this.countryName(), {});
    this.countryLabel.resizeToFit = false;
    this.countryLabel.widthInPixels = width - arrow * 2 - 32;
    this.countryLabel.heightInPixels = UiTheme.panel.controlHeight;
    this.countryLabel.fontWeight = "600";
    this.countryLabel.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    row.addControl(this.countryLabel);
    row.addControl(kit.button("›", () => this.moveCountry(1), "quiet", arrow));
    block.addControl(row);
    return block;
  }

  private moveCountry(step: number): void {
    this.countryIndex = (this.countryIndex + step + COUNTRIES.length) % COUNTRIES.length;
    if (this.countryLabel) this.countryLabel.text = this.countryName();
  }

  private countryName(): string {
    const country = COUNTRIES[this.countryIndex];
    return country[this.i18n.language as Language];
  }
}
