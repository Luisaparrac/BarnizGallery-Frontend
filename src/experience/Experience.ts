import { VisitorSetupStore } from "../core/VisitorSetupStore";
import type { Language } from "../domain/common";
import { Localizer } from "../i18n/Localizer";
import { services } from "../services/ServiceRegistry";
import { Formatter } from "../utils/Formatter";
import { World } from "./world/World";
import { WorldRoomsLoader } from "./world/WorldRoomsLoader";

/**
 * Entry point of the immersive 3D experience (index.html), without React.
 * For now it opens the plaza directly; the lobby and the 3D panels come in the next steps.
 */
export class Experience {
  private readonly i18n: Localizer;
  private readonly format: Formatter;
  private world: World | null = null;

  constructor(private readonly root: HTMLElement) {
    const language = Experience.initialLanguage();
    document.documentElement.lang = language;
    this.i18n = new Localizer(language);
    this.format = new Formatter(language);
  }

  async start(): Promise<void> {
    if (Experience.isTouchOnly()) {
      this.showNotice(this.i18n.t("world.mobileTitle"), this.i18n.t("world.mobileText"));
      return;
    }
    this.showNotice(this.i18n.t("world.loading"));
    // The 3D interface draws text on textures, so the fonts must be ready first.
    await Promise.all([document.fonts.load('500 16px "Figtree"'), document.fonts.load('700 16px "Bricolage Grotesque"')]).catch(() => undefined);

    const session = await services.auth.restore().catch(() => null);
    const data = await new WorldRoomsLoader(this.i18n, this.format).load(session?.user ?? null);
    if (!data.rooms.length) {
      this.showNotice(this.i18n.t("world.empty"), this.i18n.t("world.emptyText"));
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.className = "experience-canvas";
    canvas.tabIndex = 0;
    canvas.setAttribute("aria-label", this.i18n.t("world.title"));
    this.root.replaceChildren(canvas);
    try {
      this.world = new World(canvas, data.rooms, new URLSearchParams(window.location.search).get("quality"));
    } catch {
      this.showNotice(this.i18n.t("world.noWebgl"));
      return;
    }
    if (new URLSearchParams(window.location.search).has("debug")) (window as unknown as { museo?: World }).museo = this.world;
    this.showEnterOverlay();
  }

  /** Temporary start screen until the lobby exists: one click locks the pointer and starts the walk. */
  private showEnterOverlay(): void {
    const overlay = this.notice(this.i18n.t("world.introTitle"), this.i18n.t("world.introText"));
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = this.i18n.t("world.enter");
    button.addEventListener("click", () => {
      overlay.remove();
      this.world?.setPlaying(true);
      this.world?.input.requestPointerLock();
    });
    overlay.querySelector(".experience-card")!.append(button);
    this.root.append(overlay);
  }

  private showNotice(title: string, text?: string): void {
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
