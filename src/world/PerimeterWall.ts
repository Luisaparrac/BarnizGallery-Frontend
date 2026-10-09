import { MeshBuilder, Vector3 } from "@babylonjs/core";
import { MeshFactory } from "./MeshFactory";
import { PlazaLayout } from "./PlazaLayout";
import { SceneComponent } from "./SceneComponent";
import type { SceneContext } from "./SceneContext";

/** Whitewashed wall around the plaza, with buttresses and an entrance gate in the south. */
export class PerimeterWall extends SceneComponent {
  private static readonly HEIGHT = 3.6;
  private static readonly THICKNESS = 0.8;

  constructor(ctx: SceneContext) {
    super(ctx);
  }

  build(): void {
    const half = PlazaLayout.wallHalf;
    const gate = PlazaLayout.gateHalf;
    const span = half - gate;

    this.wall(half * 2, PerimeterWall.THICKNESS, 0, half);
    this.wall(PerimeterWall.THICKNESS, half * 2, half, 0);
    this.wall(PerimeterWall.THICKNESS, half * 2, -half, 0);
    this.wall(span, PerimeterWall.THICKNESS, gate + span / 2, -half);
    this.wall(span, PerimeterWall.THICKNESS, -(gate + span / 2), -half);

    this.buildButtresses(half);
    this.buildGate(half, gate);

    // Invisible barrier beyond the gate so the visitor cannot wander off the map.
    this.collider("barrier", new Vector3(0, 2, -half - 6), gate * 2 + 4, 4, 1);
    this.flushDetails("wall");
  }

  private wall(width: number, depth: number, x: number, z: number): void {
    const { HEIGHT } = PerimeterWall;
    const body = MeshFactory.box(this.scene, "wall", width, HEIGHT, depth, this.materials.plaster, 4);
    body.position.set(x, HEIGHT / 2, z);
    this.solid(body);
    const alongX = width > depth;
    const cap = this.detail(MeshFactory.box(this.scene, "wallCap", width + (alongX ? 0.2 : 0.5), 0.28, depth + (alongX ? 0.5 : 0.2), this.materials.roofTile, 3));
    cap.position.set(x, HEIGHT + 0.14, z);
  }

  /** Square buttresses every 14 m along the inside of the walls. */
  private buildButtresses(half: number): void {
    const { HEIGHT } = PerimeterWall;
    const inset = PerimeterWall.THICKNESS / 2 + 0.35;
    const place = (x: number, z: number) => {
      const post = this.detail(MeshFactory.box(this.scene, "buttress", 0.9, HEIGHT + 0.5, 0.9, this.materials.limestone, 1.5));
      post.position.set(x, (HEIGHT + 0.5) / 2, z);
      const top = this.detail(MeshFactory.box(this.scene, "buttressTop", 1.2, 0.25, 1.2, this.materials.roofTile, 1.5));
      top.position.set(x, HEIGHT + 0.62, z);
    };
    for (let p = -half + 14; p < half - 1; p += 14) {
      place(p, half - inset);
      place(half - inset, p);
      place(-half + inset, p);
      if (Math.abs(p) > PlazaLayout.gateHalf + 3) place(p, -half + inset);
    }
  }

  private buildGate(half: number, gate: number): void {
    for (const side of [-1, 1]) {
      const x = side * (gate + 0.8);
      const pillar = MeshFactory.box(this.scene, "gatePillar", 1.6, 6.2, 1.6, this.materials.plaster, 4);
      pillar.position.set(x, 3.1, -half);
      this.solid(pillar);
      const base = this.detail(MeshFactory.box(this.scene, "gateBase", 2, 0.9, 2, this.materials.limestone, 1.5));
      base.position.set(x, 0.45, -half);
      const cap = this.detail(MeshFactory.box(this.scene, "gateCap", 2.1, 0.3, 2.1, this.materials.limestone, 1.5));
      cap.position.set(x, 6.35, -half);
      const roof = MeshBuilder.CreateCylinder("gateRoof", { diameterTop: 0.1, diameterBottom: 2.2, height: 1.1, tessellation: 4 }, this.scene);
      roof.material = this.materials.roofTile;
      roof.rotation.y = Math.PI / 4;
      roof.position.set(x, 6.95, -half);
      this.detail(roof);
      const lamp = this.detail(MeshBuilder.CreateBox("gateLamp", { width: 0.36, height: 0.5, depth: 0.36 }, this.scene));
      lamp.material = this.materials.glowLamp;
      lamp.position.set(x - side * 1.05, 4.6, -half + 0.4);
    }

    const beam = MeshFactory.box(this.scene, "gateBeam", gate * 2 + 1.6, 1.5, 1.1, this.materials.woodDark, 2);
    beam.position.set(0, 5.5, -half);
    this.solid(beam);

    const board = this.materials.signBoard(["MUSEO", "Barniz de Pasto · Mopa-Mopa"], 1024, 224);
    for (const inside of [true, false]) {
      const plane = MeshBuilder.CreatePlane("gateSign", { width: 7.6, height: 1.2 }, this.scene);
      plane.material = board;
      plane.position.set(0, 5.5, -half + (inside ? 0.57 : -0.57));
      plane.rotation.y = inside ? Math.PI : 0;
      plane.isPickable = false;
    }
  }
}
