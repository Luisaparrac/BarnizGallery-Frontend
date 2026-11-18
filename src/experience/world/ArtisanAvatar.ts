import { Mesh, MeshBuilder, TransformNode, type Material, type Scene } from "@babylonjs/core";
import type { MaterialLibrary } from "./MaterialLibrary";
import type { ShadowRig } from "./ShadowRig";

/**
 * The visitor's avatar: a Pasto artisan in a striped wool ruana and a straw hat, built from primitives.
 * Local +z is "forward" and the node origin sits at the feet.
 */
export class ArtisanAvatar {
  readonly root: TransformNode;
  private readonly meshes: Mesh[] = [];
  private readonly legs: TransformNode[] = [];
  private readonly arms: TransformNode[] = [];
  private readonly body: TransformNode;
  private walkPhase = 0;
  private walkAmount = 0;

  constructor(
    private readonly scene: Scene,
    private readonly materials: MaterialLibrary,
    shadows: ShadowRig,
  ) {
    this.root = new TransformNode("artisan", scene);
    this.body = new TransformNode("artisanBody", scene);
    this.body.parent = this.root;
    this.buildLegs();
    this.buildTorso();
    this.buildHead();
    this.buildHat();
    this.meshes.forEach((mesh) => {
      shadows.addCaster(mesh);
      shadows.receive(mesh);
      mesh.isPickable = false;
    });
  }

  setVisible(visible: boolean): void {
    this.root.setEnabled(visible);
  }

  /** Advances the walk cycle. `speed` is 0 (idle), 1 (walking) or ~1.8 (running). */
  animate(deltaSeconds: number, speed: number): void {
    this.walkAmount += (Math.min(speed, 1.8) - this.walkAmount) * Math.min(1, deltaSeconds * 10);
    this.walkPhase += deltaSeconds * (4 + this.walkAmount * 4);
    const intensity = Math.min(this.walkAmount, 1.2);
    const swing = Math.sin(this.walkPhase) * 0.75 * intensity;
    this.legs[0].rotation.x = swing;
    this.legs[1].rotation.x = -swing;
    this.arms[0].rotation.x = -swing * 0.6;
    this.arms[1].rotation.x = swing * 0.6;
    this.body.position.y = Math.abs(Math.sin(this.walkPhase)) * 0.035 * intensity;
    this.body.rotation.z = Math.sin(this.walkPhase) * 0.03 * intensity;
  }

  // ---------------------------------------------------------------- parts

  private add(mesh: Mesh, material: Material, parent: TransformNode = this.body): Mesh {
    mesh.material = material;
    mesh.parent = parent;
    this.meshes.push(mesh);
    return mesh;
  }

  private buildLegs(): void {
    const m = this.materials;
    for (const side of [-1, 1]) {
      const hip = new TransformNode(`hip${side}`, this.scene);
      hip.parent = this.root;
      hip.position.set(side * 0.12, 0.82, 0);
      this.legs.push(hip);
      this.add(this.at(MeshBuilder.CreateCylinder("leg", { diameterTop: 0.17, diameterBottom: 0.13, height: 0.66, tessellation: 14 }, this.scene), 0, -0.33, 0), m.cloth, hip);
      const shoe = this.add(MeshBuilder.CreateBox("shoe", { width: 0.15, height: 0.1, depth: 0.28 }, this.scene), m.leather, hip);
      shoe.position.set(0, -0.69, 0.05);
      const sole = this.add(MeshBuilder.CreateBox("sole", { width: 0.16, height: 0.03, depth: 0.3 }, this.scene), m.felt, hip);
      sole.position.set(0, -0.74, 0.05);
    }
  }

  private buildTorso(): void {
    const m = this.materials;
    // Shirt under the ruana.
    this.add(this.at(MeshBuilder.CreateCylinder("shirt", { diameterTop: 0.34, diameterBottom: 0.36, height: 0.5, tessellation: 18 }, this.scene), 0, 1.15, 0), m.cream);
    // Ruana: wide striped poncho with a fringed hem and a dark neck opening.
    this.add(this.at(MeshBuilder.CreateCylinder("ruana", { diameterTop: 0.4, diameterBottom: 1.02, height: 0.95, tessellation: 36 }, this.scene), 0, 1.07, 0), m.wool);
    this.add(this.at(MeshBuilder.CreateTorus("neckOpening", { diameter: 0.36, thickness: 0.07, tessellation: 24 }, this.scene), 0, 1.545, 0), m.felt);
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2;
      const tassel = MeshBuilder.CreateBox("tassel", { width: 0.03, height: 0.09, depth: 0.012 }, this.scene);
      tassel.position.set(Math.sin(angle) * 0.51, 0.575, Math.cos(angle) * 0.51);
      tassel.rotation.y = angle;
      this.add(tassel, i % 2 ? m.cream : m.paintRed);
    }

