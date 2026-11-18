import { useState, type FormEvent } from "react";
import { AddressText } from "../../components/AddressForm";
import { EmptyState, ErrorNote, Loading } from "../../components/Feedback";
import { Field } from "../../components/Field";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import type { ArtisanOrderItem } from "../../domain/commerce";
import { useAsync } from "../../hooks/useAsync";
import { useErrorText } from "../../hooks/useErrorText";
import { services } from "../../services/ServiceRegistry";
import { useLocale } from "../../state/LocaleContext";
import { useToast } from "../../state/ToastContext";

/** Paid items of the store: prepare, ship with tracking, mark delivered, and ask for the balance of custom pieces. */
export function ArtisanOrdersPage() {
  const { i18n, format } = useLocale();
  const toast = useToast();
  const errorText = useErrorText();
  const items = useAsync(() => services.artisan.listOrderItems(), []);
  const [shipping, setShipping] = useState<ArtisanOrderItem | null>(null);
  const [shipment, setShipment] = useState({ carrier: "", trackingNumber: "" });

  const act = async (action: () => Promise<void>, message: string) => {
    try {
      await action();
      toast.show(message, "success");
      await items.reload();
    } catch (error) {
      toast.show(errorText(error), "error");
    }
  };

  const ship = async (event: FormEvent) => {
    event.preventDefault();
    if (!shipping) return;
    await act(() => services.artisan.markShipped(shipping.item.id, shipment), i18n.t("artisanOrders.shipped"));
    setShipping(null);
    setShipment({ carrier: "", trackingNumber: "" });
  };

  return (
    <>
      <PageHeader title={i18n.t("artisanOrders.title")} lead={i18n.t("artisanOrders.lead")} />
      {items.loading && !items.data && <Loading />}
      {items.error !== null && <ErrorNote error={items.error} />}
      {items.data && !items.data.length && <EmptyState title={i18n.t("artisanOrders.empty")} />}
      <ul className="fulfil-list">
        {items.data?.map((entry) => {
          const { item } = entry;
          const deposit = entry.isDeposit;
          return (
            <li key={item.id}>
              <div className="fulfil-main">
                <strong>{item.description}</strong>
                <span className="muted">
                  {entry.orderCode} — {format.date(entry.createdAt)} — {i18n.tx(`status.orderType.${entry.orderType}`)}
                </span>
                <span>
                  {i18n.t("artisanOrders.buyer")}: {entry.buyerName}
                </span>
                {item.trackingNumber && <span>{i18n.t("order.tracking", { carrier: item.carrier ?? "", number: item.trackingNumber })}</span>}
              </div>
              <AddressText address={entry.shippingAddress} />
              <div className="fulfil-side">
                <StatusBadge kind="fulfillment" value={item.fulfillmentStatus} />
                <span>{i18n.t("artisanOrders.youReceive", { amount: format.money(item.artisanAmount) })}</span>
                <div className="actions">
                  {deposit && item.fulfillmentStatus !== "DELIVERED" ? (
                    <button type="button" className="btn btn-primary" onClick={() => window.confirm(i18n.t("artisanOrders.balanceConfirm")) && void act(() => services.artisan.requestBalance(item.id), i18n.t("artisanOrders.balanceSent"))}>
                      {i18n.t("artisanOrders.pieceReady")}
                    </button>
                  ) : (
                    <>
                      {item.fulfillmentStatus === "PENDING" && (
                        <button type="button" className="btn btn-quiet" onClick={() => void act(() => services.artisan.markPreparing(item.id), i18n.t("artisanOrders.preparing"))}>
                          {i18n.t("artisanOrders.startPreparing")}
                        </button>
                      )}
                      {(item.fulfillmentStatus === "PENDING" || item.fulfillmentStatus === "PREPARING") && (
                        <button type="button" className="btn btn-primary" onClick={() => setShipping(entry)}>
                          {i18n.t("artisanOrders.ship")}
                        </button>
                      )}
                      {item.fulfillmentStatus === "SHIPPED" && (
                        <button type="button" className="btn btn-quiet" onClick={() => void act(() => services.artisan.markDelivered(item.id), i18n.t("artisanOrders.delivered"))}>
                          {i18n.t("artisanOrders.markDelivered")}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <Modal title={i18n.t("artisanOrders.shipTitle")} open={!!shipping} onClose={() => setShipping(null)}>
        <form className="form-grid" onSubmit={(event) => void ship(event)}>
          <Field label={i18n.t("artisanOrders.carrier")}>
            <input required value={shipment.carrier} onChange={(event) => setShipment({ ...shipment, carrier: event.target.value })} placeholder="DHL, Servientrega, 4-72…" />
          </Field>
          <Field label={i18n.t("artisanOrders.tracking")}>
            <input required value={shipment.trackingNumber} onChange={(event) => setShipment({ ...shipment, trackingNumber: event.target.value })} />
          </Field>
          <div className="actions">
            <button type="submit" className="btn btn-primary">
              {i18n.t("artisanOrders.confirmShip")}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
