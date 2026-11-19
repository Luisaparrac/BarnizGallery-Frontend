import { AppEvents } from "../../core/AppEvents";
import type { Catalogs } from "../../domain/catalog";
import type { User } from "../../domain/user";
import type { Localizer } from "../../i18n/Localizer";
import { services } from "../../services/ServiceRegistry";
import { DoorInteractable, PieceInteractable, StallInteractable, type Interactable } from "../world/Interactable";
import type { World } from "../world/World";
import { Hud } from "./Hud";
import { PanelSurface, type SurfaceView } from "./PanelSurface";
import { PurchaseFlow } from "./PurchaseFlow";
import { UiLayer } from "./UiLayer";
import { VisitorSession } from "./VisitorSession";
import { ControlsView } from "./views/ControlsView";
import { UiKitSampleView } from "./views/UiKitSampleView";

/** Only with ?debug: what the UiKit sample needs. */
export interface UiSampleData {
  catalogs: Catalogs | null;
  photoUrl: string | null;
}

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
  private stopWatchingCart: (() => void) | null = null;

  constructor(
    private readonly world: World,
    private readonly i18n: Localizer,
    user: User | null,
    private readonly sample: UiSampleData | null,
  ) {
    this.layer = new UiLayer(world.scene, world.camera);
    this.surface = new PanelSurface(world.scene, this.layer, i18n.t("ui.close"));
    this.hud = new Hud(this.layer.hudTexture, {
      cart: i18n.t("hud.cart"),
      account: i18n.t("hud.account"),
      controls: i18n.t("hud.controls"),
      clickToLook: i18n.t("world.clickToLook"),
    });
    // Account gets its board in a later step.
    this.hud.setEnabled("account", false);
    this.session = new VisitorSession(user);
    this.purchase = new PurchaseFlow(i18n, this.session, { show: (view) => this.open(view), close: () => this.surface.close() });
    this.hud.setFirstPerson(world.cameraMode === "FIRST_PERSON");
    world.pointerBlocked = () => this.layer.pointerOverHud;

    this.unsubscribe.push(
      world.interactions.nearbyChanged.subscribe((item) => this.hud.setPrompt(this.promptFor(item))),
      world.input.pointerLockChanged.subscribe((locked) => this.hud.setPointerLocked(locked)),
      world.player.modeChanged.subscribe((mode) => this.hud.setFirstPerson(mode === "FIRST_PERSON")),
      this.hud.controlsPressed.subscribe(() => this.open(this.controlsView(false))),
      this.hud.cartPressed.subscribe(() => void this.purchase.showCart()),
      world.pieceSelected.subscribe((piece) => void this.purchase.showPiece(piece)),
      world.stallUsed.subscribe((kind) => {
        if (kind === "cashier") void this.purchase.showCart();
      }),
      this.session.changed.subscribe(() => this.watchCart()),
      this.surface.closed.subscribe(() => this.onPanelClosed()),
    );
    this.watchCart();
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
    this.surface.dispose();
    this.layer.dispose();
  }

  private onPanelClosed(): void {
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
      openSample: this.sample ? () => this.surface.open(new UiKitSampleView(this.i18n, this.sample!.catalogs, this.sample!.photoUrl)) : undefined,
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

  private promptFor(item: Interactable | null): string | null {
    if (item instanceof StallInteractable) return this.i18n.t(ExperienceUi.STALL_PROMPTS[item.kind]);
    if (item instanceof PieceInteractable) return this.i18n.t("world.promptPiece", { title: item.vitrina.piece.title });
    if (item instanceof DoorInteractable) {
      const { room } = item.sala;
      const text = this.i18n.t("world.promptDoor", { name: room.masterName, count: room.pieces.length });
      return room.recommended ? `${text} · ★ ${this.i18n.t("world.recommended")}` : text;
    }
    return null;
  }
}
