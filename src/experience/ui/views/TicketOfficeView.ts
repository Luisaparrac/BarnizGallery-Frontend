import { Control } from "@babylonjs/gui";
import type { User } from "../../../domain/user";
import type { Localizer } from "../../../i18n/Localizer";
import { PanelView, type PanelContext } from "../PanelView";

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
export class TicketOfficeView extends PanelView {
  readonly title: string;
  override readonly closable = false;

  constructor(
    private readonly i18n: Localizer,
    private readonly user: User | null,
    private readonly avatarName: string | null,
    private readonly handlers: TicketOfficeActions,
  ) {
    super();
    this.title = i18n.t("lobby.ticketTitle");
  }

  protected content({ kit }: PanelContext, width: number): Control {
    const column = kit.column();
    const intro = this.user ? this.i18n.t("lobby.ticketWelcome", { name: this.user.fullName }) : this.i18n.t("lobby.ticketText");
    const text = kit.text(intro, { muted: true });
    text.widthInPixels = width;
    column.addControl(text);
    if (this.avatarName) column.addControl(kit.text(this.i18n.t("lobby.avatarLabel", { name: this.avatarName }), { small: true, muted: true }));

    const buttons = kit.column(26);
    buttons.paddingTopInPixels = 40;
    const wide = 640;
    const actions = this.handlers;
    if (this.user) {
      buttons.addControl(kit.button(this.i18n.t("lobby.enter"), () => actions.enter(), "primary", wide));
      buttons.addControl(kit.button(this.i18n.t("lobby.changeAvatar"), () => actions.changeAvatar(), "quiet", wide));
    } else {
      buttons.addControl(kit.button(this.i18n.t("lobby.login"), () => actions.login(), "primary", wide));
      buttons.addControl(kit.button(this.i18n.t("lobby.register"), () => actions.register(), "primary", wide));
      buttons.addControl(kit.button(this.i18n.t("lobby.guest"), () => actions.guest(), "quiet", wide));
    }
    column.addControl(buttons);
    return column;
  }
}
