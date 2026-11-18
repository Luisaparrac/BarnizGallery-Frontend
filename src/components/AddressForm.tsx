import { useState, type FormEvent } from "react";
import type { Address, AddressInput } from "../domain/user";
import { useLocale } from "../state/LocaleContext";
import { COUNTRIES } from "../utils/countries";
import { Field } from "./Field";

const EMPTY: AddressInput = { recipientName: "", line1: "", line2: null, city: "", region: null, postalCode: null, countryCode: "US", phone: null, isDefault: false };

/** Shipping address form (used in checkout and in the profile). */
export function AddressForm({ initial, onSave, onCancel, busy }: { initial?: Address | null; onSave(address: AddressInput): void; onCancel?(): void; busy?: boolean }) {
  const { i18n, language } = useLocale();
  const [value, setValue] = useState<AddressInput>(initial ? { ...initial } : EMPTY);
  const set = (patch: Partial<AddressInput>) => setValue((current) => ({ ...current, ...patch }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave(value);
  };
  return (
    <form className="form-grid two" onSubmit={submit}>
      <Field label={i18n.t("address.recipient")}>
        <input required value={value.recipientName} onChange={(event) => set({ recipientName: event.target.value })} autoComplete="name" />
      </Field>
      <Field label={i18n.t("address.phone")}>
        <input value={value.phone ?? ""} onChange={(event) => set({ phone: event.target.value || null })} autoComplete="tel" />
      </Field>
      <Field label={i18n.t("address.line1")} wide>
        <input required value={value.line1} onChange={(event) => set({ line1: event.target.value })} autoComplete="address-line1" />
      </Field>
      <Field label={i18n.t("address.line2")} wide>
        <input value={value.line2 ?? ""} onChange={(event) => set({ line2: event.target.value || null })} autoComplete="address-line2" />
      </Field>
      <Field label={i18n.t("address.city")}>
        <input required value={value.city} onChange={(event) => set({ city: event.target.value })} autoComplete="address-level2" />
      </Field>
      <Field label={i18n.t("address.region")}>
        <input value={value.region ?? ""} onChange={(event) => set({ region: event.target.value || null })} autoComplete="address-level1" />
      </Field>
      <Field label={i18n.t("address.postalCode")}>
        <input value={value.postalCode ?? ""} onChange={(event) => set({ postalCode: event.target.value || null })} autoComplete="postal-code" />
      </Field>
      <Field label={i18n.t("address.country")}>
        <select value={value.countryCode} onChange={(event) => set({ countryCode: event.target.value })}>
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country[language]}
            </option>
          ))}
        </select>
      </Field>
      <label className="check field-wide">
        <input type="checkbox" checked={value.isDefault} onChange={(event) => set({ isDefault: event.target.checked })} /> {i18n.t("address.default")}
      </label>
      <div className="actions field-wide">
        {onCancel && (
          <button type="button" className="btn btn-quiet" onClick={onCancel}>
            {i18n.t("common.cancel")}
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {i18n.t("address.save")}
        </button>
      </div>
    </form>
  );
}

export function AddressText({ address }: { address: Omit<Address, "id" | "isDefault"> | null }) {
  const { language } = useLocale();
  if (!address) return <span>—</span>;
  const country = COUNTRIES.find((entry) => entry.code === address.countryCode)?.[language] ?? address.countryCode;
  return (
    <address className="address">
      {address.recipientName}
      <br />
      {address.line1}
      {address.line2 && (
        <>
          <br />
          {address.line2}
        </>
      )}
      <br />
      {[address.city, address.region, address.postalCode].filter(Boolean).join(", ")}
      <br />
      {country}
      {address.phone && (
        <>
          <br />
          {address.phone}
        </>
      )}
    </address>
  );
}
