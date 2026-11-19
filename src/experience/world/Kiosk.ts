import { MeshBuilder } from "@babylonjs/core";
import { PlazaLayout } from "./PlazaLayout";
import type { SceneContext } from "./SceneContext";
import { Stall } from "./Stall";

/** Welcome kiosk: the stall where the visitor fills in the taste questionnaire. */
export class Kiosk extends Stall {
  constructor(ctx: SceneContext) {
    super(ctx, {
      kind: "welcome",
      position: PlazaLayout.kiosk,
      facing: 0,
      sign: ["BIENVENIDA · WELCOME", "Quiosco de MUSEO"],
      wall: ctx.materials.paintRed,
      awning: ctx.materials.awning,
    });
  }

  /** Varnished trays (clear-coat finish) and jars on the shelves, and a brass service bell. */
  protected buildWares(): void {
    const m = this.materials;
    ["#7e2419", "#2f5d3a", "#c8922f", "#15100d"].forEach((color, i) => {
      const tray = MeshBuilder.CreateCylinder("tray", { diameter: 0.72, height: 0.05, tessellation: 40 }, this.scene);
      tray.material = m.varnish(color);
      this.detail(this.place(tray, -1.65 + i * 1.1, 1.38, -0.15)).rotation.x = -0.4;
      const stand = MeshBuilder.CreateCylinder("trayStand", { diameterTop: 0.1, diameterBottom: 0.2, height: 0.22, tessellation: 12 }, this.scene);
      stand.material = m.iron;
      this.detail(this.place(stand, -1.65 + i * 1.1, 1.3, -0.1));
    });
    ["#7e2419", "#c8922f", "#2f5d3a", "#7e2419", "#c8922f"].forEach((color, i) => {
      const jar = MeshBuilder.CreateCylinder("jar", { diameterTop: 0.2, diameterBottom: 0.26, height: 0.34, tessellation: 20 }, this.scene);
      jar.material = m.varnish(color);
      this.detail(this.place(jar, -1.7 + i * 0.85, 2.12, 0.68));
    });
    const bell = MeshBuilder.CreateSphere("bell", { diameter: 0.22, segments: 14, slice: 0.55 }, this.scene);
    bell.material = m.brass;
    this.detail(this.place(bell, 2.0, 1.28, -0.55));
  }
}
