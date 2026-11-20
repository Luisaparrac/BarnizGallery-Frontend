import { ArtImageCodec } from "../../art/ArtImageSpec";
import { ArtworkImageFactory } from "../../art/ArtworkImageFactory";
import type { Id } from "../../domain/common";
import type { CustomRequest } from "../../domain/customOrder";
import type { User } from "../../domain/user";
import type { Localizer } from "../../i18n/Localizer";
import { services } from "../../services/ServiceRegistry";
import type { HallBoard, HallDesign } from "../world/WorldTypes";

/** What the commissions hall shows for one visitor. */
export interface HallData {
  /** Frames of the design wall: the visitor's AI designs, or examples. */
  designs: HallDesign[];
  board: HallBoard;
  /** The request the offers board opens when all the new offers belong to one; null opens the list. */
  offersRequestId: Id | null;
}

/** Example designs for visitors without commissions: shape code, figure and colours. */
const EXAMPLES: readonly [string, string, string[]][] = [
  ["bandeja", "zoomorfo", ["#B3261E", "#C9A227", "#2E7D32"]],
  ["jarron", "floral", ["#1F4E9C", "#F5F1E8", "#C9A227"]],
  ["plato", "precolombino", ["#1A1A1A", "#E07B24", "#C9A227"]],
  ["mascara", "geometrico", ["#2E7D32", "#F2C230", "#B3261E"]],
];

/**
 * Turns the visitor's custom orders into what the commissions hall shows (Adapter between the
 * custom-order service and the world): the AI designs of their requests for the design wall
 * (examples when there are none or nobody signed in) and the count of new offers for the board.
 */
export class CommissionHallLoader {
  constructor(
    private readonly i18n: Localizer,
    private readonly frames: number,
  ) {}

  async load(user: User | null): Promise<HallData> {
    const requests = user ? await services.customOrder.listMine().catch(() => [] as CustomRequest[]) : [];
    const designs = this.designsOf(requests);
    return {
      designs: designs.length ? designs : await this.examples(),
      board: this.board(user, requests),
      offersRequestId: this.offersRequest(requests),
    };
  }

  /** Newest requests first; in each, the chosen design first. */
  private designsOf(requests: CustomRequest[]): HallDesign[] {
    return [...requests]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .flatMap((request) =>
        request.designs
          .filter((design) => design.status === "COMPLETED" && design.imageUrl)
          .sort((a, b) => Number(b.isSelected) - Number(a.isSelected))
          .map((design) => ({ requestId: request.id, imageUrl: ArtworkImageFactory.resolve(design.imageUrl), label: request.title })),
      )
      .slice(0, this.frames);
  }

  private async examples(): Promise<HallDesign[]> {
    const catalogs = await services.catalog.getCatalogs().catch(() => null);
    return EXAMPLES.slice(0, this.frames).map(([shape, motif, colors], index) => {
      const name = this.i18n.name(catalogs?.shapes.find((item) => item.code === shape)) || shape;
      return {
        requestId: null,
        imageUrl: ArtworkImageFactory.resolve(ArtImageCodec.encode({ shape, motif, colors, seed: 700 + index, view: "front" })),
        label: this.i18n.t("hall.example", { shape: name }),
      };
    });
  }

  private newOffers(requests: CustomRequest[]): { requestId: Id; count: number }[] {
    return requests
      .map((request) => ({ requestId: request.id, count: request.offers.filter((offer) => offer.status === "SENT").length }))
      .filter((entry) => entry.count > 0);
  }

  private board(user: User | null, requests: CustomRequest[]): HallBoard {
    const title = this.i18n.t("hall.boardTitle");
    if (!user) return { title, count: null, lines: [this.i18n.t("hall.boardSignIn")] };
    const count = this.newOffers(requests).reduce((sum, entry) => sum + entry.count, 0);
    if (!count) return { title, count: null, lines: [this.i18n.t("hall.boardNone"), this.i18n.t("hall.boardHintEmpty")] };
    return { title, count, lines: [this.i18n.t(count === 1 ? "hall.boardNewOne" : "hall.boardNewMany"), this.i18n.t("hall.boardHint")] };
  }

  private offersRequest(requests: CustomRequest[]): Id | null {
    const withOffers = this.newOffers(requests);
    return withOffers.length === 1 ? withOffers[0].requestId : null;
  }
}
