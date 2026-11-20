import type { Id } from "../../../domain/common";
import type { Catalogs } from "../../../domain/catalog";
import type { TasteProfile } from "../../../domain/taste";
import type { Localizer } from "../../../i18n/Localizer";
import { BoardView, type BoardContext } from "../board/BoardView";
import { ErrorText } from "../ErrorText";
import type { UiButton, UiKit, UiNode, UiOption, UiText } from "../kit/UiKit";

/**
 * The welcome kiosk's questionnaire: colors (swatches), shapes, style and figures (chips, several
 * at a time) and a budget (one). Saving lights up the salas that match best.
 */
export class TasteView extends BoardView {
  readonly size = "content" as const;
  readonly title: string;
  private readonly picked: TasteProfile;
  private error: UiText | null = null;
  private saveButton: UiButton | null = null;

  constructor(
    private readonly i18n: Localizer,
    private readonly catalogs: Catalogs,
    current: TasteProfile | null,
    private readonly save: (taste: TasteProfile) => Promise<void>,
  ) {
    super();
    this.title = i18n.t("welcome.tasteTitle");
    this.picked = current
      ? { ...current, colorIds: [...current.colorIds], shapeIds: [...current.shapeIds], styleIds: [...current.styleIds], motifIds: [...current.motifIds] }
      : { colorIds: [], shapeIds: [], styleIds: [], motifIds: [], budgetRangeId: null };
  }

  content({ kit }: BoardContext): UiNode {
    const column = kit.column("large");
    column.add(kit.text(this.i18n.t("welcome.tasteLead"), true));

    const colors = kit.row("small");
    for (const color of this.active(this.catalogs.colors)) {
      colors.add(kit.swatch(color.hex, this.i18n.name(color), this.picked.colorIds.includes(color.id), (on) => this.toggle(this.picked.colorIds, color.id, on)));
    }
    column.add(this.section(kit, this.i18n.t("taste.colors"), this.i18n.t("taste.multiHint"), colors));
    column.add(this.chips(kit, this.i18n.t("taste.shapes"), this.catalogs.shapes, this.picked.shapeIds));
    column.add(this.chips(kit, this.i18n.t("taste.styles"), this.catalogs.styles, this.picked.styleIds));
    column.add(this.chips(kit, this.i18n.t("taste.motifs"), this.catalogs.motifs, this.picked.motifIds));

    // The budget: chips too, but only one can be on.
    const budgets = kit.row("small");
    const toggles: UiOption[] = [];
    for (const budget of this.active(this.catalogs.budgets)) {
      const chip = kit.chip(this.i18n.name(budget), this.picked.budgetRangeId === budget.id, (on) => {
        this.picked.budgetRangeId = on ? budget.id : null;
        toggles.forEach((other) => other !== chip && other.setSelected(false));
      });
      toggles.push(chip);
      budgets.add(chip);
    }
    column.add(this.section(kit, this.i18n.t("taste.budget"), this.i18n.t("taste.budgetHint"), budgets));

    this.error = kit.note("", "error");
    this.error.setVisible(false);
    column.add(this.error);
    return column;
  }

  override actions({ kit }: BoardContext): UiButton[] {
    this.saveButton = kit.button(this.i18n.t("welcome.seeRecommendations"), () => void this.send());
    return [this.saveButton];
  }

  private chips(kit: UiKit, title: string, items: { id: Id; nameEs: string; nameEn: string; isActive: boolean; sortOrder: number }[], ids: Id[]): UiNode {
    const row = kit.row("small");
    for (const item of this.active(items)) row.add(kit.chip(this.i18n.name(item), ids.includes(item.id), (on) => this.toggle(ids, item.id, on)));
    return this.section(kit, title, null, row);
  }

  private section(kit: UiKit, title: string, hint: string | null, body: UiNode): UiNode {
    const block = kit.column("small");
    block.add(kit.text(title));
    if (hint) block.add(kit.note(hint));
    block.add(body);
    return block;
  }

  private active<T extends { isActive: boolean; sortOrder: number }>(items: T[]): T[] {
    return items.filter((item) => item.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  private toggle(ids: Id[], id: Id, on: boolean): void {
    const index = ids.indexOf(id);
    if (on && index < 0) ids.push(id);
    if (!on && index >= 0) ids.splice(index, 1);
  }

  private async send(): Promise<void> {
    this.saveButton?.setEnabled(false);
    this.error?.setVisible(false);
    try {
      await this.save(this.picked);
    } catch (error) {
      this.error?.setText(ErrorText.of(this.i18n, error));
      this.error?.setVisible(true);
      this.saveButton?.setEnabled(true);
    }
  }
}
