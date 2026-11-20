import type { Id } from "../../../domain/common";
import type { Catalogs } from "../../../domain/catalog";
import type { CustomRequestInput } from "../../../domain/customOrder";
import type { Localizer } from "../../../i18n/Localizer";
import { BoardFormView } from "../board/BoardFormView";
import type { BoardContext } from "../board/BoardView";
import type { UiField, UiNode } from "../kit/UiKit";

/** A new custom order: title, description, shape, colors and the budget offered. */
export class CommissionFormView extends BoardFormView {
  private static readonly MIN_DESCRIPTION = 20;

  override readonly size = "content" as const;
  readonly title: string;
  private name: UiField | null = null;
  private description: UiField | null = null;
  private shape: UiField | null = null;
  private price: UiField | null = null;
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
    const shapes = this.catalogs.shapes.filter((shape) => shape.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
    this.shape = kit.select(this.i18n.t("custom.fieldShape"), [{ value: "", label: "—" }, ...shapes.map((shape) => ({ value: String(shape.id), label: this.i18n.name(shape) }))], "");
    column.add(this.name);
    column.add(this.description);
    column.add(this.shape);

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
    column.add(this.price);
    this.submitOnEnter(this.name, this.price);
    return column;
  }

  protected submitLabel(): string {
    return this.i18n.t("custom.saveDraft");
  }

  protected override validate(): string | null {
    if (!this.name?.value.trim()) return this.i18n.t("lobby.missingFields");
    if ((this.description?.value.trim().length ?? 0) < CommissionFormView.MIN_DESCRIPTION) return this.i18n.t("custom.descriptionHint");
    return null;
  }

  protected send(): Promise<void> {
    const price = Number(this.price?.value);
    const shape = this.shape?.value;
    return this.save({
      title: this.name!.value.trim(),
      description: this.description!.value.trim(),
      shapeId: shape ? Number(shape) : null,
      styleId: null,
      colorIds: [...this.colorIds],
      motifIds: [],
      sizeNotes: null,
      offeredPrice: price > 0 ? price : null,
      desiredDate: null,
      targetMasterId: null,
    });
  }
}
