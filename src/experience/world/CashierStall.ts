import { MeshBuilder } from "@babylonjs/core";
import { MeshFactory } from "./MeshFactory";
import { PlazaLayout } from "./PlazaLayout";
import type { SceneContext } from "./SceneContext";
import { Stall } from "./Stall";

/** "Caja": the stall where the visitor sees the cart and pays. */
export class CashierStall extends Stall {
  constructor(ctx: SceneContext) {
    super(ctx, {
      kind: "cashier",
      position: PlazaLayout.cashier,
      facing: Stall.facingTowards(PlazaLayout.cashier, PlazaLayout.center),
      sign: ["CAJA · CHECKOUT", "Carrito y pagos"],
      wall: ctx.materials.paintGreen,
      awning: ctx.materials.awning,
      trim: ctx.materials.paintRed,
    });
  }

  /** An old brass cash register, a varnished money box, paper bags and wrapped parcels. */
  protected buildWares(): void {
    const m = this.materials;
    // Cash register: body, sloped key panel, drawer and the number window.
    this.detail(this.place(MeshFactory.box(this.scene, "registerBody", 0.8, 0.42, 0.6, m.brass), 1.4, 1.46, 0.05));
    this.detail(this.place(MeshFactory.box(this.scene, "registerKeys", 0.8, 0.08, 0.42, m.woodDark), 1.4, 1.62, -0.22)).rotation.x = -0.45;
    this.detail(this.place(MeshFactory.box(this.scene, "registerDrawer", 0.86, 0.12, 0.64, m.woodDark), 1.4, 1.3, 0.05));
    this.detail(this.place(MeshFactory.box(this.scene, "registerWindow", 0.5, 0.22, 0.12, m.cream), 1.4, 1.79, 0.2));
    for (let i = 0; i < 8; i++) {
      const key = MeshBuilder.CreateCylinder("registerKey", { diameter: 0.07, height: 0.04, tessellation: 10 }, this.scene);
      key.material = m.cream;
      this.detail(this.place(key, 1.16 + (i % 4) * 0.16, 1.68 - Math.floor(i / 4) * 0.08, -0.22 - Math.floor(i / 4) * 0.14)).rotation.x = -0.45;
    }
    // Money box with a Barniz lid, and a roll of receipts.
    this.detail(this.place(MeshFactory.box(this.scene, "moneyBox", 0.5, 0.22, 0.34, m.varnish("#15100d")), 0.2, 1.36, -0.25));
    this.detail(this.place(MeshFactory.box(this.scene, "moneyLid", 0.52, 0.04, 0.36, m.varnish("#7e2419")), 0.2, 1.49, -0.25));
    const roll = MeshBuilder.CreateCylinder("receipts", { diameter: 0.16, height: 0.2, tessellation: 16 }, this.scene);
    roll.material = m.cream;
    this.detail(this.place(roll, -0.45, 1.33, -0.35)).rotation.z = Math.PI / 2;
    // Paper bags and parcels tied with string, waiting for their owners.
    [-1.9, -1.35].forEach((x, i) => {
      this.detail(this.place(MeshFactory.box(this.scene, "bag", 0.42, 0.5, 0.26, m.kraft), x, 1.5, 0.05 + i * 0.1));
    });
    ["#7e2419", "#c8922f", "#2f5d3a"].forEach((color, i) => {
      this.detail(this.place(MeshFactory.box(this.scene, "parcel", 0.5, 0.3, 0.32, m.kraft), -1.4 + i * 1.3, 2.11, 0.68));
      this.detail(this.place(MeshFactory.box(this.scene, "parcelString", 0.52, 0.32, 0.04, m.varnish(color)), -1.4 + i * 1.3, 2.11, 0.68));
    });
  }
}
