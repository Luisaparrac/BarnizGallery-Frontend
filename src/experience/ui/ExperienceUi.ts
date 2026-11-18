import { AppEvents } from "../../core/AppEvents";
import type { Catalogs } from "../../domain/catalog";
import type { User } from "../../domain/user";
import type { Localizer } from "../../i18n/Localizer";
import { services } from "../../services/ServiceRegistry";
import { DoorInteractable, KioskInteractable, PieceInteractable, type Interactable } from "../world/Interactable";
import type { World } from "../world/World";
import { Hud } from "./Hud";
import { PanelSurface } from "./PanelSurface";
import type { PanelView } from "./PanelView";
import { UiLayer } from "./UiLayer";
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
  private readonly layer: UiLayer;
  private readonly hud: Hud;
  private readonly surface: PanelSurface;
  private readonly unsubscribe: (() => void)[] = [];

  constructor(
    private readonly world: World,
    private readonly i18n: Localizer,
    private readonly user: User | null,
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
    // Cart and Account get their panels in later steps.
    this.hud.setEnabled("cart", false);
    this.hud.setEnabled("account", false);
    this.hud.setFirstPerson(world.cameraMode === "FIRST_PERSON");
    world.pointerBlocked = () => this.layer.pointerOverHud;

    this.unsubscribe.push(
      world.interactions.nearbyChanged.subscribe((item) => this.hud.setPrompt(this.promptFor(item))),
      world.input.pointerLockChanged.subscribe((locked) => this.hud.setPointerLocked(locked)),
      world.player.modeChanged.subscribe((mode) => this.hud.setFirstPerson(mode === "FIRST_PERSON")),
      this.hud.controlsPressed.subscribe(() => this.open(this.controlsView(false))),
      this.surface.closed.subscribe(() => this.onPanelClosed()),
    );
    this.watchCart();
  }

  /** First screen of the plaza: the controls with the Enter button. */
  start(): void {
    this.open(this.controlsView(true));
  }

  open(view: PanelView): void {
    this.world.setPlaying(false);
    this.hud.setVisible(false);
    this.layer.usePanelPointer(true);
    this.surface.open(view);
  }

  dispose(): void {
    this.unsubscribe.forEach((stop) => stop());
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

  /** Customers and artisans see how many pieces their cart holds. */
  private watchCart(): void {
    if (!this.user || this.user.role === "ADMIN") {
      this.hud.setCartCount(null);
      return;
    }
    const refresh = () =>
      void services.commerce
        .getCart()
        .then((cart) => this.hud.setCartCount(cart.items.length))
        .catch(() => this.hud.setCartCount(null));
    refresh();
    this.unsubscribe.push(AppEvents.cartChanged.subscribe(refresh));
  }

  private promptFor(item: Interactable | null): string | null {
    if (item instanceof KioskInteractable) return this.i18n.t("world.promptKiosk");
    if (item instanceof PieceInteractable) return this.i18n.t("world.promptPiece", { title: item.vitrina.piece.title });
    if (item instanceof DoorInteractable) {
      const { room } = item.sala;
      const text = this.i18n.t("world.promptDoor", { name: room.masterName, count: room.pieces.length });
      return room.recommended ? `${text} · ★ ${this.i18n.t("world.recommended")}` : text;
    }
    return null;
  }
}
