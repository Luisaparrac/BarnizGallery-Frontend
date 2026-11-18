import { VisitorSetupStore } from "../core/VisitorSetupStore";
import type { Language } from "../domain/common";
import { Localizer } from "../i18n/Localizer";
import { services } from "../services/ServiceRegistry";
import { Formatter } from "../utils/Formatter";
import { ExperienceUi, type UiSampleData } from "./ui/ExperienceUi";
import { World } from "./world/World";
import { WorldRoomsLoader } from "./world/WorldRoomsLoader";

/**
 * Entry point of the immersive 3D experience (index.html), without React.
 * For now it opens the plaza directly with the controls board; the lobby comes in a later step.
 */
export class Experience {
  private readonly i18n: Localizer;
  private readonly format: Formatter;
  private world: World | null = null;
  private ui: ExperienceUi | null = null;

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
    const debug = new URLSearchParams(window.location.search).has("debug");
    if (debug) (window as unknown as { museo?: World }).museo = this.world;
    const sample: UiSampleData | null = debug
      ? { catalogs: await services.catalog.getCatalogs().catch(() => null), photoUrl: data.rooms[0]?.pieces[0]?.photoUrl ?? null }
      : null;
    this.ui = new ExperienceUi(this.world, this.i18n, session?.user ?? null, sample);
    this.ui.start();
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
