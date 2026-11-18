import { useState } from "react";
import { ErrorNote, Loading } from "../../components/Feedback";
import { Field } from "../../components/Field";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import type { Payout } from "../../domain/commerce";
import { useAsync } from "../../hooks/useAsync";
import { useErrorText } from "../../hooks/useErrorText";
import { services } from "../../services/ServiceRegistry";
import { useLocale } from "../../state/LocaleContext";
import { useToast } from "../../state/ToastContext";

/** Sales per store (v_store_sales) and payouts to the artisans for delivered items. */
export function AdminPayoutsPage() {
  const { i18n, format } = useLocale();
  const toast = useToast();
  const errorText = useErrorText();
  const data = useAsync(async () => {
    const [sales, payouts] = await Promise.all([services.admin.listStoreSales(), services.admin.listPayouts()]);
    return { sales, payouts };
  }, []);
  const [paying, setPaying] = useState<Payout | null>(null);
  const [reference, setReference] = useState("");

  const act = async (action: () => Promise<unknown>) => {
    try {
      await action();
      await data.reload();
    } catch (error) {
      toast.show(errorText(error), "error");
    }
  };

  if (data.loading && !data.data) return <Loading />;
  if (data.error !== null || !data.data) return <ErrorNote error={data.error} />;
  return (
    <>
      <PageHeader title={i18n.t("adminPayouts.title")} lead={i18n.t("adminPayouts.lead")} />
      <section className="block">
        <h2 className="h3">{i18n.t("adminPayouts.sales")}</h2>
        <table className="table">
          <thead>
            <tr>
              <th>{i18n.t("adminStores.store")}</th>
              <th>{i18n.t("artisan.paidOrders")}</th>
              <th>{i18n.t("artisan.grossSales")}</th>
              <th>{i18n.t("artisan.earnings")}</th>
              <th>{i18n.t("artisan.pendingPayout")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.data.sales.map((row) => (
              <tr key={row.storeId}>
                <td>
                  {row.storeName}
                  <br />
                  <small className="muted">{row.masterName}</small>
                </td>
                <td>{row.paidOrders}</td>
                <td>{format.money(row.grossSales)}</td>
                <td>{format.money(row.artisanEarnings)}</td>
                <td>{format.money(row.pendingPayout)}</td>
                <td>
                  {row.pendingPayout > 0 && (
                    <button type="button" className="btn btn-link" onClick={() => void act(() => services.admin.createPayout(row.masterId))}>
                      {i18n.t("adminPayouts.create")}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted">{i18n.t("adminPayouts.onlyDelivered")}</p>
      </section>
      <section className="block">
        <h2 className="h3">{i18n.t("artisan.payouts")}</h2>
        {!data.data.payouts.length ? (
          <p className="muted">{i18n.t("artisan.noPayouts")}</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{i18n.t("adminStores.master")}</th>
                <th>{i18n.t("artisan.amount")}</th>
                <th>{i18n.t("artisan.items")}</th>
                <th>{i18n.t("orders.date")}</th>
                <th>{i18n.t("orders.status")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.data.payouts.map((payout) => (
                <tr key={payout.id}>
                  <td>{payout.masterName}</td>
                  <td>{format.money(payout.amount, payout.currency)}</td>
                  <td>{payout.itemCount}</td>
                  <td>{format.date(payout.createdAt)}</td>
                  <td>
                    <StatusBadge kind="payout" value={payout.status} /> {payout.reference}
                  </td>
                  <td>
                    {payout.status === "PENDING" && (
                      <button type="button" className="btn btn-link" onClick={() => setPaying(payout)}>
                        {i18n.t("adminPayouts.markPaid")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <Modal title={i18n.t("adminPayouts.markPaid")} open={!!paying} onClose={() => setPaying(null)}>
        <p>{paying && `${paying.masterName}: ${format.money(paying.amount, paying.currency)}`}</p>
        <Field label={i18n.t("artisan.reference")}>
          <input value={reference} onChange={(event) => setReference(event.target.value)} />
        </Field>
        <div className="actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!reference.trim()}
            onClick={() =>
              void act(async () => {
                await services.admin.markPayoutPaid(paying!.id, reference);
                setPaying(null);
                setReference("");
              })
            }
          >
            {i18n.t("adminPayouts.confirmPaid")}
          </button>
        </div>
      </Modal>
    </>
  );
}
