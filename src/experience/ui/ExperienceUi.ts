import { AppEvents } from "../../core/AppEvents";
import type { User } from "../../domain/user";
import type { Localizer } from "../../i18n/Localizer";
import { services } from "../../services/ServiceRegistry";
import { CommissionHallInterior } from "../world/CommissionHallInterior";
import { WhatsAppLink } from "./WhatsAppLink";
import { NotificationCenter } from "./NotificationCenter";
import { ToastStack } from "./ToastStack";
import { MessageView } from "./views/MessageView";
import { NotificationsView } from "./views/NotificationsView";
import type { AppNotification } from "../../domain/messaging";
import { Formatter } from "../../utils/Formatter";
import { ContactInteractable, DesignFrameInteractable, DoorInteractable, HallDoorInteractable, OffersBoardInteractable, PieceInteractable, StallInteractable, type Interactable } from "../world/Interactable";
import type { World } from "../world/World";
import { Hud } from "./Hud";
import { PanelSurface, type SurfaceView } from "./PanelSurface";
import { AccountFlow } from "./AccountFlow";
import { CommissionFlow } from "./CommissionFlow";
import { CommissionHallLoader, type HallData } from "./CommissionHallLoader";
import { PurchaseFlow } from "./PurchaseFlow";
import { TasteFlow } from "./TasteFlow";
import { UiLayer } from "./UiLayer";
import { VisitorSession } from "./VisitorSession";
import { ControlsView } from "./views/ControlsView";

/**
 * Mediator between the world, the HUD and the board: opening a panel freezes the walk and hides
 * the HUD; closing it gives both back. Views and the world never talk to each other directly.
 */
export class ExperienceUi {
  private static readonly STALL_PROMPTS = {
    welcome: "world.promptKiosk",
    cashier: "world.promptCashier",
    commissions: "world.promptCommissions",
  } as const;

  private readonly layer: UiLayer;
  private readonly hud: Hud;
  private readonly surface: PanelSurface;
  private readonly unsubscribe: (() => void)[] = [];
  private readonly session: VisitorSession;
  private readonly purchase: PurchaseFlow;
  private readonly tastes: TasteFlow;
  private readonly commissions: CommissionFlow;
  private readonly account: AccountFlow;
  private readonly notifications: NotificationCenter;
  private readonly toasts = new ToastStack();
  private stopWatchingCart: (() => void) | null = null;
  private readonly hallLoader: CommissionHallLoader;
  private hallData: HallData | null = null;
  /** Increases with every hall refresh, so an older answer never overwrites a newer one. */
  private hallRequest = 0;

