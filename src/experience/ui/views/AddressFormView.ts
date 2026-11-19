import { Control } from "@babylonjs/gui";
import type { Address, AddressInput } from "../../../domain/user";
import type { Localizer } from "../../../i18n/Localizer";
import type { PanelContext } from "../PanelView";
import type { Field } from "../UiKit";
import { UiTheme } from "../UiTheme";
import { FormView } from "./FormView";

/** A shipping address in two columns: a new one (the first becomes the main one) or one being edited. */
export class AddressFormView extends FormView {
  readonly title: string;
  private readonly inputs = new Map<keyof AddressInput, Field>();

  constructor(
    i18n: Localizer,
    back: () => void,
    private readonly recipient: string,
    private readonly makeDefault: boolean,
    private readonly save: (address: AddressInput) => Promise<void>,
    private readonly initial: Address | null = null,
  ) {
    super(i18n, back);
    this.title = initial ? i18n.t("shop.editAddress") : i18n.t("checkout.newAddress");
  }

  protected fields({ kit }: PanelContext, width: number): Control {
    const half = (width - UiTheme.panel.gap * 2) / 2;
    const start = (key: keyof AddressInput, fallback: string) => String(this.initial?.[key] ?? fallback);
    const layout: [keyof AddressInput, string, string][][] = [
      [
        ["recipientName", this.i18n.t("address.recipient"), start("recipientName", this.recipient)],
        ["phone", this.i18n.t("address.phone"), start("phone", "")],
      ],
      [
        ["line1", this.i18n.t("address.line1"), start("line1", "")],
        ["line2", this.i18n.t("address.line2"), start("line2", "")],
      ],
      [
        ["city", this.i18n.t("address.city"), start("city", "")],
        ["region", this.i18n.t("address.region"), start("region", "")],
      ],
      [
        ["postalCode", this.i18n.t("address.postalCode"), start("postalCode", "")],
        ["countryCode", this.i18n.t("address.country"), start("countryCode", "CO")],
      ],
    ];
    const column = kit.column(10);
    for (const pair of layout) {
      const row = kit.row(UiTheme.panel.gap * 2);
      row.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      for (const [key, label, value] of pair) {
        const field = kit.field(label, { width: half, value });
        this.inputs.set(key, field);
        row.addControl(field.control);
      }
      column.addControl(row);
    }
    this.submitOnEnter(...[...this.inputs.values()].map((field) => field.input));
    return column;
  }

  protected submitLabel(): string {
    return this.i18n.t("address.save");
  }

  protected override validate(): string | null {
    const required: (keyof AddressInput)[] = ["recipientName", "line1", "city", "countryCode"];
    return required.every((key) => this.value(key)) ? null : this.i18n.t("shop.missingAddress");
  }

  protected submit(): Promise<void> {
    const optional = (key: keyof AddressInput) => this.value(key) || null;
    return this.save({
      recipientName: this.value("recipientName"),
      phone: optional("phone"),
      line1: this.value("line1"),
      line2: optional("line2"),
      city: this.value("city"),
      region: optional("region"),
      postalCode: optional("postalCode"),
      countryCode: this.value("countryCode").toUpperCase(),
      isDefault: this.initial?.isDefault ?? this.makeDefault,
    });
  }

  private value(key: keyof AddressInput): string {
    return this.inputs.get(key)?.input.text.trim() ?? "";
  }
}
