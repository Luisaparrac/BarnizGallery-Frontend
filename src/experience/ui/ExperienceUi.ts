import { AppEvents } from "../../core/AppEvents";
import type { User } from "../../domain/user";
import type { Localizer } from "../../i18n/Localizer";
import { services } from "../../services/ServiceRegistry";
import { CommissionHallInterior } from "../world/CommissionHallInterior";
import { DesignFrameInteractable, DoorInteractable, HallDoorInteractable, OffersBoardInteractable, PieceInteractable, StallInteractable, type Interactable } from "../world/Interactable";
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
    this.hallLoader = new CommissionHallLoader(i18n, CommissionHallInterior.FRAMES);
    this.hud.setFirstPerson(world.cameraMode === "FIRST_PERSON");
    world.pointerBlocked = () => this.layer.pointerOverHud;

    this.unsubscribe.push(
      world.interactions.nearbyChanged.subscribe((item) => this.hud.setPrompt(this.promptFor(item))),
      world.input.pointerLockChanged.subscribe((locked) => this.hud.setPointerLocked(locked)),
      world.player.modeChanged.subscribe((mode) => this.hud.setFirstPerson(mode === "FIRST_PERSON")),
      this.hud.controlsPressed.subscribe(() => this.open(this.controlsView(false))),
      this.hud.cartPressed.subscribe(() => void this.purchase.showCart()),
      this.hud.accountPressed.subscribe(() => this.account.show()),
      world.pieceSelected.subscribe((piece) => void this.purchase.showPiece(piece)),
      world.stallUsed.subscribe((kind) => {
        if (kind === "cashier") void this.purchase.showCart();
        if (kind === "welcome") void this.tastes.open();
        if (kind === "commissions") void this.commissions.showList();
      }),
      world.designPicked.subscribe((index) => this.openDesign(index)),
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
    this.hud.dispose();
    this.surface.dispose();
    this.layer.dispose();
  }

  private onPanelClosed(): void {
    // A board may have created a commission, generated designs or accepted an offer.
    this.refreshHall();
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