  constructor(
    private readonly world: World,
    private readonly i18n: Localizer,
    user: User | null,
  ) {
    this.layer = new UiLayer(world.scene, world.camera);
    this.surface = new PanelSurface(world.scene, this.layer, i18n.t("ui.close"));
    this.hud = new Hud({
      cart: i18n.t("hud.cart"),
      notifications: i18n.t("notifications.title"),
      account: i18n.t("hud.account"),
      controls: i18n.t("hud.controls"),
      clickToLook: i18n.t("world.clickToLook"),
    });
    // Account gets its board in a later step.
    this.session = new VisitorSession(user);
    const host = { show: (view: SurfaceView) => this.open(view), close: () => this.surface.close() };
    this.purchase = new PurchaseFlow(i18n, this.session, host);
    this.tastes = new TasteFlow(i18n, this.session, world, host);
    this.commissions = new CommissionFlow(i18n, this.session, host, this.purchase);
    this.account = new AccountFlow(i18n, this.session, host, this.purchase, this.commissions);
    this.notifications = new NotificationCenter(this.session);
    this.hallLoader = new CommissionHallLoader(i18n, CommissionHallInterior.FRAMES);
    this.hud.setFirstPerson(world.cameraMode === "FIRST_PERSON");
    world.pointerBlocked = () => this.layer.pointerOverHud;

    this.unsubscribe.push(
      world.interactions.nearbyChanged.subscribe((item) => this.hud.setPrompt(this.promptFor(item))),
      world.input.pointerLockChanged.subscribe((locked) => this.hud.setPointerLocked(locked)),
      world.player.modeChanged.subscribe((mode) => this.hud.setFirstPerson(mode === "FIRST_PERSON")),
      this.hud.controlsPressed.subscribe(() => this.open(this.controlsView(false))),
      this.hud.cartPressed.subscribe(() => void this.purchase.showCart()),
      this.hud.notificationsPressed.subscribe(() => void this.showNotifications()),
      this.notifications.countChanged.subscribe((count) => this.hud.setNotificationCount(count)),
      this.notifications.arrived.subscribe((item) =>
        this.toasts.show({ icon: NotificationsView.iconOf(item.type), title: item.title, body: item.body, open: () => void this.openNotification(item) }),
      ),
      this.hud.accountPressed.subscribe(() => this.account.show()),
      world.pieceSelected.subscribe((piece) => void this.purchase.showPiece(piece)),
      world.stallUsed.subscribe((kind) => {
        if (kind === "cashier") void this.purchase.showCart();
        if (kind === "welcome") void this.tastes.open();
        if (kind === "commissions") void this.commissions.showList();
      }),
      world.designPicked.subscribe((index) => this.openDesign(index)),
      world.contactRequested.subscribe((room) => {
        const url = new WhatsAppLink(this.i18n).forRoom(room.whatsapp, room.masterName);
        if (url) WhatsAppLink.open(url);
      }),
      world.offersPicked.subscribe(() => {
        const id = this.hallData?.offersRequestId;
        void (id ? this.commissions.showRequest(id) : this.commissions.showList());
      }),
      this.session.changed.subscribe(() => {
        this.watchCart();
        this.refreshHall();
      }),
      this.surface.closed.subscribe(() => this.onPanelClosed()),
    );
    this.watchCart();
    this.refreshHall();
  }

  /**
   * Arrival at the plaza: the first time, the controls with the Enter button; after that the walk
   * starts right away (the HUD asks for a click to capture the mouse).
   */
  start(showControls: boolean): void {
    if (showControls) this.open(this.controlsView(true));
    else this.onPanelClosed();
  }

  open(view: SurfaceView): void {
    this.world.setPlaying(false);
    this.hud.setVisible(false);
    this.layer.usePanelPointer(true);
    this.surface.open(view);
  }

  dispose(): void {
    this.unsubscribe.forEach((stop) => stop());
    this.stopWatchingCart?.();
    this.notifications.dispose();
    this.toasts.dispose();
    this.hud.dispose();
    this.surface.dispose();
    this.layer.dispose();
  }

  private onPanelClosed(): void {
    // A board may have created a commission, generated designs, accepted an offer or paid.
    this.refreshHall();
    void this.notifications.check();
    this.layer.usePanelPointer(false);
    this.hud.setVisible(true);
    this.world.setPlaying(true);
  }

  private controlsView(atStart: boolean): ControlsView {
    return new ControlsView(this.i18n, {
      // Pointer lock needs the click itself, so the walk starts before the board finishes closing.
      enter: atStart
        ? () => {
            this.surface.close();
            this.world.setPlaying(true);
            this.world.input.requestPointerLock();
          }
        : undefined,
    });
  }

  /** Customers and artisans see how many pieces their cart holds (again after signing in). */
  private watchCart(): void {
    this.stopWatchingCart?.();
    this.stopWatchingCart = null;
    const user = this.session.user;
    this.hud.setEnabled("cart", user?.role !== "ADMIN");
    if (!user || user.role === "ADMIN") {
      this.hud.setCartCount(null);
      return;
    }
    const refresh = () =>
      void services.commerce
        .getCart()
        .then((cart) => this.hud.setCartCount(cart.items.length))
        .catch(() => this.hud.setCartCount(null));
    refresh();
    this.stopWatchingCart = AppEvents.cartChanged.subscribe(refresh);
  }

