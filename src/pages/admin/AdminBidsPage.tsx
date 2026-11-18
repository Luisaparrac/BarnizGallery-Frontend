import { EmptyState, ErrorNote, Loading } from "../../components/Feedback";
import { PageHeader } from "../../components/PageHeader";
import { useAsync } from "../../hooks/useAsync";
import { useErrorText } from "../../hooks/useErrorText";
import { services } from "../../services/ServiceRegistry";
import { useLocale } from "../../state/LocaleContext";
import { useToast } from "../../state/ToastContext";

export function AdminBidsPage() {
  const { i18n, format } = useLocale();
  const toast = useToast();
  const errorText = useErrorText();
  const bids = useAsync(() => services.admin.listSuspiciousBids(), []);
  const markValid = async (bidId: number) => {
    try {
      await services.admin.markBidValid(bidId);
      await bids.reload();
    } catch (error) {
      toast.show(errorText(error), "error");
    }
  };
  return (
    <>
      <PageHeader title={i18n.t("adminBids.title")} lead={i18n.t("adminBids.lead")} />
      {bids.loading && !bids.data && <Loading />}
      {bids.error !== null && <ErrorNote error={bids.error} />}
      {bids.data && !bids.data.length && <EmptyState title={i18n.t("adminBids.empty")} />}
      {bids.data && bids.data.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>{i18n.t("artworks.piece")}</th>
              <th>{i18n.t("auction.bidder")}</th>
              <th>{i18n.t("auction.amount")}</th>
              <th>{i18n.t("adminBids.reason")}</th>
              <th>{i18n.t("auction.when")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {bids.data.map((bid) => (
              <tr key={bid.bidId}>
                <td>
                  {bid.artworkTitle}
                </td>
                <td>{bid.userName}</td>
                <td>{format.money(bid.amount, bid.currency)}</td>
                <td>{bid.reason}</td>
                <td>{format.dateTime(bid.bidDate)}</td>
                <td>
                  <button type="button" className="btn btn-link" onClick={() => void markValid(bid.bidId)}>
                    {i18n.t("adminBids.markValid")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
