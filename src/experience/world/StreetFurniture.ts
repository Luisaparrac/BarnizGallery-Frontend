import { MeshBuilder, Vector3, type Mesh } from "@babylonjs/core";
import { MeshFactory } from "./MeshFactory";
import { PlazaLayout } from "./PlazaLayout";
import { SceneComponent } from "./SceneComponent";
import type { SceneContext } from "./SceneContext";

/** Wrought-iron lamp posts and wooden benches. */
export class StreetFurniture extends SceneComponent {
  constructor(ctx: SceneContext) {
    super(ctx);
  }

  build(): void {
    for (const x of [-9, 9]) for (const z of [-44, -26, -2, 20]) this.lampPost(x, z);
    this.lampPost(-8, -PlazaLayout.wallHalf + 3);
    this.lampPost(8, -PlazaLayout.wallHalf + 3);

    const { x, z } = PlazaLayout.fountain;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
      this.bench(x + Math.cos(angle) * 8.6, z + Math.sin(angle) * 8.6, Math.atan2(Math.cos(angle), Math.sin(angle)));
    }
    this.flushDetails("furniture");
  }

  private lampPost(x: number, z: number): void {
    const m = this.materials;
    const part = (mesh: Mesh, y: number, material = m.iron) => {
      mesh.material = material;
      mesh.position.set(x, y, z);
      return this.detail(mesh);
    };
    part(MeshBuilder.CreateCylinder("lampBase", { diameterTop: 0.28, diameterBottom: 0.5, height: 0.7, tessellation: 12 }, this.scene), 0.35);
    part(MeshBuilder.CreateCylinder("lampPole", { diameter: 0.13, height: 3.7, tessellation: 12 }, this.scene), 2.3);
    part(MeshBuilder.CreateTorus("lampCollar", { diameter: 0.26, thickness: 0.06, tessellation: 16 }, this.scene), 1.0);
    part(MeshBuilder.CreateCylinder("lampCradle", { diameterTop: 0.55, diameterBottom: 0.3, height: 0.18, tessellation: 4 }, this.scene), 4.2).rotation.y = Math.PI / 4;
    const glass = MeshBuilder.CreateBox("lampGlass", { width: 0.34, height: 0.55, depth: 0.34 }, this.scene);
    part(glass, 4.55, m.glowLamp);
    const cap = MeshBuilder.CreateCylinder("lampCap", { diameterTop: 0.04, diameterBottom: 0.62, height: 0.3, tessellation: 4 }, this.scene);
    part(cap, 5.0).rotation.y = Math.PI / 4;
    part(MeshBuilder.CreateSphere("lampFinial", { diameter: 0.1, segments: 8 }, this.scene), 5.2, m.brass);
    this.collider("lampCollider", new Vector3(x, 1.5, z), 0.5, 3, 0.5);
  }

  private bench(x: number, z: number, rotationY: number): void {
    const m = this.materials;
    const place = (mesh: Mesh, lx: number, ly: number, lz: number, tilt = 0) => {
      const cos = Math.cos(rotationY);
      const sin = Math.sin(rotationY);
      mesh.position.set(x + lx * cos + lz * sin, ly, z - lx * sin + lz * cos);
      mesh.rotation.y = rotationY;
      mesh.rotation.x = tilt;
      return this.detail(mesh);
    };
    for (let i = 0; i < 4; i++) place(MeshFactory.box(this.scene, "seatSlat", 2.2, 0.05, 0.1, m.woodWarm, 1), 0, 0.46, -0.24 + i * 0.16);
    for (let i = 0; i < 3; i++) place(MeshFactory.box(this.scene, "backSlat", 2.2, 0.12, 0.04, m.woodWarm, 1), 0, 0.72 + i * 0.17, 0.34, -0.12);
    for (const side of [-1, 1]) {
      place(MeshFactory.box(this.scene, "benchLeg", 0.06, 0.46, 0.6, m.iron), side * 1.0, 0.23, 0);
      place(MeshFactory.box(this.scene, "benchArm", 0.06, 0.06, 0.62, m.iron), side * 1.0, 0.62, 0.02);
      place(MeshFactory.box(this.scene, "benchBack", 0.06, 0.62, 0.06, m.iron), side * 1.0, 0.7, 0.34, -0.12);
    }
    this.collider("benchCollider", new Vector3(x, 0.45, z), 2.3, 0.9, 0.9).rotation.y = rotationY;
  }
}
