import { Color3, HemisphericLight, Vector3, type AbstractMesh, type Scene } from "@babylonjs/core";
import type { Lighting } from "./Lighting";

/**
 * Light of the sala interiors. The sun and sky would light the rooms through the roof, so interior
 * meshes are lit only by this soft gallery light and receive no sun shadows.
 */
export class InteriorLighting {
  private readonly light: HemisphericLight;

  constructor(scene: Scene, private readonly outdoor: Lighting) {
    this.light = new HemisphericLight("interiorLight", new Vector3(0, 1, 0), scene);
    this.light.intensity = 1.25;
    this.light.diffuse = Color3.FromHexString("#fff1dc");
    this.light.groundColor = Color3.FromHexString("#8a7360");
    this.light.specular = Color3.FromHexString("#3a3530");
    this.light.includedOnlyMeshes = [];
  }

  /** Marks a mesh as part of an interior. */
  add(mesh: AbstractMesh): AbstractMesh {
    this.light.includedOnlyMeshes.push(mesh);
    this.outdoor.sun.excludedMeshes.push(mesh);
    this.outdoor.fill.excludedMeshes.push(mesh);
    mesh.receiveShadows = false;
    return mesh;
  }
}
