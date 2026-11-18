import { Link } from "react-router-dom";
import { ArtImage } from "../../components/ArtImage";
import { EmptyState, ErrorNote, Loading } from "../../components/Feedback";
import { Icon } from "../../components/Icon";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { services } from "../../services/ServiceRegistry";
import { useLocale } from "../../state/LocaleContext";

/** The customer's custom orders: describe a piece, get AI designs and offers from artisans. */
export function CustomRequestsPage() {
  const { i18n, format } = useLocale();
  const requests = useAsync(() => services.customOrder.listMine(), []);
  return (
    <div className="container">
      <PageHeader
        title={i18n.t("custom.title")}
        lead={i18n.t("custom.lead")}
        actions={
          <Link to="/account/custom/new" className="btn btn-primary">
            <Icon name="plus" /> {i18n.t("custom.new")}
          </Link>
        }
      />
      <ol className="how-steps">
        <li>{i18n.t("custom.how1")}</li>
        <li>{i18n.t("custom.how2")}</li>
        <li>{i18n.t("custom.how3")}</li>
        <li>{i18n.t("custom.how4")}</li>
      </ol>
      {requests.loading && <Loading />}
      {requests.error !== null && <ErrorNote error={requests.error} />}
      {requests.data && !requests.data.length && <EmptyState title={i18n.t("custom.empty")} text={i18n.t("custom.emptyText")} />}
      <div className="request-list">
        {requests.data?.map((request) => {
          const design = request.designs.find((entry) => entry.isSelected) ?? request.designs[0];
          return (
            <Link key={request.id} to={`/account/custom/${request.id}`} className="request-row">
              {design?.imageUrl ? <ArtImage src={design.imageUrl} alt="" /> : <div className="img-missing" />}
              <div>
                <h2>{request.title}</h2>
                <p className="muted">
                  {format.date(request.createdAt)} — {request.offeredPrice ? format.money(request.offeredPrice, request.currency) : i18n.t("custom.noPrice")}
                </p>
              </div>
              <span>{i18n.t("custom.offerCount", { count: request.offers.filter((offer) => offer.status === "SENT").length })}</span>
              <StatusBadge kind="customRequest" value={request.status} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
