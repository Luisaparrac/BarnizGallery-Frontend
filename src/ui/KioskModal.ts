import { Signal } from "../core/Signal";
import { ApiError } from "../api/ApiError";
import type { SavedVisitor } from "../api/VisitorSession";
import { TasteOptions, type TasteOption } from "../i18n/TasteOptions";
import { LocaleService, t } from "../i18n/LocaleService";
import type { CameraMode, Language, RecommendationOutcome, TasteSubmission } from "../model/models";
import { h } from "./dom";
import { RecommendationList } from "./RecommendationList";

export type SubmitHandler = (submission: TasteSubmission) => Promise<RecommendationOutcome>;

export interface KioskResult {
  outcome: RecommendationOutcome;
  language: Language;
  cameraMode: CameraMode;
}

/** Welcome-kiosk dialog: taste questionnaire, then the recommended salas. Emits `closed` once. */
export class KioskModal {
  /** Emits the result, or null when the visitor closed the form without submitting. */
  readonly closed = new Signal<KioskResult | null>();

  private readonly backdrop = h("div.backdrop");
  private readonly card = h("div.modal");
  private readonly colors: Set<string>;
  private readonly types: Set<string>;
  private readonly styles: Set<string>;
  private budget: string;
  private result: KioskResult | null = null;
  private readonly unsubscribers: Array<() => void> = [];
  private draft = { name: "", email: "", country: "" };
  private readonly onKey = (event: KeyboardEvent): void => {
    if (event.code !== "Escape") return;
    event.stopPropagation();
    this.close();
  };
  private readonly onLanguage = (): void => {
    if (!this.result) this.renderForm();
  };

  constructor(
    private readonly root: HTMLElement,
    private readonly submit: SubmitHandler,
    private cameraMode: CameraMode,
    saved: SavedVisitor | null,
    private readonly persist: (data: SavedVisitor) => void,
  ) {
    this.colors = new Set(saved?.profile.preferredColors ?? []);
    this.types = new Set(saved?.profile.preferredTypes ?? []);
    this.styles = new Set(saved?.profile.preferredStyles ?? []);
    this.budget = saved?.profile.budgetRange ?? "";
    this.draft = { name: saved?.name ?? "", email: saved?.email ?? "", country: saved?.country ?? "" };
  }

  open(): void {
    this.backdrop.append(this.card);
    this.root.append(this.backdrop);
    requestAnimationFrame(() => this.backdrop.classList.add("on"));
    window.addEventListener("keydown", this.onKey, true);
    this.unsubscribers.push(LocaleService.instance.changed.subscribe(this.onLanguage));
    this.renderForm();
  }

  private close(): void {
    this.backdrop.classList.remove("on");
    window.removeEventListener("keydown", this.onKey, true);
    this.unsubscribers.forEach((off) => off());
    window.setTimeout(() => this.backdrop.remove(), 200);
    this.closed.emit(this.result);
  }

  private renderForm(error = ""): void {
    const name = h("input", { type: "text", name: "name", autocomplete: "name", maxLength: 100, value: this.draft.name });
    const email = h("input", { type: "email", name: "email", autocomplete: "email", maxLength: 150, value: this.draft.email });
    const country = h("input", { type: "text", name: "country", autocomplete: "country-name", maxLength: 100, value: this.draft.country });
    const remember = (): void => {
      this.draft = { name: name.value, email: email.value, country: country.value };
    };
    [name, email, country].forEach((input) => input.addEventListener("input", remember));

    const submitButton = h("button.cta", { type: "submit", textContent: t("submit") });
    const form = h(
      "form.kiosk-form",
      {
        noValidate: true,
        onsubmit: (event: Event) => {
          event.preventDefault();
          remember();
          if (!this.draft.name.trim() || !this.draft.email.trim()) return this.renderForm(t("err_required"));
          if (!/^\S+@\S+\.\S+$/.test(this.draft.email.trim())) return this.renderForm(t("err_email"));
          submitButton.disabled = true;
          submitButton.textContent = t("sending");
          void this.send();
        },
      },
      h("div.grid2", {}, this.field(t("f_name"), name), this.field(t("f_email"), email)),
      h("div.grid2", {}, this.field(t("f_country"), country), this.field(t("f_lang"), this.languageSegment())),
      this.field(t("f_camera"), this.cameraSegment()),
      this.field(t("f_colors"), this.chips(TasteOptions.colors, this.colors)),
      this.field(t("f_types"), this.chips(TasteOptions.types, this.types)),
      this.field(t("f_styles"), this.chips(TasteOptions.styles, this.styles)),
      this.field(t("f_budget"), this.budgetChips()),
      h("p.error", { textContent: error }),
      h("div.actions", {}, h("button.ghost", { type: "button", textContent: t("close"), onclick: () => this.close() }), submitButton),
    );
    this.card.replaceChildren(h("h2", { textContent: t("kiosk_title") }), h("p.sub", { textContent: t("kiosk_sub") }), form);
  }

