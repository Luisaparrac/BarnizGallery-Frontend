import { Color3, Mesh, MeshBuilder, VertexBuffer, VertexData, type InstancedMesh } from "@babylonjs/core";
import { SeededRandom } from "../core/SeededRandom";
import { ValueNoise } from "../core/ValueNoise";
import { SceneComponent } from "./SceneComponent";
import type { SceneContext } from "./SceneContext";

interface TreeTemplate {
  trunk: Mesh;
  canopy: Mesh;
}

/** Trees, planters with flower beds and low hedges. */
export class Vegetation extends SceneComponent {
  private readonly noise = new ValueNoise(5);
  private readonly random = new SeededRandom(77);

  constructor(ctx: SceneContext) {
    super(ctx);
  }

  build(): void {
    const templates = [this.createTreeTemplate(1), this.createTreeTemplate(2), this.createTreeTemplate(3)];
    const positions: [number, number][] = [
      [-21, 21],
      [21, 21],
      [-21, -4],
      [21, -4],
      [-21, -32],
      [21, -32],
      [-48, 0],
      [48, 0],
      [0, 52],
      [-30, 52],
      [30, 52],
    ];
    positions.forEach(([x, z], index) => this.plantTree(templates[index % templates.length], x, z, 0.9 + this.random.next() * 0.35));
    templates.forEach((template) => {
      template.trunk.setEnabled(false);
      template.canopy.setEnabled(false);
    });

    this.buildPlanters();
    this.flushDetails("vegetation", true);
  }

  private plantTree(template: TreeTemplate, x: number, z: number, scale: number): void {
    const rotation = this.random.next() * Math.PI * 2;
    const trunk = template.trunk.createInstance(`trunk-${x}-${z}`);
    const canopy = template.canopy.createInstance(`canopy-${x}-${z}`);
    for (const part of [trunk, canopy] as InstancedMesh[]) {
      part.position.set(x, 0, z);
      part.rotation.y = rotation;
      part.scaling.setAll(scale);
      this.ctx.shadows.addCaster(part);
      part.isPickable = false;
    }
    trunk.checkCollisions = true;
  }

  /** One tree variant: tapered trunk and a canopy of lumpy, noise-displaced spheres with vertex colours. */
  private createTreeTemplate(variant: number): TreeTemplate {
    const trunk = MeshBuilder.CreateCylinder(`trunkTemplate${variant}`, { diameterTop: 0.34, diameterBottom: 0.62, height: 3.6, tessellation: 12 }, this.scene);
    trunk.material = this.materials.bark;
    trunk.position.y = 1.8;
    trunk.bakeCurrentTransformIntoVertices();

    const lumps: Mesh[] = [];
    const specs: [number, number, number, number][] = [
      [0, 4.9, 0, 2.5],
      [1.5, 4.4, 0.6, 1.9],
      [-1.4, 4.5, -0.7, 2.0],
      [0.3, 5.9, -0.3, 1.7],
      [0.2, 4.2, 1.5, 1.6],
    ];
    specs.forEach(([ox, oy, oz, radius], i) => {
      const lump = MeshBuilder.CreateIcoSphere(`lump${variant}-${i}`, { radius, subdivisions: 4 }, this.scene);
      this.displace(lump, variant * 10 + i, radius);
      lump.position.set(ox, oy, oz);
      lump.bakeCurrentTransformIntoVertices();
      lump.material = this.materials.foliage;
      lumps.push(lump);
    });
    const canopy = Mesh.MergeMeshes(lumps, true, true)!;
    canopy.name = `canopyTemplate${variant}`;
    canopy.material = this.materials.foliage;
    return { trunk, canopy };
  }

  /** Displaces a sphere with noise and paints a dark-to-light green gradient on it. */
  private displace(mesh: Mesh, seed: number, radius: number): void {
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind)!;
    const colors = new Float32Array((positions.length / 3) * 4);
    const dark = new Color3(0.16, 0.3, 0.12);
    const light = new Color3(0.45, 0.62, 0.22);
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      const bump = 0.78 + 0.5 * this.noise.fbm(x * 0.9 + seed, z * 0.9 + y * 0.7, 3);
      positions[i] = x * bump;
      positions[i + 1] = y * bump * 0.88;
      positions[i + 2] = z * bump;
      const tone = Math.min(1, Math.max(0, (positions[i + 1] / radius) * 0.5 + 0.5 + (this.noise.sample(x * 2 + seed, z * 2) - 0.5) * 0.3));
      const color = Color3.Lerp(dark, light, tone);
      const c = (i / 3) * 4;
      colors[c] = color.r;
      colors[c + 1] = color.g;
      colors[c + 2] = color.b;
      colors[c + 3] = 1;
    }
    mesh.updateVerticesData(VertexBuffer.PositionKind, positions);
    mesh.setVerticesData(VertexBuffer.ColorKind, colors);
    const normals: number[] = [];
    VertexData.ComputeNormals(positions, mesh.getIndices()!, normals);
    mesh.updateVerticesData(VertexBuffer.NormalKind, normals);
  }

  /** Stone planters with hedges and tiny flowers. */
  private buildPlanters(): void {
    const flowerColors = ["#c0392b", "#e6b83a", "#f3ead2", "#d9566f", "#7a4fb0"].map((hex) => Color3.FromHexString(hex));
    const spots: [number, number, number][] = [
      [-9, -9, 0],
      [9, -9, 0],
      [-9, -21, 0],
      [9, -21, 0],
      [-22, 6, Math.PI / 2],
      [22, 6, Math.PI / 2],
    ];
    const flowers: Mesh[] = [];
    spots.forEach(([x, z, rotation], index) => {
      const w = 4.2;
      const d = 1.4;
      const planter = MeshBuilder.CreateBox(`planter${index}`, { width: w, height: 0.6, depth: d }, this.scene);
      planter.material = this.materials.limestone;
      planter.position.set(x, 0.3, z);
      planter.rotation.y = rotation;
      this.solid(planter);
      const soil = MeshBuilder.CreateBox("soil", { width: w - 0.2, height: 0.12, depth: d - 0.2 }, this.scene);
      soil.material = this.materials.bark;
      soil.position.set(x, 0.62, z);
      soil.rotation.y = rotation;
      this.detail(soil);

      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      for (let i = 0; i < 46; i++) {
        const lx = (this.random.next() - 0.5) * (w - 0.5);
        const lz = (this.random.next() - 0.5) * (d - 0.5);
        const bloom = MeshBuilder.CreateIcoSphere("bloom", { radius: 0.12 + this.random.next() * 0.08, subdivisions: 1 }, this.scene);
        bloom.position.set(x + lx * cos + lz * sin, 0.78 + this.random.next() * 0.3, z - lx * sin + lz * cos);
        const color = this.random.next() > 0.3 ? flowerColors[Math.floor(this.random.next() * flowerColors.length)] : new Color3(0.24, 0.45, 0.2);
        const count = bloom.getTotalVertices();
        const data = new Float32Array(count * 4);
        for (let v = 0; v < count; v++) data.set([color.r, color.g, color.b, 1], v * 4);
        bloom.setVerticesData(VertexBuffer.ColorKind, data);
        bloom.material = this.materials.flowerBed;
        bloom.isPickable = false;
        flowers.push(bloom);
      }
    });
    const merged = Mesh.MergeMeshes(flowers, true, true);
    if (merged) {
      merged.name = "flowerBeds";
      merged.material = this.materials.flowerBed;
      this.ctx.shadows.receive(merged);
    }
  }
}
