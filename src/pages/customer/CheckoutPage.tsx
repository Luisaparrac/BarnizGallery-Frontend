import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AddressForm, AddressText } from "../../components/AddressForm";
import { ErrorNote, Loading, Note } from "../../components/Feedback";
import { Field } from "../../components/Field";
import { PageHeader } from "../../components/PageHeader";
import { AppEvents } from "../../core/AppEvents";
import type { Id } from "../../domain/common";
import type { AddressInput } from "../../domain/user";
import { useAsync } from "../../hooks/useAsync";
import { useCatalogs } from "../../state/CatalogContext";
import { useErrorText } from "../../hooks/useErrorText";
import { services } from "../../services/ServiceRegistry";
import { useLocale } from "../../state/LocaleContext";
import { useToast } from "../../state/ToastContext";
import { PaymentRedirect } from "./PaymentRedirect";

/** Address, summary and payment start. The order is created here and the gateway takes over. */
export function CheckoutPage() {
  const { i18n, format } = useLocale();
  const navigate = useNavigate();
  const toast = useToast();
  const errorText = useErrorText();
  const data = useAsync(async () => {
    const [cart, addresses] = await Promise.all([services.commerce.getCart(), services.profile.listAddresses()]);
    return { cart, addresses };
  }, []);
  const [addressId, setAddressId] = useState<Id | null>(null);
  const [adding, setAdding] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const shipping = Number(useCatalogs().setting("commerce.shipping_flat_cost", 25));

  useEffect(() => {
    if (data.data && addressId === null) setAddressId(data.data.addresses.find((address) => address.isDefault)?.id ?? data.data.addresses[0]?.id ?? null);
    if (data.data && !data.data.addresses.length) setAdding(true);
  }, [data.data, addressId]);

  if (data.loading && !data.data) return <Loading />;
  if (data.error !== null) return <div className="container"><ErrorNote error={data.error} /></div>;
  const { cart, addresses } = data.data!;
  if (!cart.items.length) {
    navigate("/cart", { replace: true });
    return null;
  }

  const saveAddress = async (input: AddressInput) => {
    try {
      const saved = await services.profile.saveAddress(input);
      await data.reload();
      setAddressId(saved.id);
      setAdding(false);
    } catch (error) {
      toast.show(errorText(error), "error");
    }
  };

  const pay = async () => {
    if (!addressId) return;
    setBusy(true);
    try {
      const order = await services.commerce.checkout({ addressId, notes: notes || undefined });
      AppEvents.cartChanged.emit();
      const payment = await services.commerce.startPayment(order.id);
      PaymentRedirect.go(payment.checkoutUrl, navigate);
    } catch (error) {
      toast.show(errorText(error), "error");
      setBusy(false);
    }
  };

  return (
    <div className="container narrow">
      <PageHeader title={i18n.t("checkout.title")} />
      <section className="block">
        <h2 className="h3">{i18n.t("checkout.address")}</h2>
        {addresses.length > 0 && !adding && (
          <div className="address-choice">
            {addresses.map((address) => (
              <label key={address.id} className={`address-option${addressId === address.id ? " is-on" : ""}`}>
                <input type="radio" name="address" checked={addressId === address.id} onChange={() => setAddressId(address.id)} />
                <AddressText address={address} />
              </label>
            ))}
            <button type="button" className="btn btn-link" onClick={() => setAdding(true)}>
              {i18n.t("checkout.newAddress")}
            </button>
          </div>
        )}
        {adding && <AddressForm onSave={(input) => void saveAddress(input)} onCancel={addresses.length ? () => setAdding(false) : undefined} />}
      </section>
      <section className="block">
        <h2 className="h3">{i18n.t("checkout.summary")}</h2>
        <ul className="summary-list">
          {cart.items.map((item) => (
            <li key={item.artworkId}>
              <span>
                {i18n.pick(item.title, item.titleEn)} {item.quantity > 1 && `× ${item.quantity}`}
              </span>
              <span>{format.money(item.unitPrice * item.quantity, item.currency)}</span>
            </li>
          ))}
          <li>
            <span>{i18n.t("order.shipping")}</span>
            <span>{format.money(shipping, cart.currency)}</span>
          </li>
          <li className="summary-total">
            <span>{i18n.t("order.total")}</span>
            <span>{format.money(cart.subtotal + shipping, cart.currency)}</span>
          </li>
        </ul>
        <Field label={i18n.t("checkout.notes")} wide>
          <textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>
        <Note>{i18n.t("checkout.reservation")}</Note>
      </section>
      <div className="actions">
        <button type="button" className="btn btn-primary btn-large" disabled={busy || !addressId || adding} onClick={() => void pay()}>
          {busy ? i18n.t("checkout.creating") : i18n.t("checkout.pay")}
        </button>
      </div>
    </div>
  );
}
