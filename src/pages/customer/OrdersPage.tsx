import { Link } from "react-router-dom";
import { EmptyState, ErrorNote, Loading } from "../../components/Feedback";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { services } from "../../services/ServiceRegistry";
import { useLocale } from "../../state/LocaleContext";

export function OrdersPage() {
  const { i18n, format } = useLocale();
  const orders = useAsync(() => services.commerce.listMyOrders(), []);
  return (
    <div className="container">
      <PageHeader title={i18n.t("orders.title")} />
      {orders.loading && <Loading />}
      {orders.error !== null && <ErrorNote error={orders.error} onRetry={() => void orders.reload()} />}
      {orders.data && !orders.data.length && <EmptyState title={i18n.t("orders.empty")} action={<Link className="btn btn-primary" to="/gallery">{i18n.t("nav.gallery")}</Link>} />}
      {orders.data && orders.data.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>{i18n.t("orders.code")}</th>
              <th>{i18n.t("orders.date")}</th>
              <th>{i18n.t("orders.type")}</th>
              <th>{i18n.t("orders.items")}</th>
              <th>{i18n.t("order.total")}</th>
              <th>{i18n.t("orders.status")}</th>
            </tr>
          </thead>
          <tbody>
            {orders.data.map((order) => (
              <tr key={order.id}>
                <td>
                  <Link to={`/account/orders/${order.id}`}>{order.code}</Link>
                </td>
                <td>{format.date(order.createdAt)}</td>
                <td>{i18n.tx(`status.orderType.${order.type}`)}</td>
                <td>{order.items.map((item) => item.description).join(", ")}</td>
                <td>{format.money(order.total, order.currency)}</td>
                <td>
                  <StatusBadge kind="order" value={order.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
