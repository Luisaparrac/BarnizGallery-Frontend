import { AccessPolicy } from "../../core/AccessPolicy";
import { AppEvents } from "../../core/AppEvents";
import type { Id } from "../../domain/common";
import type { ArtworkDetail, ArtworkSummary } from "../../domain/gallery";
import type { Localizer } from "../../i18n/Localizer";
import { services } from "../../services/ServiceRegistry";
import { Formatter } from "../../utils/Formatter";
import { ErrorText } from "./ErrorText";
import type { SurfaceView } from "./PanelSurface";
import type { PurchaseFlow } from "./PurchaseFlow";
import type { VisitorSession } from "./VisitorSession";
import { AuctionView } from "./views/AuctionView";
import { MessageView } from "./views/MessageView";

/** Where the auction boards are shown. */
export interface AuctionHost {
  show(view: SurfaceView): void;
  /** The board on screen now (the live updates stop when it is another one). */
  current(): SurfaceView | null;
}

/**
 * Mediator of bidding in 3D: loads an auction with its bids and photos, shows its board and keeps
 * it live while it is open (the countdown every second, and a fresh board when someone bids or the
 * auction opens or closes). Bidding without a session asks to sign in and comes back.
 */
export class AuctionFlow {
  private readonly format: Formatter;
  private artworks: ArtworkSummary[] | null = null;
  private stopLive: (() => void) | null = null;

  constructor(
    private readonly i18n: Localizer,
    private readonly session: VisitorSession,
    private readonly host: AuctionHost,
    private readonly purchase: PurchaseFlow,
  ) {
    this.format = new Formatter(i18n.language);
  }

  async showAuction(id: Id): Promise<void> {
    this.stop();
    try {
      const [auction, bids] = await Promise.all([services.auction.get(id), services.auction.listBids(id)]);
      const user = this.session.user;
      const detail = await this.detailOf(auction.artworkId);
      let payableOrderId: Id | null = null;
      if (auction.status === "FINISHED" && user && auction.highestBidderId === user.id && auction.orderId !== null) {
        const order = await services.commerce.getOrder(auction.orderId).catch(() => null);
        if (order?.status === "PENDING_PAYMENT") payableOrderId = order.id;
      }
      const view = new AuctionView(this.i18n, this.format, { auction, bids, detail, userId: user?.id ?? null, canBid: AccessPolicy.can(user, "bid"), payableOrderId }, {
        bid: async (amount) => {
          await services.auction.placeBid(id, amount);
          AppEvents.notificationsChanged.emit();
          await this.showAuction(id);
        },
        signIn: () => this.purchase.requireSignIn(() => void this.showAuction(id)),
        pay: (orderId) => void this.purchase.payOrder(orderId),
      });
      this.host.show(view);
      this.watch(id, view);
    } catch (error) {
      this.host.show(new MessageView(this.i18n.t("auctions.title"), ErrorText.of(this.i18n, error)));
    }
  }

  /** Stops the countdown and the live channel (the board closed or changed). */
  stop(): void {
    this.stopLive?.();
    this.stopLive = null;
  }

  private watch(id: Id, view: AuctionView): void {
    const timer = window.setInterval(() => {
      if (this.host.current() !== view) this.stop();
      else view.tick();
    }, 1000);
    const unsubscribe = services.auction.subscribe(id, () => {
      if (this.host.current() === view) void this.showAuction(id);
    });
    this.stopLive = () => {
      window.clearInterval(timer);
      unsubscribe();
    };
  }

  private async detailOf(artworkId: Id): Promise<ArtworkDetail | null> {
    try {
      this.artworks ??= await services.gallery.listArtworks({});
      const row = this.artworks.find((entry) => entry.artwork.id === artworkId);
      return row ? await services.gallery.getArtwork(row.artwork.slug) : null;
    } catch {
      return null;
    }
  }
}
