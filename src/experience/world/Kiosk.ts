import { MeshBuilder } from "@babylonjs/core";
import { MeshFactory } from "./MeshFactory";
import { PlazaLayout } from "./PlazaLayout";
import { SceneComponent } from "./SceneComponent";
import type { SceneContext } from "./SceneContext";

/** Welcome kiosk: a wooden stall with a striped awning where the visitor fills in the taste questionnaire. */
export class Kiosk extends SceneComponent {
  constructor(ctx: SceneContext) {
    super(ctx);
  }

  build(): void {
    const { x, z } = PlazaLayout.kiosk;
    const m = this.materials;

    const counter = MeshFactory.box(this.scene, "kioskCounter", 5.2, 1.15, 1.7, m.woodWarm, 2);
    counter.position.set(x, 0.575, z);
    this.solid(counter);
    this.detail(MeshFactory.box(this.scene, "counterTop", 5.5, 0.1, 2.0, m.woodDark, 2)).position.set(x, 1.2, z);
    // Panels on the front of the counter.
    for (let i = -2; i <= 2; i++) {
      this.detail(MeshFactory.box(this.scene, "counterPanel", 0.85, 0.7, 0.05, m.woodDark, 2)).position.set(x + i * 1.0, 0.58, z - 0.86);
    }

    // Posts and back wall.
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        this.detail(MeshFactory.box(this.scene, "post", 0.2, 3.3, 0.2, m.woodDark, 2)).position.set(x + sx * 2.55, 1.65, z + sz * 0.9);
      }
    }
    this.detail(MeshFactory.box(this.scene, "backWall", 5.1, 2.3, 0.14, m.paintRed)).position.set(x, 2.35, z + 0.9);
    for (const shelfY of [1.9, 2.55]) {
      this.detail(MeshFactory.box(this.scene, "shelf", 4.3, 0.07, 0.4, m.woodWarm, 2)).position.set(x, shelfY, z + 0.68);
    }

    // Awning: a slightly tilted striped cloth with a scalloped valance.
    const awning = MeshBuilder.CreateBox("awning", { width: 6.2, height: 0.08, depth: 3.4 }, this.scene);
    awning.material = m.awning;
    awning.rotation.x = -0.2;
    awning.position.set(x, 3.4, z - 0.15);
    this.detail(awning);
    for (let i = 0; i < 20; i++) {
      const flap = MeshBuilder.CreateCylinder("valance", { diameter: 0.31, height: 0.06, tessellation: 12 }, this.scene);
      flap.material = i % 2 ? m.cream : m.paintRed;
      flap.rotation.x = Math.PI / 2;
      flap.position.set(x - 3.0 + i * 0.315, 3.12, z - 1.85);
      this.detail(flap);
    }

    // Hanging sign.
    const board = this.materials.signBoard(["BIENVENIDA · WELCOME", "Quiosco de MUSEO"], 768, 192);
    const sign = MeshBuilder.CreatePlane("kioskSign", { width: 3.9, height: 0.98 }, this.scene);
    sign.material = board;
    sign.position.set(x, 2.55, z - 1.0);
    sign.isPickable = false;
    for (const sx of [-1, 1]) {
      const chain = MeshBuilder.CreateCylinder("chain", { diameter: 0.03, height: 0.7, tessellation: 6 }, this.scene);
      chain.material = m.iron;
      chain.position.set(x + sx * 1.8, 3.0, z - 1.0);
      this.detail(chain);
    }

    // Varnished trays (clear-coat finish) and jars on the shelves.
    ["#7e2419", "#2f5d3a", "#c8922f", "#15100d"].forEach((color, i) => {
      const tray = MeshBuilder.CreateCylinder("tray", { diameter: 0.72, height: 0.05, tessellation: 40 }, this.scene);
      tray.material = m.varnish(color);
      tray.rotation.x = -0.4;
      tray.position.set(x - 1.65 + i * 1.1, 1.38, z - 0.15);
      this.detail(tray);
      const stand = MeshBuilder.CreateCylinder("trayStand", { diameterTop: 0.1, diameterBottom: 0.2, height: 0.22, tessellation: 12 }, this.scene);
      stand.material = m.iron;
      stand.position.set(x - 1.65 + i * 1.1, 1.3, z - 0.1);
      this.detail(stand);
    });
    ["#7e2419", "#c8922f", "#2f5d3a", "#7e2419", "#c8922f"].forEach((color, i) => {
      const jar = MeshBuilder.CreateCylinder("jar", { diameterTop: 0.2, diameterBottom: 0.26, height: 0.34, tessellation: 20 }, this.scene);
      jar.material = m.varnish(color);
      jar.position.set(x - 1.7 + i * 0.85, 2.12, z + 0.68);
      this.detail(jar);
    });

    // Brass service bell.
    const bell = MeshBuilder.CreateSphere("bell", { diameter: 0.22, segments: 14, slice: 0.55 }, this.scene);
    bell.material = m.brass;
    bell.position.set(x + 2.0, 1.28, z - 0.55);
    this.detail(bell);

    this.flushDetails("kiosk");
  }
}
