import { VisitorSetupStore } from "../../core/VisitorSetupStore";
import type { TasteProfile } from "../../domain/taste";
import type { Localizer } from "../../i18n/Localizer";
import { services } from "../../services/ServiceRegistry";
import { Formatter } from "../../utils/Formatter";
import type { World } from "../world/World";
import { WorldRoomsLoader } from "../world/WorldRoomsLoader";
import { ErrorText } from "./ErrorText";
import type { PurchaseHost } from "./PurchaseFlow";
import type { VisitorSession } from "./VisitorSession";
import { MessageView } from "./views/MessageView";
import { TasteView } from "./views/TasteView";

/**
 * The welcome kiosk (Mediator of its boards): the questionnaire of tastes, saved in the account
 * or, for a visitor, in this browser; then the recommendations are computed again and the two
 * salas that match best light up in the plaza.
 */
export class TasteFlow {
  constructor(
    private readonly i18n: Localizer,
    private readonly session: VisitorSession,
    private readonly world: World,
    private readonly host: PurchaseHost,
  ) {}

  async open(): Promise<void> {
    try {
      const catalogs = await services.catalog.getCatalogs();
      const current = this.session.signedIn ? await services.profile.getTasteProfile().catch(() => null) : VisitorSetupStore.load().taste;
      this.host.show(new TasteView(this.i18n, catalogs, current, (taste) => this.save(taste)));
    } catch (error) {
      this.host.show(new MessageView(this.i18n.t("shop.errorTitle"), ErrorText.of(this.i18n, error)));
    }
  }

  private async save(taste: TasteProfile): Promise<void> {
    if (this.session.signedIn) await services.profile.saveTasteProfile(taste);
    VisitorSetupStore.save({ ...VisitorSetupStore.load(), taste, completed: true });
    const data = await new WorldRoomsLoader(this.i18n, new Formatter(this.i18n.language)).load(this.session.user);
    const rooms = data.rooms.filter((room) => room.recommended);
    this.world.setRecommendedRooms(new Set(rooms.map((room) => room.key)));
    const text = rooms.length ? this.i18n.t("taste.glowing", { names: rooms.map((room) => room.masterName).join(" · ") }) : this.i18n.t("welcome.noMatches");
    this.host.show(new MessageView(this.i18n.t("welcome.resultTitle"), text, { label: this.i18n.t("world.goExplore"), run: () => this.host.close() }));
  }
}
