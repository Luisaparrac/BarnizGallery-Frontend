import { Link } from "react-router-dom";
import { ErrorNote, Loading, Note } from "../../components/Feedback";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { services } from "../../services/ServiceRegistry";
import { useLocale } from "../../state/LocaleContext";

/** Artisan home: verification and store status, sales (v_store_sales), work waiting and payouts. */
export function ArtisanDashboardPage() {
  const { i18n, format } = useLocale();
  const data = useAsync(async () => {
    const [master, store, sales, items, open, payouts] = await Promise.all([
      services.artisan.getMyMaster(),
      services.artisan.getMyStore(),
      services.artisan.getSales(),
      services.artisan.listOrderItems(),
      services.customOrder.listOpen(),
      services.artisan.listPayouts(),
    ]);
    return { master, store, sales, items, open, payouts };
  }, []);
  if (data.loading && !data.data) return <Loading />;
  if (data.error !== null || !data.data) return <ErrorNote error={data.error} />;
  const { master, store, sales, items, open, payouts } = data.data;
  const toShip = items.filter((entry) => entry.item.fulfillmentStatus === "PENDING" || entry.item.fulfillmentStatus === "PREPARING").length;
  return (
    <>
      <PageHeader title={i18n.t("artisan.hello", { name: master.name.split(" ")[0] })} lead={master.workshop} />
      {master.verificationStatus !== "APPROVED" && (
        <Note tone="warn">
          {i18n.t("artisan.notApproved")} <Link to="/artisan/verification">{i18n.t("artisan.goVerification")}</Link>
        </Note>
      )}
      <dl className="stat-list">
        <div>
          <dt>{i18n.t("artisan.storeStatus")}</dt>
          <dd>
            <StatusBadge kind="store" value={store.status} /> <Link to="/artisan/store">{i18n.t("artisan.editStore")}</Link>
          </dd>
        </div>
        <div>
          <dt>{i18n.t("artisan.toShip")}</dt>
          <dd>
            {toShip} <Link to="/artisan/orders">{i18n.t("artisan.seeOrders")}</Link>
          </dd>
        </div>
        <div>
          <dt>{i18n.t("artisan.openRequests")}</dt>
          <dd>
            {open.length} <Link to="/artisan/custom-orders">{i18n.t("artisan.seeRequests")}</Link>
          </dd>
        </div>
        <div>
          <dt>{i18n.t("artisan.paidOrders")}</dt>
          <dd>{sales.paidOrders}</dd>
        </div>
        <div>
          <dt>{i18n.t("artisan.grossSales")}</dt>
          <dd>{format.money(sales.grossSales)}</dd>
        </div>
        <div>
          <dt>{i18n.t("artisan.earnings")}</dt>
          <dd>{format.money(sales.artisanEarnings)}</dd>
        </div>
        <div>
          <dt>{i18n.t("artisan.pendingPayout")}</dt>
          <dd>{format.money(sales.pendingPayout)}</dd>
        </div>
      </dl>
      <section className="block">
        <h2 className="h3">{i18n.t("artisan.payouts")}</h2>
        {payouts.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>{i18n.t("orders.date")}</th>
                <th>{i18n.t("artisan.amount")}</th>
                <th>{i18n.t("artisan.items")}</th>
                <th>{i18n.t("orders.status")}</th>
                <th>{i18n.t("artisan.reference")}</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((payout) => (
                <tr key={payout.id}>
                  <td>{format.date(payout.createdAt)}</td>
                  <td>{format.money(payout.amount, payout.currency)}</td>
                  <td>{payout.itemCount}</td>
                  <td>
                    <StatusBadge kind="payout" value={payout.status} />
                  </td>
                  <td>{payout.reference ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">{i18n.t("artisan.noPayouts")}</p>
        )}
      </section>
    </>
  );
}
