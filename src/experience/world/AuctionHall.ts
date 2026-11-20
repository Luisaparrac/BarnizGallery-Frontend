import type { Vector3 } from "@babylonjs/core";
import { AuctionHallInterior } from "./AuctionHallInterior";
import { PlazaHall, type HallFrame } from "./PlazaHall";
import type { SceneContext } from "./SceneContext";
import type { AuctionBoard, AuctionHallData, AuctionPiece } from "./WorldTypes";

/**
 * "Sala de subastas": the auction house of the plaza, in burgundy and gold. Inside are the
 * auctioneer's podium, a big live board with the open auctions and the pieces on auction framed on
 * the walls; a click or E on a piece opens its auction.
 */
export class AuctionHall extends PlazaHall {
  private interiorPart: AuctionHallInterior | null = null;

  constructor(
    ctx: SceneContext,
    position: Vector3,
    target: Vector3,
    private readonly data: AuctionHallData,
  ) {
    super(ctx, "auctionHall", position, target, { facade: data.facade, accent: ctx.materials.paintRed, awning: ctx.materials.awning });
  }

  private get interior(): AuctionHallInterior {
    if (!this.interiorPart) throw new Error("AuctionHall.build() must run first");
    return this.interiorPart;
  }

  /** Each framed piece and where the visitor stands to look at it (world). */
  get pieceSpots(): { piece: AuctionPiece; point: Vector3 }[] {
    return this.interior.frames.map((frame) => ({ piece: frame.piece as AuctionPiece, point: frame.viewPoint }));
  }

  setBoard(board: AuctionBoard): void {
    this.interior.setBoard(board);
  }

  override update(_deltaSeconds: number, timeSeconds: number): void {
    this.interiorPart?.update(timeSeconds);
  }

  protected buildInterior(frame: HallFrame): void {
    this.interiorPart = new AuctionHallInterior(this.ctx, this.root, frame, this.data.pieces);
    this.interiorPart.build();
  }
}
