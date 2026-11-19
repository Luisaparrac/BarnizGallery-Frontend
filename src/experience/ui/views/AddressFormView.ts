import type { Language } from "../../../domain/common";
import type { Address, AddressInput } from "../../../domain/user";
import type { Localizer } from "../../../i18n/Localizer";
import { COUNTRIES } from "../../../utils/countries";
import { BoardFormView } from "../board/BoardFormView";
import type { BoardContext } from "../board/BoardView";
import type { UiField, UiNode } from "../kit/UiKit";

type TextKey = Exclude<keyof AddressInput, "isDefault" | "countryCode">;

/**
 * A shipping address: a new one (the first becomes the main one) or one being edited. The
 * fields carry the browser's address autocomplete hints.
 */
export class AddressFormView extends BoardFormView {
  private static readonly FIELDS: [TextKey, string, string][] = [
    ["recipientName", "address.recipient", "name"],
    ["phone", "address.phone", "tel"],
    ["line1", "address.line1", "address-line1"],
    ["line2", "address.line2", "address-line2"],
    ["city", "address.city", "address-level2"],
    ["region", "address.region", "address-level1"],
    ["postalCode", "address.postalCode", "postal-code"],
  ];

  readonly title: string;
  private readonly inputs = new Map<TextKey, UiField>();
  private country: UiField | null = null;

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

  protected fields({ kit }: BoardContext): UiNode {
    const column = kit.column("medium");
    for (const [key, label, autocomplete] of AddressFormView.FIELDS) {
      const start = this.initial?.[key] ?? (key === "recipientName" ? this.recipient : "");
      const field = kit.field(this.i18n.tx(label), { value: start ?? "", autocomplete, type: key === "phone" ? "tel" : "text" });
      this.inputs.set(key, field);
      column.add(field);
    }
    const language = this.i18n.language as Language;
    const countries = [...COUNTRIES].sort((a, b) => a[language].localeCompare(b[language])).map((country) => ({ value: country.code, label: country[language] }));
    this.country = kit.select(this.i18n.t("address.country"), countries, this.initial?.countryCode ?? "CO");
    column.add(this.country);
    this.submitOnEnter(...this.inputs.values());
    return column;
  }

  protected submitLabel(): string {
    return this.i18n.t("address.save");
  }

  protected override validate(): string | null {
    const required: TextKey[] = ["recipientName", "line1", "city"];
    return required.every((key) => this.value(key)) && this.country?.value ? null : this.i18n.t("shop.missingAddress");
  }

  protected send(): Promise<void> {
    const optional = (key: TextKey) => this.value(key) || null;
    return this.save({
      recipientName: this.value("recipientName"),
      phone: optional("phone"),
      line1: this.value("line1"),
      line2: optional("line2"),
      city: this.value("city"),
      region: optional("region"),
      postalCode: optional("postalCode"),
      countryCode: this.country!.value,
      isDefault: this.initial?.isDefault ?? this.makeDefault,
    });
  }

  private value(key: TextKey): string {
    return this.inputs.get(key)?.value.trim() ?? "";
  }
}
