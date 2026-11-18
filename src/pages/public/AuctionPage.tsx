import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ArtImage } from "../../components/ArtImage";
import { Countdown } from "../../components/Countdown";
import { ErrorNote, Loading, Note } from "../../components/Feedback";
import { StatusBadge } from "../../components/StatusBadge";
import { AppEvents } from "../../core/AppEvents";
import type { Auction } from "../../domain/auction";
import { useAsync } from "../../hooks/useAsync";
import { useErrorText } from "../../hooks/useErrorText";
import { services } from "../../services/ServiceRegistry";
import { useLocale } from "../../state/LocaleContext";
import { useSession } from "../../state/SessionContext";
import { useToast } from "../../state/ToastContext";

/** Live auction: time left, highest bid, bid form and the bid history, refreshed as bids arrive. */
export function AuctionPage() {
  const { id = "" } = useParams();
  const auctionId = Number(id);
  const { i18n, format } = useLocale();
  const { user } = useSession();
  const toast = useToast();
  const errorText = useErrorText();
  const data = useAsync(async () => {
    const [auction, bids] = await Promise.all([services.auction.get(auctionId), services.auction.listBids(auctionId)]);
    return { auction, bids };
  }, [auctionId]);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(
    () =>
      services.auction.subscribe(auctionId, (event) => {
        void data.reload();
        if (event.type === "BID_PLACED" && event.auction.highestBidderId !== user?.id) toast.show(i18n.t("auction.newBid"), "info");
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [auctionId, user?.id],
  );

  if (data.loading && !data.data) return <Loading />;
  if (data.error !== null || !data.data) return <div className="container"><ErrorNote error={data.error} /></div>;
  const { auction, bids } = data.data;
  const minimum = (auction.highestBid ?? auction.basePrice) + auction.minIncrement;
  const title = i18n.pick(auction.artworkTitleEs, auction.artworkTitleEn);
  const leading = !!user && auction.highestBidderId === user.id;
  const won = auction.status === "FINISHED" && auction.winningBidId !== null && bids.find((bid) => bid.id === auction.winningBidId)?.userId === user?.id;

  const placeBid = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await services.auction.placeBid(auction.id, Number(amount));
      setAmount("");
      toast.show(i18n.t("auction.bidPlaced"), "success");
      AppEvents.notificationsChanged.emit();
      await data.reload();
    } catch (error) {
      toast.show(errorText(error), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <nav className="crumbs" aria-label={i18n.t("nav.breadcrumbs")}>
        <Link to="/auctions">{i18n.t("nav.auctions")}</Link> / {title}
      </nav>
      <div className="artwork-layout">
        <div className="viewer">
          <div className="viewer-main is-static">
            <ArtImage src={auction.coverUrl} alt={title} />
          </div>
        </div>
        <div className="artwork-info">
          <h1>{title}</h1>
          <p className="artwork-master">{auction.storeName}</p>
          <StatusBadge kind="auction" value={auction.status} />
          <div className="bid-box">
            <AuctionClock auction={auction} />
            <dl className="specs">
              <dt>{auction.highestBid ? i18n.t("auction.highest") : i18n.t("auction.base")}</dt>
              <dd>
                <strong className="big-number">{format.money(auction.highestBid ?? auction.basePrice, auction.currency)}</strong>
              </dd>
              <dt>{i18n.t("auction.increment")}</dt>
              <dd>{format.money(auction.minIncrement, auction.currency)}</dd>
              <dt>{i18n.t("auction.bidCount")}</dt>
              <dd>{auction.bidCount}</dd>
              {auction.reservePrice !== null && (
                <>
                  <dt>{i18n.t("auction.reserve")}</dt>
                  <dd>{auction.highestBid !== null && auction.highestBid >= auction.reservePrice ? i18n.t("auction.reserveMet") : i18n.t("auction.reserveNotMet")}</dd>
                </>
              )}
            </dl>
            {leading && auction.status === "ACTIVE" && <Note tone="success">{i18n.t("auction.youLead")}</Note>}
            {won && (
              <Note tone="success">
                {i18n.t("auction.youWon")} {auction.orderId && <Link to={`/account/orders/${auction.orderId}`}>{i18n.t("auction.payNow")}</Link>}
              </Note>
            )}
            {auction.status === "ACTIVE" &&
              (user && user.role !== "ADMIN" ? (
                <form className="bid-form" onSubmit={(event) => void placeBid(event)}>
                  <label className="field">
                    <span className="field-label">{i18n.t("auction.yourBid", { min: format.money(minimum, auction.currency) })}</span>
                    <input type="number" min={minimum} step="1" required value={amount} placeholder={String(minimum)} onChange={(event) => setAmount(event.target.value)} />
                  </label>
                  <button type="submit" className="btn btn-primary" disabled={busy}>
                    {i18n.t("auction.bid")}
                  </button>
                </form>
              ) : !user ? (
                <Link to={`/login?next=/auctions/${auction.id}`} className="btn btn-primary">
                  {i18n.t("auction.loginToBid")}
                </Link>
              ) : null)}
          </div>
          <Link to={`/artworks/${auction.artworkId}`}>{i18n.t("auction.seePiece")}</Link>
          <h2 className="h3">{i18n.t("auction.history")}</h2>
          {bids.length ? (
            <table className="table">
              <thead>
                <tr>
                  <th>{i18n.t("auction.bidder")}</th>
                  <th>{i18n.t("auction.amount")}</th>
                  <th>{i18n.t("auction.when")}</th>
                </tr>
              </thead>
              <tbody>
                {bids.map((bid) => (
                  <tr key={bid.id}>
                    <td>{bid.userId === user?.id ? i18n.t("auction.you") : maskName(bid.userName)}</td>
                    <td>{format.money(bid.amount, bid.currency)}</td>
                    <td>{format.dateTime(bid.bidDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">{i18n.t("auction.noBids")}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AuctionClock({ auction }: { auction: Auction }) {
  const { i18n, format } = useLocale();
  if (auction.status === "ACTIVE")
    return (
      <p className="clock">
        {i18n.t("auction.endsIn")} <Countdown until={auction.endDate} />
      </p>
    );
  if (auction.status === "SCHEDULED")
    return (
      <p className="clock">
        {i18n.t("auction.startsIn")} <Countdown until={auction.startDate} />
      </p>
    );
  return <p className="clock">{i18n.t("auction.endedOn", { date: format.dateTime(auction.endDate) })}</p>;
}

/** Other bidders are shown by their initial only. */
function maskName(name: string): string {
  return name
    .split(" ")
    .map((part) => `${part[0] ?? ""}.`)
    .join(" ");
}
