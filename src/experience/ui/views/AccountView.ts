import type { Language } from "../../../domain/common";
import type { User } from "../../../domain/user";
import type { Localizer } from "../../../i18n/Localizer";
import { BoardView, type BoardContext } from "../board/BoardView";
import type { UiButton, UiNode, UiOption } from "../kit/UiKit";

export interface AccountActions {
  orders(): void;
  commissions(): void;
  language(language: Language): void;
  changeAvatar(): void;
  /** Artisans and administrators: open the panel in a new tab. */
  panel(): void;
  signIn(): void;
  logout(): void;
}

/**
 * The Account board (HUD button): my orders, my custom orders, the language, change the avatar,
 * the panel for artisans and administrators, and sign out. A visitor can sign in from here.
 */
export class AccountView extends BoardView {
  readonly size = "form" as const;
  readonly title: string;

  constructor(
    private readonly i18n: Localizer,
    private readonly user: User | null,
    private readonly act: AccountActions,
  ) {
    super();
    this.title = i18n.t("account.title");
  }

  content({ kit }: BoardContext): UiNode {
    const column = kit.column("large");
    const who = kit.column("small");
    if (this.user) {
      who.add(kit.section(this.user.fullName));
      who.add(kit.note(`${this.user.email} · ${this.i18n.t(`role.${this.user.role}`)}`));
    } else {
      who.add(kit.text(this.i18n.t("account.guest"), true));
    }
    column.add(who);

    const links = kit.column("small");
    if (this.user) {
      links.add(kit.option(this.i18n.t("account.orders"), this.i18n.t("account.ordersDetail"), false, () => this.act.orders()));
      links.add(kit.option(this.i18n.t("account.commissions"), this.i18n.t("account.commissionsDetail"), false, () => this.act.commissions()));
      if (this.user.role !== "CUSTOMER") links.add(kit.option(this.i18n.t("account.panel"), this.i18n.t("account.panelDetail"), false, () => this.act.panel()));
    }
    links.add(kit.option(this.i18n.t("lobby.changeAvatar"), this.i18n.t("account.avatarDetail"), false, () => this.act.changeAvatar()));
    column.add(links);

    const language = kit.column("small");
    language.add(kit.text(this.i18n.t("account.language")));
    const chips = kit.row("small");
    const toggles: UiOption[] = [];
    for (const [code, label] of [["es", this.i18n.t("lobby.spanish")], ["en", this.i18n.t("lobby.english")]] as const) {
      const chip = kit.chip(label, this.i18n.language === code, (on) => {
        toggles.forEach((other) => other.setSelected(other === chip));
        if (on && code !== this.i18n.language) this.act.language(code);
      });
      toggles.push(chip);
      chips.add(chip);
    }
    language.add(chips);
    column.add(language);
    return column;
  }

  override actions({ kit }: BoardContext): UiButton[] {
    return this.user ? [kit.button(this.i18n.t("account.logout"), () => this.act.logout(), "secondary")] : [kit.button(this.i18n.t("shop.signIn"), () => this.act.signIn())];
  }
}