    // Arms: only the cuffs and hands show below the ruana, and they swing while walking.
    for (const side of [-1, 1]) {
      const shoulder = new TransformNode(`shoulder${side}`, this.scene);
      shoulder.parent = this.root;
      shoulder.position.set(side * 0.3, 0.9, 0.02);
      this.arms.push(shoulder);
      this.add(this.at(MeshBuilder.CreateCylinder("cuff", { diameter: 0.11, height: 0.12, tessellation: 12 }, this.scene), 0, -0.2, 0.04), m.cream, shoulder);
      this.add(this.at(MeshBuilder.CreateSphere("hand", { diameter: 0.1, segments: 10 }, this.scene), 0, -0.3, 0.05), m.skin, shoulder);
    }

    // Cross-body fique bag.
    this.add(this.at(MeshBuilder.CreateBox("bag", { width: 0.1, height: 0.24, depth: 0.28 }, this.scene), 0.5, 0.74, 0), m.leather);
    this.add(this.at(MeshBuilder.CreateTorus("strap", { diameter: 0.5, thickness: 0.025, tessellation: 24 }, this.scene), 0.02, 1.3, 0), m.leather).rotation.z = 0.6;
  }

  private buildHead(): void {
    const m = this.materials;
    this.add(this.at(MeshBuilder.CreateCylinder("neck", { diameter: 0.11, height: 0.12, tessellation: 12 }, this.scene), 0, 1.6, 0), m.skin);
    const head = this.add(this.at(MeshBuilder.CreateSphere("head", { diameter: 0.26, segments: 24 }, this.scene), 0, 1.72, 0), m.skin);
    head.scaling.set(0.95, 1.08, 1);
    this.add(this.at(MeshBuilder.CreateSphere("nose", { diameter: 0.045, segments: 8 }, this.scene), 0, 1.7, 0.125), m.skin);
    for (const side of [-1, 1]) {
      this.add(this.at(MeshBuilder.CreateSphere("eye", { diameter: 0.028, segments: 8 }, this.scene), side * 0.05, 1.745, 0.118), m.felt);
      this.add(this.at(MeshBuilder.CreateBox("brow", { width: 0.06, height: 0.012, depth: 0.012 }, this.scene), side * 0.05, 1.775, 0.118), m.felt);
      this.add(this.at(MeshBuilder.CreateSphere("ear", { diameter: 0.05, segments: 8 }, this.scene), side * 0.125, 1.72, 0), m.skin).scaling.z = 0.5;
    }
    this.add(this.at(MeshBuilder.CreateBox("moustache", { width: 0.11, height: 0.02, depth: 0.02 }, this.scene), 0, 1.655, 0.12), m.felt);
    // Hair visible under the hat brim.
    const hair = this.add(this.at(MeshBuilder.CreateSphere("hair", { diameter: 0.275, segments: 18, slice: 0.55 }, this.scene), 0, 1.745, -0.01), m.felt);
    hair.rotation.x = -0.15;
  }

  private buildHat(): void {
    const m = this.materials;
    this.add(this.at(MeshBuilder.CreateCylinder("brim", { diameter: 0.66, height: 0.02, tessellation: 40 }, this.scene), 0, 1.81, 0), m.straw);
    this.add(this.at(MeshBuilder.CreateTorus("brimEdge", { diameter: 0.66, thickness: 0.02, tessellation: 40 }, this.scene), 0, 1.81, 0), m.straw);
    this.add(this.at(MeshBuilder.CreateCylinder("crown", { diameterTop: 0.2, diameterBottom: 0.27, height: 0.16, tessellation: 28 }, this.scene), 0, 1.89, 0), m.straw);
    this.add(this.at(MeshBuilder.CreateCylinder("crownTop", { diameter: 0.2, height: 0.01, tessellation: 28 }, this.scene), 0, 1.97, 0), m.straw);
    this.add(this.at(MeshBuilder.CreateCylinder("hatBand", { diameter: 0.275, height: 0.04, tessellation: 28 }, this.scene), 0, 1.835, 0), m.felt);
  }

  private at(mesh: Mesh, x: number, y: number, z: number): Mesh {
    mesh.position.set(x, y, z);
    return mesh;
  }
}
