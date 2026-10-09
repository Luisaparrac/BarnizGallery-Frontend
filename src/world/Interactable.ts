import type { Vector3 } from "@babylonjs/core";
import type { SalaBuilding } from "./SalaBuilding";

/** Something the visitor can use with the E key when standing close enough. */
export abstract class Interactable {
  protected constructor(
    readonly position: Vector3,
    readonly radius: number,
  ) {}
}

export class KioskInteractable extends Interactable {
  constructor(position: Vector3, radius = 4.2) {
    super(position, radius);
  }
}

export class DoorInteractable extends Interactable {
  constructor(
    position: Vector3,
    readonly sala: SalaBuilding,
    radius = 4.2,
  ) {
    super(position, radius);
  }
}
