import { Mesh, VertexData, type Material, type Scene } from "@babylonjs/core";

export interface GableRoofOptions {
  /** Building width along the ridge (x) and depth across it (z), walls included. */
  width: number;
  depth: number;
  /** Height of the top of the walls. */
  eaveHeight: number;
  /** Slope angle in radians. */
  pitch: number;
  frontOverhang: number;
  sideOverhang: number;
  /** Metres covered by one repetition of the roof tile texture. */
  tileMeters: number;
}

/** Builds a pitched roof (two slopes plus the triangular gable ends) in the building's local space. */
export class GableRoof {
  readonly ridgeHeight: number;
  readonly halfWidth: number;
  readonly halfDepth: number;
  /** Height of the lowest edge of each slope. */
  readonly eaveEdgeHeight: number;

  constructor(private readonly options: GableRoofOptions) {
    const slope = Math.tan(options.pitch);
    this.ridgeHeight = options.eaveHeight + (options.depth / 2) * slope;
    this.halfWidth = options.width / 2 + options.sideOverhang;
    this.halfDepth = options.depth / 2 + options.frontOverhang;
    this.eaveEdgeHeight = this.ridgeHeight - this.halfDepth * slope;
  }

  /** Roof surface height at local depth `z`. */
  heightAt(z: number): number {
    return this.ridgeHeight - Math.abs(z) * Math.tan(this.options.pitch);
  }

  createSlopes(scene: Scene, material: Material): Mesh {
    const { halfWidth: hw, halfDepth: hd, ridgeHeight: ridge, eaveEdgeHeight: edge } = this;
    const { tileMeters, pitch } = this.options;
    const length = hd / Math.cos(pitch);
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (const side of [-1, 1]) {
      const base = positions.length / 3;
      positions.push(-hw, ridge, 0, hw, ridge, 0, hw, edge, side * hd, -hw, edge, side * hd);
      const nz = side * Math.sin(pitch);
      const ny = Math.cos(pitch);
      for (let i = 0; i < 4; i++) normals.push(0, ny, nz);
      uvs.push(0, 0, (2 * hw) / tileMeters, 0, (2 * hw) / tileMeters, length / tileMeters, 0, length / tileMeters);
      // The winding differs per side so both slopes face outward.
      if (side < 0) indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      else indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
    }

    const data = new VertexData();
    data.positions = positions;
    data.normals = normals;
    data.uvs = uvs;
    data.indices = indices;
    const mesh = new Mesh("roofSlopes", scene);
    data.applyToMesh(mesh);
    mesh.material = material;
    return mesh;
  }

  /** Triangular end walls closing the gable at x = +-width/2. */
  createGableEnds(scene: Scene, material: Material): Mesh {
    const { width, depth, eaveHeight } = this.options;
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    for (const side of [-1, 1]) {
      const base = positions.length / 3;
      const x = side * (width / 2);
      positions.push(x, eaveHeight - 0.2, -depth / 2, x, eaveHeight - 0.2, depth / 2, x, this.ridgeHeight, 0);
      for (let i = 0; i < 3; i++) normals.push(side, 0, 0);
      uvs.push(0, 0, depth / 4, 0, depth / 8, (this.ridgeHeight - eaveHeight + 0.2) / 4);
      if (side < 0) indices.push(base, base + 1, base + 2);
      else indices.push(base, base + 2, base + 1);
    }
    const data = new VertexData();
    data.positions = positions;
    data.normals = normals;
    data.uvs = uvs;
    data.indices = indices;
    const mesh = new Mesh("gableEnds", scene);
    data.applyToMesh(mesh);
    mesh.material = material;
    return mesh;
  }
}
