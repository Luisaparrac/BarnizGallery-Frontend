import { MeshBuilder } from "@babylonjs/core";
import { MeshFactory } from "./MeshFactory";
import { PlazaLayout } from "./PlazaLayout";
import type { SceneContext } from "./SceneContext";
import { Stall } from "./Stall";

/** "Taller de encargos": the stall where the visitor commissions a piece from the masters. */
export class CommissionStall extends Stall {
  constructor(ctx: SceneContext) {
    super(ctx, {
      kind: "commissions",
      position: PlazaLayout.commissions,
      facing: Stall.facingTowards(PlazaLayout.commissions, PlazaLayout.center),
      sign: ["TALLER · ENCARGOS", "Commissions · Pedidos a los maestros"],
      wall: ctx.materials.woodDark,
      awning: ctx.materials.awningGreen,
      trim: ctx.materials.paintGreen,
    });
  }

  /**
   * A Barniz de Pasto work in progress: a plate half covered with resin, a ball of mopa-mopa,
   * brushes in a jar, the knife, sketches pinned to the wall and finished pieces on the shelves.
   */
  protected buildWares(): void {
    const m = this.materials;
    const red = m.varnish("#7e2419");
    const green = m.varnish("#2f5d3a");
    const ochre = m.varnish("#c8922f");

    // The plate on the counter: bare wood, with a half circle already varnished in red.
    const plate = MeshBuilder.CreateCylinder("plate", { diameter: 0.7, height: 0.05, tessellation: 40 }, this.scene);
    plate.material = m.woodWarm;
    this.detail(this.place(plate, -0.2, 1.28, -0.3));
    const half = MeshBuilder.CreateCylinder("plateVarnish", { diameter: 0.66, height: 0.012, tessellation: 40, arc: 0.5 }, this.scene);
    half.material = red;
    this.detail(this.place(half, -0.2, 1.31, -0.3));
    // Mopa-mopa resin: a green ball and a thin stretched sheet beside it.
    const resin = MeshBuilder.CreateSphere("resin", { diameter: 0.2, segments: 12 }, this.scene);
    resin.material = green;
    this.detail(this.place(resin, 0.55, 1.35, -0.45));
    this.detail(this.place(MeshFactory.box(this.scene, "resinSheet", 0.28, 0.006, 0.2, green), 0.9, 1.26, -0.4));
    // The knife.
    this.detail(this.place(MeshFactory.box(this.scene, "knifeHandle", 0.14, 0.03, 0.04, m.woodDark), 1.3, 1.27, -0.55));
    this.detail(this.place(MeshFactory.box(this.scene, "knifeBlade", 0.12, 0.01, 0.03, m.iron), 1.43, 1.27, -0.55));
    // Brushes standing in a jar.
    const jar = MeshBuilder.CreateCylinder("brushJar", { diameterTop: 0.16, diameterBottom: 0.18, height: 0.2, tessellation: 16 }, this.scene);
    jar.material = ochre;
    this.detail(this.place(jar, -1.4, 1.35, -0.2));
    for (let i = 0; i < 5; i++) {
      const brush = MeshBuilder.CreateCylinder("brush", { diameter: 0.018, height: 0.36, tessellation: 6 }, this.scene);
      brush.material = m.woodDark;
      const angle = (i / 5) * Math.PI * 2;
      this.detail(this.place(brush, -1.4 + Math.cos(angle) * 0.035, 1.5, -0.2 + Math.sin(angle) * 0.035)).rotation.set(Math.sin(angle) * 0.12, 0, Math.cos(angle) * 0.12);
    }
    // Sketches pinned to the back wall.
    [-1.6, -0.55, 0.5, 1.55].forEach((x, i) => {
      this.detail(this.place(MeshFactory.box(this.scene, "sketch", 0.62, 0.46, 0.01, m.cream), x, 1.55 + (i % 2) * 0.06, 0.82)).rotation.z = (i % 2 ? 1 : -1) * 0.05;
      const pin = MeshBuilder.CreateSphere("pin", { diameter: 0.04, segments: 6 }, this.scene);
      pin.material = i % 2 ? red : green;
      this.detail(this.place(pin, x, 1.76 + (i % 2) * 0.06, 0.8));
    });
    // Finished pieces on the top shelf: a bowl, a box and a small plate.
    const bowl = MeshBuilder.CreateSphere("bowl", { diameter: 0.4, segments: 16, slice: 0.5 }, this.scene);
    bowl.material = red;
    this.detail(this.place(bowl, -1.4, 2.6, 0.68)).rotation.x = Math.PI;
    this.detail(this.place(MeshFactory.box(this.scene, "box", 0.4, 0.26, 0.28, green), 0, 2.72, 0.68));
    const small = MeshBuilder.CreateCylinder("smallPlate", { diameter: 0.38, height: 0.04, tessellation: 32 }, this.scene);
    small.material = ochre;
    this.detail(this.place(small, 1.4, 2.78, 0.75)).rotation.x = -1.2;
  }
}
