import { Control } from "@babylonjs/gui";
import type { Catalogs } from "../../../domain/catalog";
import type { Localizer } from "../../../i18n/Localizer";
import { PanelView, type PanelContext } from "../PanelView";
import type { Field, Toggle } from "../UiKit";
import { UiTheme } from "../UiTheme";

/** Debug view (?debug) with every UiKit piece, to check them on the board. */
export class UiKitSampleView extends PanelView {
  readonly title: string;
  private field: Field | null = null;
  private readonly toggles: Toggle[] = [];
  private result: ((text: string) => void) | null = null;

  constructor(
    private readonly i18n: Localizer,
    private readonly catalogs: Catalogs | null,
    private readonly photoUrl: string | null,
  ) {
    super();
    this.title = i18n.t("uiDemo.title");
  }

  protected content({ kit }: PanelContext, width: number): Control {
    const imageWidth = 420;
    const leftWidth = width - imageWidth - UiTheme.panel.gap * 2;
    const columns = kit.row(UiTheme.panel.gap * 2);
    columns.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;

    const left = kit.column();
    left.widthInPixels = leftWidth;
    const intro = kit.text(this.i18n.t("uiDemo.text"), { muted: true });
    left.addControl(intro);
    const fields = kit.row();
    fields.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.field = kit.field(this.i18n.t("uiDemo.field"), { placeholder: this.i18n.t("uiDemo.placeholder"), width: (leftWidth - UiTheme.panel.gap) / 2 });
    fields.addControl(this.field.control);
    fields.addControl(kit.field(this.i18n.t("uiDemo.password"), { password: true, width: (leftWidth - UiTheme.panel.gap) / 2 }).control);
    left.addControl(fields);

    left.addControl(this.caption(kit.text(this.i18n.t("uiDemo.chips"), { small: true, muted: true })));
    const chips = kit.row(12);
    chips.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    for (const shape of this.catalogs?.shapes.slice(0, 5) ?? []) {
      const chip = kit.chip(this.i18n.name(shape), false, () => undefined);
      this.toggles.push(chip);
      chips.addControl(chip.control);
    }
    left.addControl(chips);

    left.addControl(this.caption(kit.text(this.i18n.t("uiDemo.colors"), { small: true, muted: true })));
    const swatches = kit.row(10);
    swatches.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    for (const color of this.catalogs?.colors.slice(0, 9) ?? []) {
      const swatch = kit.swatch(color.hex, false, () => undefined);
      this.toggles.push(swatch);
      swatches.addControl(swatch.control);
    }
    left.addControl(swatches);

    const resultText = kit.text("", { small: true });
    this.result = (text) => (resultText.text = text);
    left.addControl(resultText);
    columns.addControl(left);

    const right = kit.column(10);
    right.widthInPixels = imageWidth;
    right.addControl(kit.text(this.i18n.t("uiDemo.image"), { small: true, muted: true }));
    if (this.photoUrl) right.addControl(kit.image(this.photoUrl, imageWidth, imageWidth));
    columns.addControl(right);
    return columns;
  }

  protected actions({ kit }: PanelContext): Control[] {
    return [
      kit.button(
        this.i18n.t("uiDemo.try"),
        () => this.result?.(this.i18n.t("uiDemo.result", { value: this.field?.input.text ?? "", count: this.toggles.filter((toggle) => toggle.selected).length })),
        "primary",
        260,
      ),
    ];
  }

  private caption(control: Control): Control {
    control.paddingTopInPixels = 8;
    return control;
  }
}
