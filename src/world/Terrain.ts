import { Color3, MeshBuilder, VertexBuffer, VertexData } from "@babylonjs/core";
import { ValueNoise } from "../core/ValueNoise";
import { SceneComponent } from "./SceneComponent";
import type { SceneContext } from "./SceneContext";

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/** Distant hills and the Galeras volcano, tinted by height. The area around the plaza stays flat. */
export class Terrain extends SceneComponent {
  private static readonly SIZE = 2600;
  private static readonly VOLCANO = { x: -700, z: 1000, radius: 700, height: 430 };

  private readonly noise = new ValueNoise(12);
  private readonly fine = new ValueNoise(99);

  constructor(ctx: SceneContext) {
    super(ctx);
  }

  build(): void {
    const mesh = MeshBuilder.CreateGround("terrain", { width: Terrain.SIZE, height: Terrain.SIZE, subdivisions: 260, updatable: true }, this.scene);
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind)!;
    const colors = new Float32Array((positions.length / 3) * 4);

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];
      const height = this.heightAt(x, z);
      positions[i + 1] = height;
      const color = this.colorAt(x, z, height);
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
    mesh.material = this.materials.terrain;
    mesh.isPickable = false;
    mesh.receiveShadows = false;
    mesh.position.y = -0.1;
  }

  private heightAt(x: number, z: number): number {
    const radius = Math.hypot(x, z);
    const ring = smoothstep(210, 700, radius);
    const hills = ring * (40 + 150 * this.noise.fbm(x / 320 + 10, z / 320 + 10, 5));
    const rolling = smoothstep(130, 320, radius) * 9 * this.fine.fbm(x / 70, z / 70, 3);

    const volcano = Terrain.VOLCANO;
    const distance = Math.hypot(x - volcano.x, z - volcano.z);
    const cone = Math.max(0, 1 - distance / volcano.radius);
    let peak = volcano.height * Math.pow(cone, 1.55) * (0.88 + 0.24 * this.noise.fbm(x / 140, z / 140, 4));
    if (distance < 70) peak -= (1 - distance / 70) * 28; // crater
    return hills + rolling + Math.max(0, peak);
  }

  private colorAt(x: number, z: number, height: number): Color3 {
    const radius = Math.hypot(x, z);
    const grain = this.fine.fbm(x / 25, z / 25, 3);
    const dirt = new Color3(0.5, 0.42, 0.32);
    const grass = Color3.Lerp(new Color3(0.32, 0.43, 0.2), new Color3(0.46, 0.5, 0.26), grain);
    const scrub = new Color3(0.42, 0.37, 0.25);
    const rock = new Color3(0.4, 0.38, 0.36);
    const ash = new Color3(0.3, 0.28, 0.27);

    let color = Color3.Lerp(dirt, grass, smoothstep(110, 230, radius));
    color = Color3.Lerp(color, scrub, smoothstep(60, 170, height) * 0.8);
    color = Color3.Lerp(color, rock, smoothstep(150, 260, height));
    color = Color3.Lerp(color, ash, smoothstep(300, 400, height));
    return color;
  }
}
