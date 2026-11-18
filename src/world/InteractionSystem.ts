import type { Vector3 } from "@babylonjs/core";
import { Signal } from "../core/Signal";
import type { Interactable } from "./Interactable";

/** Finds the interactable closest to the player and raises it when the visitor presses E. */
export class InteractionSystem {
  readonly nearbyChanged = new Signal<Interactable | null>();
  readonly activated = new Signal<Interactable>();

  private readonly items: Interactable[] = [];
  private nearby: Interactable | null = null;

  register(item: Interactable): void {
    this.items.push(item);
  }

  get current(): Interactable | null {
    return this.nearby;
  }

  update(playerPosition: Vector3): void {
    let best: Interactable | null = null;
    let bestDistance = Infinity;
    for (const item of this.items) {
      const distance = Math.hypot(item.position.x - playerPosition.x, item.position.z - playerPosition.z);
      if (distance < item.radius && distance < bestDistance) {
        best = item;
        bestDistance = distance;
      }
    }
    if (best !== this.nearby) {
      this.nearby = best;
      this.nearbyChanged.emit(best);
    }
  }

  activateNearby(): void {
    if (this.nearby) this.activated.emit(this.nearby);
  }
}
