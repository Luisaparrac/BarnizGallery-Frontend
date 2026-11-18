import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AddressText } from "../../components/AddressForm";
import { ContactMasterModal, type ContactTarget } from "../../components/ContactMasterModal";
import { ErrorNote, Loading, Note } from "../../components/Feedback";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { useErrorText } from "../../hooks/useErrorText";
import { services } from "../../services/ServiceRegistry";
import { useLocale } from "../../state/LocaleContext";
import { useToast } from "../../state/ToastContext";
import { PaymentRedirect } from "./PaymentRedirect";

export function OrderPage() {
  const { id = "" } = useParams();
  const { i18n, format } = useLocale();
  const navigate = useNavigate();
  const toast = useToast();
  const errorText = useErrorText();
  const data = useAsync(async () => {
    const order = await services.commerce.getOrder(Number(id));
    const stores = await services.gallery.listStores();
    return { order, stores };
  }, [id]);
  const [busy, setBusy] = useState(false);
  const [contact, setContact] = useState<ContactTarget | null>(null);

  if (data.loading && !data.data) return <Loading />;
  if (data.error !== null || !data.data) return <div className="container"><ErrorNote error={data.error} /></div>;
  const { order, stores } = data.data;

  const pay = async () => {
    setBusy(true);
    try {
      const payment = await services.commerce.startPayment(order.id);
      PaymentRedirect.go(payment.checkoutUrl, navigate);
    } catch (error) {
      toast.show(errorText(error), "error");
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!window.confirm(i18n.t("order.cancelConfirm"))) return;
    try {
      data.setData({ ...data.data!, order: await services.commerce.cancelOrder(order.id) });
    } catch (error) {
      toast.show(errorText(error), "error");
    }
  };

  return (
    <div className="container narrow">
      <PageHeader
        title={i18n.t("order.title", { code: order.code })}
        lead={
          <>
            {i18n.tx(`status.orderType.${order.type}`)} — {format.date(order.createdAt)} <StatusBadge kind="order" value={order.status} />
          </>
        }
      />
      {order.status === "PENDING_PAYMENT" && (
        <Note tone="warn">
          {order.paymentDueAt ? i18n.t("order.payBefore", { date: format.dateTime(order.paymentDueAt) }) : i18n.t("order.waitingPayment")}
          <div className="actions">
            {order.type === "PURCHASE" && (
              <button type="button" className="btn btn-quiet" onClick={() => void cancel()}>
                {i18n.t("order.cancel")}
              </button>
            )}
            <button type="button" className="btn btn-primary" disabled={busy || !order.shippingAddress && order.shippingCost > 0} onClick={() => void pay()}>
              {i18n.t("order.payNow", { amount: format.money(order.total, order.currency) })}
            </button>
          </div>
          {!order.shippingAddress && order.shippingCost > 0 && (
            <p>
              {i18n.t("order.needsAddress")} <Link to="/account/profile">{i18n.t("nav.profile")}</Link>
            </p>
          )}
        </Note>
      )}
      <section className="block">
        <h2 className="h3">{i18n.t("order.items")}</h2>
        <ul className="order-items">
          {order.items.map((item) => {
            const store = stores.find((entry) => entry.store.id === item.storeId);
            return (
              <li key={item.id}>
                <div>
                  <strong>{item.description}</strong>
                  <span className="muted">
                    {item.storeName} {item.quantity > 1 && `· × ${item.quantity}`}
                  </span>
                  {item.trackingNumber && (
                    <span>
                      {i18n.t("order.tracking", { carrier: item.carrier ?? "", number: item.trackingNumber })}
                    </span>
                  )}
                </div>
                <StatusBadge kind="fulfillment" value={item.fulfillmentStatus} />
                <span>{format.money(item.lineTotal, order.currency)}</span>
                {store && (
                  <button type="button" className="btn btn-link" onClick={() => setContact({ masterId: store.master.id, masterName: store.master.name, subject: `${order.code} — ${item.description}`, orderId: order.id })}>
                    {i18n.t("order.contactArtisan")}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <ul className="summary-list">
          <li>
            <span>{i18n.t("order.subtotal")}</span>
            <span>{format.money(order.subtotal, order.currency)}</span>
          </li>
          <li>
            <span>{i18n.t("order.shipping")}</span>
            <span>{format.money(order.shippingCost, order.currency)}</span>
          </li>
          <li className="summary-total">
            <span>{i18n.t("order.total")}</span>
            <span>{format.money(order.total, order.currency)}</span>
          </li>
        </ul>
      </section>
      <div className="two-col">
        <section className="block">
          <h2 className="h3">{i18n.t("checkout.address")}</h2>
          <AddressText address={order.shippingAddress} />
        </section>
        <section className="block">
          <h2 className="h3">{i18n.t("order.history")}</h2>
          <ol className="timeline">
            {order.history.map((change, index) => (
              <li key={index}>
                <StatusBadge kind="order" value={change.toStatus} />
                <span className="muted">{format.dateTime(change.changedAt)}</span>
                {change.note && <span>{change.note}</span>}
              </li>
            ))}
          </ol>
        </section>
      </div>
      <ContactMasterModal target={contact} onClose={() => setContact(null)} />
    </div>
  );
}
