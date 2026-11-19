import type { User } from "../../../domain/user";
import type { Localizer } from "../../../i18n/Localizer";
import { BoardView, type BoardContext } from "../board/BoardView";
import type { UiNode } from "../kit/UiKit";

export interface TicketOfficeActions {
  login(): void;
  register(): void;
  guest(): void;
  /** With a session: go in with that account. */
  enter(): void;
  changeAvatar(): void;
}

/**
 * The ticket office of the lobby. Without a session: sign in, create an account or go in as a
 * visitor. With a session: go in, or change the avatar first.
 */
export class TicketOfficeView extends BoardView {
  override readonly closable = false;
  readonly size = "form" as const;
  readonly title: string;

  constructor(
    private readonly i18n: Localizer,
    private readonly user: User | null,
    private readonly avatarName: string | null,
    private readonly handlers: TicketOfficeActions,
  ) {
    super();
    this.title = i18n.t("lobby.ticketTitle");
  }

  content({ kit }: BoardContext): UiNode {
    const column = kit.column("large");
    const intro = kit.column("small");
    intro.add(kit.text(this.user ? this.i18n.t("lobby.ticketWelcome", { name: this.user.fullName }) : this.i18n.t("lobby.ticketText"), true));
    if (this.avatarName) intro.add(kit.note(this.i18n.t("lobby.avatarLabel", { name: this.avatarName })));
    column.add(intro);

    const buttons = kit.column("small");
    const act = this.handlers;
    if (this.user) {
      buttons.add(kit.button(this.i18n.t("lobby.enter"), () => act.enter(), "primary", true));
      buttons.add(kit.button(this.i18n.t("lobby.changeAvatar"), () => act.changeAvatar(), "secondary", true));
    } else {
      buttons.add(kit.button(this.i18n.t("lobby.login"), () => act.login(), "primary", true));
      buttons.add(kit.button(this.i18n.t("lobby.register"), () => act.register(), "secondary", true));
      buttons.add(kit.button(this.i18n.t("lobby.guest"), () => act.guest(), "secondary", true));
    }
    column.add(buttons);
    return column;
  }
}