  /** The notifications board; without a session it asks to sign in first. */
  private async showNotifications(): Promise<void> {
    if (!this.session.user) {
      this.open(
        new MessageView(this.i18n.t("notifications.title"), this.i18n.t("notifications.signIn"), {
          label: this.i18n.t("shop.signIn"),
          run: () => this.purchase.requireSignIn(() => void this.showNotifications()),
        }),
      );
      return;
    }
    try {
      const list = await this.notifications.list();
      this.open(
        new NotificationsView(this.i18n, new Formatter(this.i18n.language), list, {
          open: (item) => void this.openNotification(item),
          markAllRead: async () => {
            await this.notifications.markAllRead();
            await this.showNotifications();
          },
        }),
      );
    } catch {
      this.open(new MessageView(this.i18n.t("notifications.title"), this.i18n.t("shop.errorTitle")));
    }
  }

  /**
   * Marks a notification as read and opens what it is about: an order, a commission or an auction
   * in 3D; the artisan and admin pages in the panel (new tab).
   */
  private async openNotification(item: AppNotification): Promise<void> {
    if (!item.readAt) await this.notifications.markRead(item.id).catch(() => undefined);
    const link = item.link ?? "";
    const id = Number(/\/(\d+)$/.exec(link)?.[1]);
    if (link.startsWith("/account/orders")) await this.account.showOrders();
    else if (link.startsWith("/account/custom/") && id) await this.commissions.showRequest(id);
    else if (/^\/(artisan|admin|messages)/.test(link)) {
      window.open(`panel.html#${link}`, "_blank", "noopener");
      this.surface.close();
    } else this.surface.close();
  }

  /** Reloads what the commissions hall shows: the design wall and the offers board. */
  private refreshHall(): void {
    const request = ++this.hallRequest;
    void this.hallLoader.load(this.session.user).then((data) => {
      if (request !== this.hallRequest) return;
      this.hallData = data;
      this.world.setCommissionDesigns(data.designs, this.i18n.t("hall.emptyFrame"));
      this.world.setCommissionBoard(data.board);
      // The prompt of the frame or board the visitor stands at may have changed.
      this.hud.setPrompt(this.promptFor(this.world.interactions.current));
    });
  }

  /** A frame of the design wall: the visitor's commission, or the list (and a new one) for an example. */
  private openDesign(index: number): void {
    const design = this.hallData?.designs[index];
    if (!design) return;
    void (design.requestId ? this.commissions.showRequest(design.requestId) : this.commissions.showList());
  }

  private promptFor(item: Interactable | null): string | null {
    if (item instanceof HallDoorInteractable) return this.i18n.t("hall.promptDoor");
    if (item instanceof ContactInteractable) return this.i18n.t("whatsapp.prompt", { master: item.sala.room.masterName });
    if (item instanceof OffersBoardInteractable) return this.i18n.t("hall.promptBoard");
    if (item instanceof DesignFrameInteractable) {
      const design = this.hallData?.designs[item.index];
      if (!design) return this.i18n.t("hall.promptEmptyFrame");
      return design.requestId ? this.i18n.t("hall.promptDesign", { title: design.label }) : this.i18n.t("hall.promptExample");
    }
    if (item instanceof StallInteractable) return this.i18n.t(ExperienceUi.STALL_PROMPTS[item.kind]);
    if (item instanceof PieceInteractable) return this.i18n.t("world.promptPiece", { title: item.frame.piece.title });
    if (item instanceof DoorInteractable) {
      const { room } = item.sala;
      const text = this.i18n.t("world.promptDoor", { name: room.masterName, count: room.pieces.length });
      return room.recommended ? `${text} · ★ ${this.i18n.t("world.recommended")}` : text;
    }
    return null;
  }
}
