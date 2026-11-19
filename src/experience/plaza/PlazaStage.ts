import { VisitorSetupStore } from "../../core/VisitorSetupStore";
import type { Scene } from "@babylonjs/core";
import type { User } from "../../domain/user";
import type { Localizer } from "../../i18n/Localizer";
import type { Stage } from "../Stage";
import { ExperienceUi } from "../ui/ExperienceUi";
import { World } from "../world/World";
import type { WorldRoom } from "../world/WorldTypes";

export interface PlazaOptions {
  i18n: Localizer;
  user: User | null;
  rooms: readonly WorldRoom[];
  avatarCode: string | null;
  quality: string | null;
}

/**
 * The plaza with the masters' salas: the world, the visitor's avatar and the 3D interface.
 * The controls board shows on the first visit in this browser; later only from the HUD button.
 */
export class PlazaStage implements Stage {
  readonly world: World;
  private readonly ui: ExperienceUi;
  private readonly avatarCode: string | null;

  /** Throws when the browser has no WebGL. */
  constructor(canvas: HTMLCanvasElement, options: PlazaOptions) {
    this.world = new World(canvas, options.rooms, options.quality, options.avatarCode);
    this.world.setPlaying(false);
    this.ui = new ExperienceUi(this.world, options.i18n, options.user);
    this.avatarCode = options.avatarCode;
  }

  get scene(): Scene {
    return this.world.scene;
  }

  /** Swaps in the avatar's .glb if there is one and gives the plaza to the visitor. */
  async start(): Promise<void> {
    await this.world.useAvatar(this.avatarCode).catch(() => undefined);
    const firstVisit = !VisitorSetupStore.controlsSeen();
    if (firstVisit) VisitorSetupStore.markControlsSeen();
    this.ui.start(firstVisit);
  }

  dispose(): void {
    this.ui.dispose();
    this.world.dispose();
  }
}
