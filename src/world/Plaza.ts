import { MeshBuilder } from "@babylonjs/core";
import { MeshFactory } from "./MeshFactory";
import { PlazaLayout } from "./PlazaLayout";
import { SceneComponent } from "./SceneComponent";
import type { SceneContext } from "./SceneContext";

/** Cobbled ground, the paved central square with its rosette, and the stone curb around it. */
export class Plaza extends SceneComponent {
  constructor(ctx: SceneContext) {
    super(ctx);
  }

  build(): void {
    const groundSize = 200;
    const ground = MeshBuilder.CreateGround("cobbleGround", { width: groundSize, height: groundSize }, this.scene);
    this.materials.tile(this.materials.cobble, groundSize / 5.6, groundSize / 5.6);
    ground.material = this.materials.cobble;
    ground.receiveShadows = true;
    ground.isPickable = false;

    const { pavingWidth: width, pavingDepth: depth, fountain } = PlazaLayout;
    const pixelsPerMeter = 36.6;
    const set = this.materials.textures.plazaPaving(
      Math.round(width * pixelsPerMeter),
      Math.round(depth * pixelsPerMeter),
      (fountain.x + width / 2) / width,
      (fountain.z + depth / 2) / depth,
      1 / pixelsPerMeter,
    );
    this.materials.setPavingTextures(set);
    const paving = MeshBuilder.CreateGround("paving", { width, height: depth }, this.scene);
    paving.position.y = 0.03;
    paving.material = this.materials.paving;
    paving.receiveShadows = true;
    paving.isPickable = false;

    // Raised limestone curb around the paved square.
    const stone = this.materials.limestone;
    const curb = (w: number, d: number, x: number, z: number) =>
      this.detail(MeshFactory.box(this.scene, "curb", w, 0.18, d, stone, 1.5)).position.set(x, 0.09, z);
    curb(width + 1, 0.5, 0, depth / 2 + 0.25);
    curb(width + 1, 0.5, 0, -depth / 2 - 0.25);
    curb(0.5, depth, width / 2 + 0.25, 0);
    curb(0.5, depth, -width / 2 - 0.25, 0);

    // Entrance steps on the south side of the square, in line with the gate.
    for (let i = 0; i < 2; i++) {
      const step = this.detail(MeshFactory.box(this.scene, "plazaStep", 10 - i * 1.2, 0.1, 0.9, stone, 1.5));
      step.position.set(0, 0.05, -depth / 2 - 0.9 - i * 0.9);
    }

    this.flushDetails("plaza", false);
  }
}
