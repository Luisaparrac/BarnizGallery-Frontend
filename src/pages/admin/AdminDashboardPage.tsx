import { Link } from "react-router-dom";
import { ErrorNote, Loading } from "../../components/Feedback";
import { PageHeader } from "../../components/PageHeader";
import type { AdminDashboard } from "../../domain/admin";
import { useAsync } from "../../hooks/useAsync";
import type { MessageKey } from "../../i18n/Localizer";
import { services } from "../../services/ServiceRegistry";
import { useLocale } from "../../state/LocaleContext";

type Row = { key: keyof AdminDashboard; label: MessageKey; link?: string; money?: boolean; alert?: boolean };

const GROUPS: { title: MessageKey; rows: Row[] }[] = [
  {
    title: "adminHome.toReview",
    rows: [
      { key: "pendingVerifications", label: "adminHome.pendingVerifications", link: "/admin/verifications", alert: true },
      { key: "suspiciousBids7d", label: "adminHome.suspiciousBids", link: "/admin/bids", alert: true },
      { key: "openReports", label: "adminHome.openReports", link: "/admin/reports", alert: true },
    ],
  },
  {
    title: "adminHome.commerce",
    rows: [
      { key: "ordersWaitingPayment", label: "adminHome.ordersWaitingPayment" },
      { key: "ordersToShip", label: "adminHome.ordersToShip" },
      { key: "revenueThisMonth", label: "adminHome.revenue", money: true },
      { key: "feesThisMonth", label: "adminHome.fees", money: true, link: "/admin/payouts" },
    ],
  },
  {
    title: "adminHome.gallery",
    rows: [
      { key: "activeCustomers", label: "adminHome.customers", link: "/admin/users" },
      { key: "activeArtisans", label: "adminHome.artisans", link: "/admin/users" },
      { key: "publishedStores", label: "adminHome.stores", link: "/admin/stores" },
      { key: "visibleArtworks", label: "adminHome.artworks" },
      { key: "activeAuctions", label: "adminHome.auctions" },
      { key: "openCustomRequests", label: "adminHome.customRequests" },
    ],
  },
];

/** One-screen summary (view v_admin_dashboard), grouped by what needs attention first. */
export function AdminDashboardPage() {
  const { i18n, format } = useLocale();
  const data = useAsync(() => services.admin.getDashboard(), []);
  if (data.loading && !data.data) return <Loading />;
  if (data.error !== null || !data.data) return <ErrorNote error={data.error} />;
  const dashboard = data.data;
  return (
    <>
      <PageHeader title={i18n.t("adminHome.title")} />
      <div className="admin-groups">
        {GROUPS.map((group) => (
          <section key={group.title} className="block">
            <h2 className="h3">{i18n.t(group.title)}</h2>
            <dl className="stat-rows">
              {group.rows.map((row) => {
                const value = dashboard[row.key] as number;
                return (
                  <div key={row.key} className={row.alert && value > 0 ? "is-alert" : ""}>
                    <dt>{row.link ? <Link to={row.link}>{i18n.t(row.label)}</Link> : i18n.t(row.label)}</dt>
                    <dd>{row.money ? format.money(value, dashboard.currency) : value}</dd>
                  </div>
                );
              })}
            </dl>
          </section>
        ))}
      </div>
    </>
  );
}
