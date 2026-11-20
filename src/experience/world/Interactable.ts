import type { Vector3 } from "@babylonjs/core";
import type { SalaBuilding } from "./SalaBuilding";
import type { ArtworkFrame } from "./ArtworkFrame";
import type { StallKind } from "./WorldTypes";

/** Something the visitor can use with the E key when standing close enough. */
export abstract class Interactable {
  protected constructor(
    readonly position: Vector3,
    readonly radius: number,
  ) {}
}

/** A counter of the plaza: the welcome kiosk, the cashier or the front desk of the commissions hall. */
export class StallInteractable extends Interactable {
  constructor(
    position: Vector3,
    readonly kind: StallKind,
    radius = 4.2,
  ) {
    super(position, radius);
  }
}

/** The open door of a sala: shows whose sala it is and how many pieces it holds. */
export class DoorInteractable extends Interactable {
  constructor(
    position: Vector3,
    readonly sala: SalaBuilding,
    radius = 4.2,
  ) {
    super(position, radius);
  }
}

/** A framed piece on the wall of a sala. */
export class PieceInteractable extends Interactable {
  constructor(
    position: Vector3,
    readonly frame: ArtworkFrame,
    radius = 1.6,
  ) {
    super(position, radius);
  }
}

/** The open door of the commissions hall: says what the hall is for. */
export class HallDoorInteractable extends Interactable {
  constructor(position: Vector3, radius = 4.2) {
    super(position, radius);
  }
}

/** One frame of the design wall in the commissions hall (by its index). */
export class DesignFrameInteractable extends Interactable {
  constructor(
    position: Vector3,
    readonly index: number,
    radius = 1.15,
  ) {
    super(position, radius);
  }
}

/** The offers chalkboard of the commissions hall. */
export class OffersBoardInteractable extends Interactable {
  constructor(position: Vector3, radius = 1.8) {
    super(position, radius);
  }
}
