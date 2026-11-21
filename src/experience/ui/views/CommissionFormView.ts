import type { Id } from "../../../domain/common";
import type { CatalogItem, Catalogs } from "../../../domain/catalog";
import type { CustomRequestInput } from "../../../domain/customOrder";
import type { Localizer } from "../../../i18n/Localizer";
import { BoardFormView } from "../board/BoardFormView";
import type { BoardContext } from "../board/BoardView";
import type { SelectOption, UiField, UiNode } from "../kit/UiKit";

/** A new custom order: title, description, shape, style, colors, the budget offered and an optional date. */
export class CommissionFormView extends BoardFormView {
  private static readonly MIN_DESCRIPTION = 20;
  private static readonly ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

  override readonly size = "content" as const;
  readonly title: string;
  private name: UiField | null = null;
  private description: UiField | null = null;
  private shape: UiField | null = null;
  private style: UiField | null = null;
  private price: UiField | null = null;
  private date: UiField | null = null;
  private readonly colorIds: Id[] = [];

  constructor(
    i18n: Localizer,
    back: () => void,
    private readonly catalogs: Catalogs,
    private readonly save: (input: CustomRequestInput) => Promise<void>,
  ) {
    super(i18n, back);
    this.title = i18n.t("custom.newTitle");
  }

  protected fields({ kit }: BoardContext): UiNode {
    const column = kit.column("medium");
    column.add(kit.text(this.i18n.t("custom.formLead"), true));
    this.name = kit.field(this.i18n.t("custom.fieldTitle"), { placeholder: this.i18n.t("custom.titlePlaceholder") });
    this.description = kit.field(this.i18n.t("custom.fieldDescription"), { multiline: true, placeholder: this.i18n.t("custom.descriptionHint") });
    this.shape = kit.select(this.i18n.t("custom.fieldShape"), this.options(this.catalogs.shapes), "");
    this.style = kit.select(this.i18n.t("custom.fieldStyle"), this.options(this.catalogs.styles), "");
    column.add(this.name);
    column.add(this.description);
    column.add(this.shape);
    column.add(this.style);

    const colors = kit.column("small");
    colors.add(kit.text(this.i18n.t("taste.colors")));
    const swatches = kit.row("small");
    for (const color of this.catalogs.colors.filter((item) => item.isActive).sort((a, b) => a.sortOrder - b.sortOrder)) {
      swatches.add(
        kit.swatch(color.hex, this.i18n.name(color), false, (on) => {
          const index = this.colorIds.indexOf(color.id);
          if (on && index < 0) this.colorIds.push(color.id);
          if (!on && index >= 0) this.colorIds.splice(index, 1);
        }),
      );
    }
    colors.add(swatches);
    column.add(colors);

    this.price = kit.field(this.i18n.t("custom.fieldPrice"), { type: "number", placeholder: this.i18n.t("custom.priceHint") });
    this.date = kit.field(this.i18n.t("custom.fieldDateOptional"), { type: "date", min: CommissionFormView.today(), placeholder: this.i18n.t("custom.datePlaceholder") });
    column.add(this.price);
    column.add(this.date);
    this.submitOnEnter(this.name, this.price, this.date);
    return column;
  }

  protected submitLabel(): string {
    return this.i18n.t("custom.saveDraft");
  }

  protected override validate(): string | null {
    if (!this.name?.value.trim()) return this.i18n.t("lobby.missingFields");
    if ((this.description?.value.trim().length ?? 0) < CommissionFormView.MIN_DESCRIPTION) return this.i18n.t("custom.descriptionHint");
    if (!this.shape?.value) return this.i18n.t("custom.pickShape");
    if (!this.style?.value) return this.i18n.t("custom.pickStyle");
    if (!(Number(this.price?.value) > 0)) return this.i18n.t("custom.pricePositive");
    const date = this.date?.value.trim() ?? "";
    if (date && !CommissionFormView.validDate(date)) return this.i18n.t("custom.dateInvalid");
    return null;
  }

  protected send(): Promise<void> {
    return this.save({
      title: this.name!.value.trim(),
      description: this.description!.value.trim(),
      shapeId: Number(this.shape!.value),
      styleId: Number(this.style!.value),
      colorIds: [...this.colorIds],
      motifIds: [],
      sizeNotes: null,
      offeredPrice: Number(this.price!.value),
      desiredDate: this.date?.value.trim() || null,
      targetMasterId: null,
    });
  }

  /** The active entries of a catalog, in their order, after an empty "—" choice. */
  private options(items: CatalogItem[]): SelectOption[] {
    const active = items.filter((item) => item.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
    return [{ value: "", label: "—" }, ...active.map((item) => ({ value: String(item.id), label: this.i18n.name(item) }))];
  }

  /** An existing calendar day written YYYY-MM-DD, today or later. */
  private static validDate(text: string): boolean {
    if (!CommissionFormView.ISO_DATE.test(text)) return false;
    const [year, month, day] = text.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const exists = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
    return exists && text >= CommissionFormView.today();
  }

  /** Today in the visitor's time zone, as YYYY-MM-DD. */
  private static today(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }
}
