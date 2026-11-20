import { VisitorSetupStore } from "../../core/VisitorSetupStore";
import type { Language } from "../../domain/common";
import type { Localizer } from "../../i18n/Localizer";
import { services } from "../../services/ServiceRegistry";
import { Formatter } from "../../utils/Formatter";
import type { CommissionFlow } from "./CommissionFlow";
import { ErrorText } from "./ErrorText";
import type { PurchaseFlow, PurchaseHost } from "./PurchaseFlow";
import type { VisitorSession } from "./VisitorSession";
import { AccountView } from "./views/AccountView";
import { MessageView } from "./views/MessageView";
import { OrdersView } from "./views/OrdersView";

/**
 * The Account board (Mediator): my orders (a pending one can be paid with the same gateway), my
 * custom orders, the language, the avatar, the panel for artisans and administrators, and sign
 * out. Changing the language or the avatar and signing out go back to the lobby, which already
 * knows how to ask for them (the page reloads with the new choice saved).
 */
export class AccountFlow {
  private static readonly PANEL_URL = "/panel.html";

  constructor(
    private readonly i18n: Localizer,
    private readonly session: VisitorSession,
    private readonly host: PurchaseHost,
    private readonly purchase: PurchaseFlow,
    private readonly commissions: CommissionFlow,
  ) {}

  show(): void {
    this.host.show(
      new AccountView(this.i18n, this.session.user, {
        orders: () => void this.showOrders(),
        commissions: () => void this.commissions.showList(),
        language: (language) => this.changeLanguage(language),
        changeAvatar: () => AccountFlow.backToLobby(),
        panel: () => window.open(AccountFlow.PANEL_URL, "_blank", "noopener"),
        signIn: () => this.purchase.requireSignIn(() => this.show()),
        logout: () => void this.logout(),
      }),
    );
  }

  private async showOrders(): Promise<void> {
    try {
      const orders = await services.commerce.listMyOrders();
      this.host.show(new OrdersView(this.i18n, new Formatter(this.i18n.language), orders, { pay: (order) => void this.purchase.payOrder(order.id), back: () => this.show() }));
    } catch (error) {
      this.host.show(new MessageView(this.i18n.t("shop.errorTitle"), ErrorText.of(this.i18n, error)));
    }
  }

  private changeLanguage(language: Language): void {
    VisitorSetupStore.saveLanguage(language);
    if (this.session.signedIn) void services.profile.updateProfile({ preferredLanguage: language }).catch(() => undefined).finally(AccountFlow.backToLobby);
    else AccountFlow.backToLobby();
  }

  private async logout(): Promise<void> {
    await services.auth.logout().catch(() => undefined);
    AccountFlow.backToLobby();
  }

  private static backToLobby(): void {
    window.location.reload();
  }
}
