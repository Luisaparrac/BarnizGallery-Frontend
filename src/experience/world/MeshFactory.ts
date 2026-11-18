import { Mesh, MeshBuilder, Vector4, type Material, type Scene } from "@babylonjs/core";

/** Mesh helpers that keep texture density constant regardless of mesh size. */
export class MeshFactory {
  /**
   * Box whose UVs repeat every `tileMeters`, so large and small walls show the same texture scale.
   * Pass tileMeters = 0 for the default stretched mapping.
   */
  static box(scene: Scene, name: string, width: number, height: number, depth: number, material: Material, tileMeters = 0): Mesh {
    const faceUV =
      tileMeters > 0
        ? [
            new Vector4(0, 0, width / tileMeters, height / tileMeters),
            new Vector4(0, 0, width / tileMeters, height / tileMeters),
            new Vector4(0, 0, depth / tileMeters, height / tileMeters),
            new Vector4(0, 0, depth / tileMeters, height / tileMeters),
            new Vector4(0, 0, width / tileMeters, depth / tileMeters),
            new Vector4(0, 0, width / tileMeters, depth / tileMeters),
          ]
        : undefined;
    const mesh = MeshBuilder.CreateBox(name, { width, height, depth, faceUV }, scene);
    mesh.material = material;
    return mesh;
  }
}