  private async send(): Promise<void> {
    const language = LocaleService.instance.language;
    const submission: TasteSubmission = {
      name: this.draft.name.trim(),
      email: this.draft.email.trim(),
      country: this.draft.country.trim(),
      language,
      cameraMode: this.cameraMode,
      profile: {
        preferredColors: [...this.colors],
        preferredTypes: [...this.types],
        preferredStyles: [...this.styles],
        budgetRange: this.budget,
      },
    };
    this.persist({ name: submission.name, email: submission.email, country: submission.country, profile: submission.profile });
    try {
      const outcome = await this.submit(submission);
      this.result = { outcome, language, cameraMode: this.cameraMode };
      this.renderResults();
    } catch (error) {
      const message = error instanceof ApiError || error instanceof Error ? error.message : String(error);
      this.renderForm(t("err_api", { m: message }));
    }
  }

  private renderResults(): void {
    if (!this.result) return;
    const list = new RecommendationList(this.result.outcome.recommendations, this.result.outcome.isDemo);
    this.unsubscribers.push(LocaleService.instance.changed.subscribe(() => list.refresh()));
    this.card.replaceChildren(list.element, h("div.actions", {}, h("button.cta", { type: "button", textContent: t("close"), onclick: () => this.close() })));
  }

  private field(label: string, input: HTMLElement): HTMLElement {
    return h("label.field", {}, h("span", { textContent: label }), input);
  }

  private languageSegment(): HTMLElement {
    const current = LocaleService.instance.language;
    return h(
      "div.seg",
      {},
      ...(["es", "en"] as Language[]).map((language) => {
        const button = h("button", { type: "button", textContent: language === "es" ? "Español" : "English", onclick: () => LocaleService.instance.setLanguage(language) });
        button.classList.toggle("on", language === current);
        return button;
      }),
    );
  }

  private cameraSegment(): HTMLElement {
    const segment = h("div.seg");
    (["THIRD_PERSON", "FIRST_PERSON"] as CameraMode[]).forEach((mode) => {
      const button = h("button", { type: "button", textContent: mode === "FIRST_PERSON" ? t("cam_first") : t("cam_third") });
      button.classList.toggle("on", mode === this.cameraMode);
      button.addEventListener("click", () => {
        this.cameraMode = mode;
        segment.querySelectorAll("button").forEach((other) => other.classList.toggle("on", other === button));
      });
      segment.append(button);
    });
    return segment;
  }

  private chips(options: readonly TasteOption[], selected: Set<string>): HTMLElement {
    return h(
      "div.chips",
      {},
      ...options.map((option) => {
        const button = h("button.chip", { type: "button", textContent: LocaleService.instance.pick(option.labels.es, option.labels.en) });
        button.classList.toggle("on", selected.has(option.value));
        button.addEventListener("click", () => {
          if (!selected.delete(option.value)) selected.add(option.value);
          button.classList.toggle("on");
        });
        return button;
      }),
    );
  }

  private budgetChips(): HTMLElement {
    const container = h("div.chips");
    TasteOptions.budgets.forEach((option) => {
      const button = h("button.chip", { type: "button", textContent: LocaleService.instance.pick(option.labels.es, option.labels.en) });
      button.classList.toggle("on", this.budget === option.value);
      button.addEventListener("click", () => {
        this.budget = option.value;
        container.querySelectorAll(".chip").forEach((other) => other.classList.toggle("on", other === button));
      });
      container.append(button);
    });
    return container;
  }
}
