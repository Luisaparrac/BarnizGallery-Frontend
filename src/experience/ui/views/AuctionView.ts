import type { Auction, Bid } from "../../../domain/auction";
import type { Id } from "../../../domain/common";
import type { ArtworkDetail } from "../../../domain/gallery";
import type { Localizer } from "../../../i18n/Localizer";
import type { Formatter } from "../../../utils/Formatter";
import { NameMask } from "../../../utils/NameMask";
import { BoardView, type BoardContext } from "../board/BoardView";
import { ErrorText } from "../ErrorText";
import type { UiButton, UiField, UiNode, UiText } from "../kit/UiKit";

/** Everything the auction board shows. */
export interface AuctionData {
  auction: Auction;
  bids: Bid[];
  /** The piece's full record (photos, master), when it could be read. */
  detail: ArtworkDetail | null;
  /** The visitor's user id, or null without a session. */
  userId: Id | null;
  /** False for signed-in roles that do not bid (artisans and administrators). */
  canBid: boolean;
  /** The winner's order still waiting for payment, when the visitor won. */
  payableOrderId: Id | null;
}

export interface AuctionActions {
  bid(amount: number): Promise<void>;
  signIn(): void;
  pay(orderId: Id): void;
}

/**
 * Board of one auction: the piece's photos, the current bid, the minimum increment, a live
 * countdown, the bid history with masked names and the Bid button (sign in first without a
 * session). A finished auction shows who won; the winner can pay the order from here.
 */
export class AuctionView extends BoardView {
  private static readonly HISTORY = 8;

  readonly size = "piece" as const;
  readonly title: string;
  private countdown: UiText | null = null;
  private amount: UiField | null = null;
  private notice: UiText | null = null;
  private bidButton: UiButton | null = null;

  constructor(
    private readonly i18n: Localizer,
    private readonly format: Formatter,
    private readonly data: AuctionData,
    private readonly act: AuctionActions,
  ) {
    super();
    this.title = i18n.pick(data.auction.artworkTitleEs, data.auction.artworkTitleEn);
  }

  /** The lowest bid accepted now. */
  get minimum(): number {
    const { auction } = this.data;
    return auction.highestBid !== null ? auction.highestBid + auction.minIncrement : auction.basePrice + auction.minIncrement;
  }

  content({ kit }: BoardContext): UiNode {
    const { auction, bids, detail, userId } = this.data;
    const photos = detail ? [...detail.artwork.photos].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder).map((photo) => photo.url) : [auction.coverUrl];
    const gallery = kit.gallery(photos, this.title);
    const money = (amount: number) => this.format.money(amount, auction.currency);

    const info = kit.column("medium");
    if (detail) info.add(kit.text(`${this.i18n.t("artwork.by")} ${detail.masterName}`, true));
    const leading = auction.highestBid !== null;
    info.add(kit.note(this.i18n.t(leading ? "auction.highest" : "auction.base")));
    info.add(kit.section(money(leading ? auction.highestBid! : auction.basePrice)));
    info.add(kit.note(`${this.i18n.t("auction.increment")}: ${money(auction.minIncrement)} · ${this.i18n.t("auction.bids", { count: auction.bidCount })}`));
    this.countdown = kit.text(this.countdownText(), true);
    info.add(this.countdown);

    if (auction.status === "FINISHED") {
      const winner = bids.find((bid) => bid.amount === auction.highestBid && bid.reviewStatus === "VALID") ?? bids[0];
      if (auction.highestBidderId !== null && auction.highestBidderId === userId) info.add(kit.note(this.i18n.t("auction.youWon"), "success"));
      else if (winner) info.add(kit.text(this.i18n.t("auctionHall.winner", { name: NameMask.mask(winner.userName), amount: money(winner.amount) })));
      else info.add(kit.text(this.i18n.t("auctionHall.noWinner")));
    } else if (auction.status === "ACTIVE" && userId !== null && auction.highestBidderId === userId) {
      info.add(kit.note(this.i18n.t("auction.youLead"), "success"));
    }

    info.add(kit.section(this.i18n.t("auction.history")));
    if (!bids.length) info.add(kit.note(this.i18n.t("auction.noBids")));
    for (const bid of [...bids].sort((a, b) => b.amount - a.amount).slice(0, AuctionView.HISTORY)) {
      const who = bid.userId === userId ? this.i18n.t("auction.you") : NameMask.mask(bid.userName);
      info.add(kit.note(`${who} · ${money(bid.amount)} · ${this.format.relative(bid.bidDate)}`));
    }

    if (auction.status === "ACTIVE" && userId !== null && !this.data.canBid) info.add(kit.note(this.i18n.t("access.noBids")));
    if (auction.status === "ACTIVE" && userId !== null && this.data.canBid) {
      this.amount = kit.field(this.i18n.t("auction.yourBid", { min: money(this.minimum) }), { type: "number", value: String(this.minimum) });
      info.add(this.amount);
    }
    this.notice = kit.note("", "success");
    this.notice.setVisible(false);
    info.add(this.notice);
    return kit.columns(gallery, info);
  }

  override actions({ kit }: BoardContext): UiButton[] {
    const { auction, userId, payableOrderId } = this.data;
    if (auction.status === "FINISHED") {
      return payableOrderId !== null ? [kit.button(this.i18n.t("auctionHall.payOrder"), () => this.act.pay(payableOrderId))] : [];
    }
    if (auction.status !== "ACTIVE") return [];
    if (userId === null) return [kit.button(this.i18n.t("auction.loginToBid"), () => this.act.signIn())];
    if (!this.data.canBid) return [];
    this.bidButton = kit.button(this.i18n.t("auction.bid"), () => void this.placeBid());
    return [this.bidButton];
  }

  /** Called every second by the flow: refreshes the countdown. */
  tick(): void {
    this.countdown?.setText(this.countdownText());
  }

  private countdownText(): string {
    const { auction } = this.data;
    if (auction.status === "FINISHED" || auction.status === "CANCELLED") return this.i18n.t("auction.endedOn", { date: this.format.dateTime(auction.endDate) });
    const target = auction.status === "SCHEDULED" ? auction.startDate : auction.endDate;
    const label = this.i18n.t(auction.status === "SCHEDULED" ? "auction.startsIn" : "auction.endsIn");
    return `${label} ${AuctionView.clock(Date.parse(target) - Date.now())}`;
  }

  static clock(milliseconds: number): string {
    const total = Math.max(0, Math.floor(milliseconds / 1000));
    const days = Math.floor(total / 86400);
    const pad = (value: number) => String(value).padStart(2, "0");
    const clock = `${pad(Math.floor((total % 86400) / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
    return days > 0 ? `${days}d ${clock}` : clock;
  }

  private async placeBid(): Promise<void> {
    const amount = Number((this.amount?.value ?? "").replace(",", "."));
    if (!Number.isFinite(amount) || amount < this.minimum) {
      this.say(this.i18n.t("auctionHall.invalidAmount", { amount: this.format.money(this.minimum, this.data.auction.currency) }), true);
      return;
    }
    this.bidButton?.setEnabled(false);
    try {
      await this.act.bid(amount);
    } catch (error) {
      this.say(ErrorText.of(this.i18n, error), true);
      this.bidButton?.setEnabled(true);
    }
  }

  private say(text: string, error: boolean): void {
    this.notice?.setText(text);
    this.notice?.setTone(error ? "error" : "success");
    this.notice?.setVisible(text !== "");
  }
}
