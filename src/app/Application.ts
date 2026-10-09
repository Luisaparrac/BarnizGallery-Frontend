import { ApiClient } from "../api/ApiClient";
import { BackendConnection } from "../api/BackendConnection";
import { DemoRecommendationStrategy } from "../api/DemoRecommendationStrategy";
import { GalleryRepository } from "../api/GalleryRepository";
import { RecommendationService } from "../api/RecommendationService";
import { RemoteRecommendationStrategy } from "../api/RemoteRecommendationStrategy";
import { VisitorSession } from "../api/VisitorSession";
import { AppConfig } from "../core/AppConfig";
import { QualityManager } from "../core/QualityManager";
import { LocaleService, t } from "../i18n/LocaleService";
import type { CameraMode, Language } from "../model/models";
import { Hud } from "../ui/Hud";
import { KioskModal, type KioskResult } from "../ui/KioskModal";
import { DoorInteractable, KioskInteractable, type Interactable } from "../world/Interactable";
import { World } from "../world/World";

/** Composition root: wires the 3D world, the HUD and the backend services together. */
export class Application {
  private readonly config = new AppConfig();
  private readonly locale = LocaleService.instance;
  private readonly api = new ApiClient(this.config.apiUrl);
  private readonly gallery = new GalleryRepository();
  private readonly connection = new BackendConnection(this.api, this.gallery, this.config.demoFallback);
  private readonly recommender = new RecommendationService(new RemoteRecommendationStrategy(this.api), new DemoRecommendationStrategy(), this.config.demoFallback);
  private readonly session = new VisitorSession();
  private readonly world: World;
  private readonly hud: Hud;

  private visitorId: number | null = null;
  private modalOpen = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    hudRoot: HTMLElement,
  ) {
    this.locale.setLanguage(this.initialLanguage());
    this.world = new World(canvas, new QualityManager(this.config.requestedQuality));
    this.hud = new Hud(hudRoot);
    this.bindHud();
    this.bindWorld();
    if (this.config.debug) (window as unknown as { museo: World }).museo = this.world;
  }

  start(): void {
    this.hud.setCameraMode(this.world.player.mode);
    this.connection.statusChanged.subscribe((status) => this.hud.setStatus(status));
    void this.connection.connect();
  }

  private initialLanguage(): Language {
    const requested = this.config.requestedLanguage;
    if (requested === "es" || requested === "en") return requested;
    return navigator.language.toLowerCase().startsWith("es") ? "es" : "en";
  }

  private bindHud(): void {
    this.hud.enterClicked.subscribe(() => {
      this.hud.hideIntro();
      this.hud.setPlaying(true);
      this.world.player.setEnabled(true);
      this.world.input.requestPointerLock();
      this.canvas.focus();
    });
    this.hud.languagePicked.subscribe((language) => {
      this.locale.setLanguage(language);
      this.syncPreferences({ preferredLanguage: language });
    });
    this.hud.cameraToggleClicked.subscribe(() => this.world.player.toggleMode());
  }

  private bindWorld(): void {
    this.world.player.modeChanged.subscribe((mode) => {
      this.hud.setCameraMode(mode);
      this.syncPreferences({ cameraMode: mode });
    });
    this.world.input.pointerLockChanged.subscribe((locked) => {
      this.hud.setClickHintVisible(!locked && this.world.player.isEnabled && !this.modalOpen);
    });
    this.world.interactions.nearbyChanged.subscribe((item) => this.showPrompt(item));
    this.world.interactions.activated.subscribe((item) => this.activate(item));
  }

  private showPrompt(item: Interactable | null): void {
    if (!item || this.modalOpen) return this.hud.setPrompt(null);
    if (item instanceof KioskInteractable) return this.hud.setPrompt(() => t("kiosk_prompt"));
    if (!(item instanceof DoorInteractable)) return this.hud.setPrompt(null);
    const key = item.sala.definition.key;
    this.hud.setPrompt(() => {
      const name = this.gallery.displayName(key, this.locale.language);
      const count = this.gallery.artworkCount(key);
      const star = item.sala.isRecommended ? `  ★ ${t("recommended")}` : "";
      return `[E] ${name}${count ? ` · ${t("door_pieces", { n: count })}` : ""}${star}`;
    });
  }

  private activate(item: Interactable): void {
    if (this.modalOpen) return;
    if (item instanceof DoorInteractable) {
      const name = this.gallery.displayName(item.sala.definition.key, this.locale.language);
      this.hud.showToast(`${name} — ${t("door_soon")}`);
    } else if (item instanceof KioskInteractable) {
      this.openKiosk();
    }
  }

  private openKiosk(): void {
    this.modalOpen = true;
    this.hud.setPrompt(null);
    this.world.player.setEnabled(false);
    const modal = new KioskModal(this.hud.root, (submission) => this.recommender.recommend(submission), this.world.player.mode, this.session.load(), (data) => this.session.save(data));
    modal.closed.subscribe((result) => this.onKioskClosed(result));
    modal.open();
  }

  private onKioskClosed(result: KioskResult | null): void {
    this.modalOpen = false;
    this.world.player.setEnabled(true);
    this.canvas.focus();
    if (!result) return;
    this.locale.setLanguage(result.language);
    this.world.player.setMode(result.cameraMode as CameraMode);
    const { visitor, recommendations } = result.outcome;
    if (visitor) this.visitorId = visitor.visitorId;
    const keys = recommendations
      .filter((rec) => rec.roomKey && rec.score > 0)
      .slice(0, 2)
      .map((rec) => rec.roomKey as string);
    this.world.setRecommendedRooms(keys);
    if (keys.length) this.hud.showToast(t("rec_walk"));
  }

  private syncPreferences(body: { preferredLanguage?: Language; cameraMode?: CameraMode }): void {
    if (this.visitorId !== null) this.api.updatePreferences(this.visitorId, body).catch(() => undefined);
  }
}
