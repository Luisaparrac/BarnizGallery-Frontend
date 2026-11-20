import type { Auction } from "../../domain/auction";
import type { Localizer } from "../../i18n/Localizer";
import { services } from "../../services/ServiceRegistry";
import { Formatter } from "../../utils/Formatter";
import type { AuctionBoard } from "../world/WorldTypes";

/**
 * Keeps the live board of the auction hall up to date (Observer + Adapter): every few seconds it
 * reads the auctions and passes the open ones (then the latest finished) to the world, already
 * translated. The world redraws the countdowns every second by itself.
 */
export class AuctionBoardFeed {
  private static readonly POLL_MS = 4000;
  private static readonly ROWS = 4;
  private readonly format: Formatter;
  private readonly timer: number;

  constructor(
    private readonly i18n: Localizer,
    private readonly publish: (board: AuctionBoard) => void,
  ) {
    this.format = new Formatter(i18n.language);
    void this.refresh();
    this.timer = window.setInterval(() => void this.refresh(), AuctionBoardFeed.POLL_MS);
  }

  async refresh(): Promise<void> {
    try {
      this.publish(this.board(await services.auction.list()));
    } catch {
      // The next read tries again; the board keeps its last rows.
    }
  }

  dispose(): void {
    window.clearInterval(this.timer);
  }

  private board(auctions: Auction[]): AuctionBoard {
    const open = auctions.filter((auction) => auction.status === "ACTIVE" || auction.status === "SCHEDULED");
    const finished = auctions.filter((auction) => auction.status === "FINISHED").sort((a, b) => b.endDate.localeCompare(a.endDate));
    return {
      title: this.i18n.t("auctionHall.boardTitle"),
      columns: [this.i18n.t("auctionHall.colWork"), this.i18n.t("auctionHall.colBid"), this.i18n.t("auctionHall.colEnds"), this.i18n.t("auction.bidCount")],
      rows: [...open, ...finished].slice(0, AuctionBoardFeed.ROWS).map((auction) => ({
        title: this.i18n.pick(auction.artworkTitleEs, auction.artworkTitleEn),
        bid:
          auction.highestBid !== null
            ? this.format.money(auction.highestBid, auction.currency)
            : this.i18n.t("auctionHall.base", { amount: this.format.money(auction.basePrice, auction.currency) }),
        status: auction.status,
        until: auction.status === "ACTIVE" ? auction.endDate : auction.status === "SCHEDULED" ? auction.startDate : null,
        bids: auction.bidCount,
      })),
      ended: this.i18n.t("auctionHall.ended"),
      opens: this.i18n.t("auctionHall.opens"),
      empty: this.i18n.t("auctions.empty.ACTIVE"),
    };
  }
}
