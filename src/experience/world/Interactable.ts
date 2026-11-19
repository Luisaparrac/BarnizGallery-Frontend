import type { Vector3 } from "@babylonjs/core";
import type { SalaBuilding } from "./SalaBuilding";
import type { Vitrina } from "./Vitrina";
import type { StallKind } from "./WorldTypes";

/** Something the visitor can use with the E key when standing close enough. */
export abstract class Interactable {
  protected constructor(
    readonly position: Vector3,
    readonly radius: number,
  ) {}
}

/** A stall of the plaza: the welcome kiosk, the cashier or the commissions workshop. */
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

/** A display case inside a sala. */
export class PieceInteractable extends Interactable {
  constructor(
    position: Vector3,
    readonly vitrina: Vitrina,
    radius = 1.3,
  ) {
    super(position, radius);
  }
}
