import { Mesh, MeshBuilder, Quaternion, Vector3, VertexBuffer, type Material, type Scene } from "@babylonjs/core";
import type { AtlasRegion } from "./AvatarAtlas";
import type { AvatarSkeleton } from "./AvatarSkeleton";
import type { JointName, Point } from "./AvatarTypes";

interface LatheOptions {
  tessellation?: number;
  /** Fraction of the turn (1 = closed all around). */
  arc?: number;
  /** Shells (a ruana, a skirt) are seen from inside too. */
  doubleSided?: boolean;
}

/**
 * Builds the pieces of an avatar (Builder pattern). Every piece is placed in avatar space,
 * belongs to one joint and takes its color from a region of the atlas; `merge` joins the
 * pieces of each joint into one mesh hung from that joint, so the avatar needs few draw calls.
 */
export class AvatarPartBuilder {
  private readonly groups = new Map<JointName, Mesh[]>();

  constructor(
    private readonly scene: Scene,
    private readonly skeleton: AvatarSkeleton,
  ) {}

  sphere(joint: JointName, region: AtlasRegion, at: Point, diameter: number, scale: Point = [1, 1, 1], segments = 16): Mesh {
    const mesh = MeshBuilder.CreateSphere("part", { diameter, segments }, this.scene);
    mesh.scaling.set(...scale);
    return this.add(joint, region, mesh, at);
  }

  /** Rounded limb between two points, thinner at one end if the radii differ. */
  capsule(joint: JointName, region: AtlasRegion, from: Point, to: Point, radiusFrom: number, radiusTo = radiusFrom): Mesh {
    const start = new Vector3(...from);
    const end = new Vector3(...to);
    const axis = end.subtract(start);
    const length = axis.length();
    const mesh = MeshBuilder.CreateCapsule(
      "part",
      { height: length + radiusFrom + radiusTo, radiusTop: radiusTo, radiusBottom: radiusFrom, tessellation: 14, capSubdivisions: 5 },
      this.scene,
    );
    mesh.rotationQuaternion = new Quaternion();
    Quaternion.FromUnitVectorsToRef(Vector3.Up(), axis.normalize(), mesh.rotationQuaternion);
    // The capsule is centered on its total height; shift it so the radii sit on the two points.
    const middle = start.add(end).scale(0.5).add(axis.scale((radiusTo - radiusFrom) / 2));
    return this.add(joint, region, mesh, [middle.x, middle.y, middle.z]);
  }

  cylinder(joint: JointName, region: AtlasRegion, at: Point, height: number, diameterBottom: number, diameterTop = diameterBottom, tessellation = 24): Mesh {
    const mesh = MeshBuilder.CreateCylinder("part", { height, diameterBottom, diameterTop, tessellation }, this.scene);
    return this.add(joint, region, mesh, at);
  }

  box(joint: JointName, region: AtlasRegion, at: Point, width: number, height: number, depth: number): Mesh {
    const mesh = MeshBuilder.CreateBox("part", { width, height, depth }, this.scene);
    return this.add(joint, region, mesh, at);
  }

  torus(joint: JointName, region: AtlasRegion, at: Point, diameter: number, thickness: number, tessellation = 24): Mesh {
    const mesh = MeshBuilder.CreateTorus("part", { diameter, thickness, tessellation }, this.scene);
    return this.add(joint, region, mesh, at);
  }

  /**
   * A turned shape, like a piece on a lathe: `profile` lists [radius, height] from bottom to top.
   * Its texture runs around the shape (u) and from the bottom to the top of the profile (v).
   */
  lathe(joint: JointName, region: AtlasRegion, at: Point, profile: [number, number][], options: LatheOptions = {}): Mesh {
    const mesh = MeshBuilder.CreateLathe(
      "part",
      {
        shape: profile.map(([radius, y]) => new Vector3(radius, y, 0)),
        tessellation: options.tessellation ?? 32,
        arc: options.arc ?? 1,
        closed: (options.arc ?? 1) >= 1,
        sideOrientation: options.doubleSided ? Mesh.DOUBLESIDE : Mesh.DEFAULTSIDE,
      },
      this.scene,
    );
    AvatarPartBuilder.swapUvs(mesh);
    return this.add(joint, region, mesh, at);
  }

  /**
   * Merges the pieces of every joint into one mesh with the shared material and hangs it from
   * the joint. Call it while the skeleton is still at rest.
   */
  merge(material: Material): Mesh[] {
    const merged: Mesh[] = [];
    for (const [joint, meshes] of this.groups) {
      meshes.forEach((mesh) => mesh.computeWorldMatrix(true));
      const mesh = Mesh.MergeMeshes(meshes, true, true);
      if (!mesh) continue;
      mesh.name = `${this.skeleton.joints[joint].name}-mesh`;
      mesh.material = material;
      mesh.isPickable = false;
      mesh.parent = this.skeleton.joints[joint];
      mesh.position.copyFrom(this.skeleton.place(joint).negate());
      merged.push(mesh);
    }
    this.groups.clear();
    return merged;
  }

  private add(joint: JointName, region: AtlasRegion, mesh: Mesh, at: Point): Mesh {
    mesh.position.set(...at);
    AvatarPartBuilder.mapToRegion(mesh, region);
    const group = this.groups.get(joint) ?? [];
    group.push(mesh);
    this.groups.set(joint, group);
    return mesh;
  }

  /** Squeezes the mesh's 0..1 UVs into its region of the atlas. */
  private static mapToRegion(mesh: Mesh, region: AtlasRegion): void {
    const uvs = mesh.getVerticesData(VertexBuffer.UVKind);
    if (!uvs) return;
    for (let i = 0; i < uvs.length; i += 2) {
      const u = Math.min(1, Math.max(0, uvs[i]));
      const v = Math.min(1, Math.max(0, uvs[i + 1]));
      uvs[i] = region.u0 + u * (region.u1 - region.u0);
      uvs[i + 1] = region.v0 + v * (region.v1 - region.v0);
    }
    mesh.setVerticesData(VertexBuffer.UVKind, uvs);
  }

  /** A lathe's UVs run along the profile first; turn them so u goes around, like a cylinder. */
  private static swapUvs(mesh: Mesh): void {
    const uvs = mesh.getVerticesData(VertexBuffer.UVKind);
    if (!uvs) return;
    for (let i = 0; i < uvs.length; i += 2) {
      const u = uvs[i];
      uvs[i] = uvs[i + 1];
      uvs[i + 1] = u;
    }
    mesh.setVerticesData(VertexBuffer.UVKind, uvs);
  }
}
