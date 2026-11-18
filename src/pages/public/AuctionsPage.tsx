import { useState } from "react";
import { Link } from "react-router-dom";
import { ArtImage } from "../../components/ArtImage";
import { Countdown } from "../../components/Countdown";
import { EmptyState, ErrorNote, Loading } from "../../components/Feedback";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import type { AuctionStatus } from "../../domain/auction";
import { useAsync } from "../../hooks/useAsync";
import { services } from "../../services/ServiceRegistry";
import { useLocale } from "../../state/LocaleContext";

const TABS: AuctionStatus[] = ["ACTIVE", "SCHEDULED", "FINISHED"];

export function AuctionsPage() {
  const { i18n, format } = useLocale();
  const [tab, setTab] = useState<AuctionStatus>("ACTIVE");
  const auctions = useAsync(() => services.auction.list(tab), [tab]);
  return (
    <div className="container">
      <PageHeader title={i18n.t("auctions.title")} lead={i18n.t("auctions.lead")} />
      <div className="tabs" role="tablist">
        {TABS.map((status) => (
          <button key={status} role="tab" aria-selected={tab === status} className={tab === status ? "is-on" : ""} onClick={() => setTab(status)}>
            {i18n.tx(`auctions.tab.${status}`)}
          </button>
        ))}
      </div>
      {auctions.loading && <Loading />}
      {auctions.error !== null && <ErrorNote error={auctions.error} onRetry={() => void auctions.reload()} />}
      {auctions.data && !auctions.data.length && <EmptyState title={i18n.tx(`auctions.empty.${tab}`)} />}
      <div className="auction-list">
        {auctions.data?.map((auction) => (
          <Link key={auction.id} to={`/auctions/${auction.id}`} className="auction-row">
            <ArtImage src={auction.coverUrl} alt="" />
            <div>
              <h2>{i18n.pick(auction.artworkTitleEs, auction.artworkTitleEn)}</h2>
              <p className="muted">{auction.storeName}</p>
            </div>
            <div className="auction-row-numbers">
              <span>{auction.highestBid ? i18n.t("auction.highest") : i18n.t("auction.base")}</span>
              <strong>{format.money(auction.highestBid ?? auction.basePrice, auction.currency)}</strong>
              <span className="muted">{i18n.t("auction.bids", { count: auction.bidCount })}</span>
            </div>
            <div className="auction-row-time">
              {auction.status === "ACTIVE" && (
                <>
                  <span>{i18n.t("auction.endsIn")}</span>
                  <Countdown until={auction.endDate} />
                </>
              )}
              {auction.status === "SCHEDULED" && (
                <>
                  <span>{i18n.t("auction.startsIn")}</span>
                  <Countdown until={auction.startDate} />
                </>
              )}
              {auction.status === "FINISHED" && <StatusBadge kind="auction" value={auction.status} />}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
