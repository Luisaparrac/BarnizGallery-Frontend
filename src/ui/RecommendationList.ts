import { LocaleService, t } from "../i18n/LocaleService";
import type { Recommendation } from "../model/models";
import { h } from "./dom";
import { UiComponent } from "./UiComponent";

/** Ranked list of suggested salas with a score bar. */
export class RecommendationList extends UiComponent {
  readonly element = h("div.rec-list");

  constructor(
    private readonly recommendations: readonly Recommendation[],
    private readonly isDemo: boolean,
  ) {
    super();
    this.refresh();
  }

  refresh(): void {
    const locale = LocaleService.instance;
    const items = this.recommendations.slice(0, 6).map((rec) =>
      h(
        "li",
        {},
        h("div.rec-head", {}, h("strong", { textContent: locale.pick(rec.roomNameEs, rec.roomNameEn) }), h("span.score", { textContent: `${Math.round(Number(rec.score))}%` })),
        h("div.bar", {}, h("i", { style: `width:${Math.min(100, Math.max(2, Number(rec.score)))}%` })),
        this.reasonOf(rec) ? h("p", { textContent: this.reasonOf(rec) }) : null,
      ),
    );
    this.element.replaceChildren(
      h("h2", { textContent: t("rec_title") }),
      h("p.sub", { className: this.isDemo ? "sub warn" : "sub", textContent: this.isDemo ? t("rec_demo") : t("rec_walk") }),
      items.length ? h("ol.recs", {}, ...items) : h("p.sub", { textContent: t("rec_none") }),
    );
  }

  private reasonOf(rec: Recommendation): string {
    if (!rec.reason.startsWith("demo:")) return rec.reason;
    const matches = rec.reason.slice(5);
    return matches ? `${LocaleService.instance.pick("Coincide en", "Matches")}: ${matches}` : "";
  }
}
