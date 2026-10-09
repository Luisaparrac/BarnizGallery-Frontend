import { Mesh, type Material } from "@babylonjs/core";

/** Collects small static meshes and merges them per material to keep the draw-call count low. */
export class MeshBatcher {
  private readonly pending: Mesh[] = [];

  /** Queues a mesh; its material is read at merge time, so it may be assigned afterwards. */
  add(mesh: Mesh): Mesh {
    this.pending.push(mesh);
    return mesh;
  }

  /** Merges every material group into one mesh (world-space) and clears the batcher. */
  merge(prefix: string): Mesh[] {
    const groups = new Map<Material, Mesh[]>();
    for (const mesh of this.pending) {
      if (!mesh.material) throw new Error(`Mesh ${mesh.name} needs a material before batching`);
      const group = groups.get(mesh.material) ?? [];
      group.push(mesh);
      groups.set(mesh.material, group);
    }
    this.pending.length = 0;

    const merged: Mesh[] = [];
    for (const [material, meshes] of groups) {
      meshes.forEach((mesh) => mesh.computeWorldMatrix(true));
      const result = Mesh.MergeMeshes(meshes, true, true, undefined, false, false);
      if (!result) continue;
      result.name = `${prefix}-${material.name}`;
      result.material = material;
      merged.push(result);
    }
    return merged;
  }
}
