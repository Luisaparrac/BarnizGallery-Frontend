import { VisitorSetupStore } from "../core/VisitorSetupStore";
import type { Catalogs } from "../domain/catalog";
import type { Language } from "../domain/common";
import { Localizer } from "../i18n/Localizer";
import { services } from "../services/ServiceRegistry";
import { Formatter } from "../utils/Formatter";
import { AvatarStudio } from "./debug/AvatarStudio";
import { DebugStats } from "./debug/DebugStats";
import { LobbyStage } from "./lobby/LobbyStage";
import type { LobbyAvatar, LobbyResult } from "./lobby/LobbyTypes";
import { PlazaStage } from "./plaza/PlazaStage";
import type { Stage } from "./Stage";
import type { UiSampleData } from "./ui/ExperienceUi";
import { AvatarFactory } from "./world/AvatarFactory";
import type { World } from "./world/World";
import { WorldRoomsLoader } from "./world/WorldRoomsLoader";

/**
 * Entry point of the immersive 3D experience (index.html), without React. It shows the lobby
 * first and, when the doors open, fades to the plaza (each one is a Stage with its own scene).
 */
export class Experience {
  private static readonly FADE_MS = 700;

  private i18n: Localizer;
  private stage: Stage | null = null;
  /** FPS and draw-call counter, only with ?debug. */
  private stats: DebugStats | null = null;
  private readonly fade: HTMLDivElement;
  private readonly params = new URLSearchParams(window.location.search);

  constructor(private readonly root: HTMLElement) {
    const language = Experience.initialLanguage();
    document.documentElement.lang = language;
    this.i18n = new Localizer(language);
    this.fade = document.createElement("div");
    this.fade.className = "experience-fade";
  }

  async start(): Promise<void> {
    if (Experience.isTouchOnly()) {
      this.showNotice(this.i18n.t("world.mobileTitle"), this.i18n.t("world.mobileText"));
      return;
    }
    this.showNotice(this.i18n.t("world.loading"));
    // The 3D interface draws text on textures, so the fonts must be ready first.
    await Promise.all([document.fonts.load('500 16px "Figtree"'), document.fonts.load('700 16px "Bricolage Grotesque"')]).catch(() => undefined);

    if (this.params.get("debug") === "avatars") {
      this.show(new AvatarStudio(this.createCanvas()));
      return;
    }

    const session = await services.auth.restore().catch(() => null);
    const catalogs = await services.catalog.getCatalogs().catch(() => null);

    const lobbyCanvas = this.createCanvas();
    let lobby: LobbyStage;
    try {
      lobby = new LobbyStage(lobbyCanvas, { i18n: this.i18n, user: session?.user ?? null, avatars: this.lobbyAvatars(catalogs), quality: this.params.get("quality") });
    } catch {
      this.showNotice(this.i18n.t("world.noWebgl"));
      return;
    }
    this.show(lobby);
    const result = await lobby.run();

    await this.setFaded(true);
    this.hide();
    await this.enterPlaza(result, catalogs);
  }

  private async enterPlaza(result: LobbyResult, catalogs: Catalogs | null): Promise<void> {
    this.i18n = new Localizer(result.language);
    const format = new Formatter(result.language);
    const data = await new WorldRoomsLoader(this.i18n, format).load(result.user);
    if (!data.rooms.length) {
      this.showNotice(this.i18n.t("world.empty"), this.i18n.t("world.emptyText"));
      return;
    }

    const debug = this.params.has("debug");
    const sample: UiSampleData | null = debug ? { catalogs, photoUrl: data.rooms[0]?.pieces[0]?.photoUrl ?? null } : null;
    const canvas = this.createCanvas();
    let plaza: PlazaStage;
    try {
      plaza = new PlazaStage(canvas, { i18n: this.i18n, user: result.user, rooms: data.rooms, avatarCode: result.avatar?.code ?? null, quality: this.params.get("quality"), sample });
    } catch {
      this.showNotice(this.i18n.t("world.noWebgl"));
      return;
    }
    this.show(plaza);
    if (debug) (window as unknown as { museo?: World }).museo = plaza.world;
    await plaza.start();
    await this.setFaded(false);
  }

  /** The catalog avatars, or the five default codes when the catalog cannot be loaded. */
  private lobbyAvatars(catalogs: Catalogs | null): LobbyAvatar[] {
    const active = (catalogs?.avatars ?? []).filter((avatar) => avatar.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
    if (active.length) return active.map(({ id, code, nameEs, nameEn }) => ({ id, code, nameEs, nameEn }));
    return AvatarFactory.CODES.map((code) => {
      const name = code.charAt(0).toUpperCase() + code.slice(1);
      return { id: null, code, nameEs: name, nameEn: name };
    });
  }

  /** Makes a stage the current one (and measures it with ?debug). */
  private show(stage: Stage): void {
    this.stage = stage;
    this.stats?.dispose();
    this.stats = this.params.has("debug") ? new DebugStats(stage.scene) : null;
  }

  private hide(): void {
    this.stats?.dispose();
    this.stats = null;
    this.stage?.dispose();
    this.stage = null;
  }

  /** A new canvas for each stage (each one has its own engine), under the fade layer. */
  private createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.className = "experience-canvas";
    canvas.tabIndex = 0;
    canvas.setAttribute("aria-label", this.i18n.t("world.title"));
    this.root.replaceChildren(canvas, this.fade);
    canvas.focus();
    return canvas;
  }

  /** Fades the screen to dark (true) or back to the scene (false). */
  private setFaded(faded: boolean): Promise<void> {
    this.fade.classList.toggle("is-on", faded);
    return new Promise((resolve) => window.setTimeout(resolve, Experience.FADE_MS));
  }

  private showNotice(title: string, text?: string): void {
    this.hide();
    this.root.replaceChildren(this.notice(title, text));
  }

  private notice(title: string, text?: string): HTMLElement {
    const overlay = document.createElement("div");
    overlay.className = "experience-overlay";
    const card = document.createElement("div");
    card.className = "experience-card";
    const heading = document.createElement("h1");
    heading.textContent = title;
    card.append(heading);
    if (text) {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      card.append(paragraph);
    }
    overlay.append(card);
    return overlay;
  }

  private static initialLanguage(): Language {
    return VisitorSetupStore.loadLanguage() ?? (navigator.language.toLowerCase().startsWith("es") ? "es" : "en");
  }

  /** Phones and tablets: the tour needs a keyboard and a mouse. */
  private static isTouchOnly(): boolean {
    return window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(any-pointer: fine)").matches;
  }
}
