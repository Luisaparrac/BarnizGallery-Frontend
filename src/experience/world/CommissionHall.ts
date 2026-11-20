import type { Vector3 } from "@babylonjs/core";
import { CommissionHallInterior } from "./CommissionHallInterior";
import { PlazaHall, type HallFrame } from "./PlazaHall";
import type { SceneContext } from "./SceneContext";
import type { HallBoard, HallDesign, HallTexts } from "./WorldTypes";

/**
 * "Sala de encargos": the workshop where visitors commission a one-of-a-kind piece, in green.
 * Inside are the front desk, the wall of AI designs, the offers board and a workbench.
 */
export class CommissionHall extends PlazaHall {
  private interiorPart: CommissionHallInterior | null = null;

  constructor(
    ctx: SceneContext,
    position: Vector3,
    target: Vector3,
    private readonly texts: HallTexts,
  ) {
    super(ctx, "commissionHall", position, target, { facade: texts.facade, accent: ctx.materials.paintGreen, awning: ctx.materials.awningGreen });
  }

  private get interior(): CommissionHallInterior {
    if (!this.interiorPart) throw new Error("CommissionHall.build() must run first");
    return this.interiorPart;
  }

  get counterPoint(): Vector3 {
    return this.toWorld(this.interior.counterPoint);
  }

  get boardPoint(): Vector3 {
    return this.toWorld(this.interior.boardPoint);
  }

  get framePoints(): Vector3[] {
    return this.interior.framePoints.map((point) => this.toWorld(point));
  }

  setDesigns(designs: readonly HallDesign[], emptyLabel: string): void {
    this.interior.setDesigns(designs, emptyLabel);
  }

  setBoard(board: HallBoard): void {
    this.interior.setBoard(board);
  }

  protected buildInterior(frame: HallFrame): void {
    this.interiorPart = new CommissionHallInterior(this.ctx, this.root, frame, this.texts.inside);
    this.interiorPart.build();
  }
}
