import { Color3, MeshBuilder, PBRMaterial, TransformNode, Vector3, type AbstractMesh, type Mesh, type Scene } from "@babylonjs/core";
import type { AvatarModel } from "../world/AvatarModel";
import type { MaterialLibrary } from "../world/MaterialLibrary";
import type { ShadowRig } from "../world/ShadowRig";
import type { LobbyAvatar } from "./LobbyTypes";

/**
 * A stone pedestal with one avatar on top and its name on a plaque. The chosen one turns slowly
 * and its ring lights up; the others turn back to face the visitor.
 */
export class AvatarPedestal {
  static readonly HEIGHT = 0.6;
  private static readonly SPIN_SPEED = 1.1;
  private static readonly GLOW_OFF = new Color3(0.08, 0.05, 0.02);
  private static readonly GLOW_ON = Color3.FromHexString("#ffbf5c");

  readonly root: TransformNode;
  private readonly ringMaterial: PBRMaterial;
  private readonly pickables: AbstractMesh[] = [];
  private avatar: AvatarModel | null = null;
  private selected = false;
  private glow = 0;
  private hovered = false;

  constructor(
    scene: Scene,
    materials: MaterialLibrary,
    private readonly shadows: ShadowRig,
    readonly item: LobbyAvatar,
    label: string,
    x: number,
    z: number,
    facing: number,
  ) {
    this.root = new TransformNode(`pedestal-${item.code}`, scene);
    this.root.position.set(x, 0, z);

    const base = MeshBuilder.CreateCylinder("pedestalBase", { diameterTop: 1.15, diameterBottom: 1.3, height: AvatarPedestal.HEIGHT, tessellation: 40 }, scene);
    base.material = materials.limestone;
    base.position.y = AvatarPedestal.HEIGHT / 2;
    this.part(base);
    shadows.addCaster(base);

    this.ringMaterial = new PBRMaterial(`pedestalRing-${item.code}`, scene);
    this.ringMaterial.albedoColor = Color3.Black();
    this.ringMaterial.emissiveColor = AvatarPedestal.GLOW_OFF.clone();
    this.ringMaterial.disableLighting = true;
    const ring = MeshBuilder.CreateTorus("pedestalRing", { diameter: 1.16, thickness: 0.05, tessellation: 48 }, scene);
    ring.material = this.ringMaterial;
    ring.position.y = AvatarPedestal.HEIGHT + 0.005;
    this.part(ring);

    const plaque = MeshBuilder.CreatePlane("pedestalPlaque", { width: 0.9, height: 0.225 }, scene);
    plaque.material = materials.signBoard([label], 512, 128);
    // Local +z faces the visitor; a plane shows its front towards -z, so it is turned around.
    plaque.position.set(0, AvatarPedestal.HEIGHT * 0.55, 0.64);
    plaque.rotation.y = Math.PI;
    this.part(plaque);
    this.root.rotation.y = facing;

    // A tall invisible box makes the whole figure easy to click, not only the stone.
    const hitBox = MeshBuilder.CreateBox("pedestalHit", { width: 1.2, height: 2.6, depth: 1.2 }, scene);
    hitBox.position.y = 1.3;
    hitBox.visibility = 0;
    this.part(hitBox, true);
  }

  /** Puts the avatar on the pedestal (it arrives later, when its model finishes loading). */
  setAvatar(avatar: AvatarModel): void {
    this.avatar?.dispose();
    this.avatar = avatar;
    avatar.root.parent = this.root;
    avatar.root.position.set(0, AvatarPedestal.HEIGHT, 0);
    avatar.root.rotation.y = 0;
    avatar.setVisible(true);
  }

  owns(mesh: AbstractMesh | null | undefined): boolean {
    return !!mesh && this.pickables.includes(mesh);
  }

  setSelected(selected: boolean): void {
    this.selected = selected;
  }

  setHovered(hovered: boolean): void {
    this.hovered = hovered;
  }

  update(deltaSeconds: number): void {
    const target = this.selected ? 1 : this.hovered ? 0.5 : 0;
    this.glow += (target - this.glow) * Math.min(1, deltaSeconds * 6);
    Color3.LerpToRef(AvatarPedestal.GLOW_OFF, AvatarPedestal.GLOW_ON, this.glow, this.ringMaterial.emissiveColor);

    if (!this.avatar) return;
    const root = this.avatar.root;
    if (this.selected) {
      root.rotation.y += deltaSeconds * AvatarPedestal.SPIN_SPEED;
    } else {
      // Back to facing the visitor by the shortest way.
      const difference = Math.atan2(Math.sin(-root.rotation.y), Math.cos(-root.rotation.y));
      root.rotation.y += difference * Math.min(1, deltaSeconds * 4);
    }
    this.avatar.animate(deltaSeconds, 0);
  }

  /** Where the floating name goes: just above the avatar's head. */
  get labelAnchor(): Vector3 {
    return this.root.position.add(new Vector3(0, AvatarPedestal.HEIGHT + 1.95, 0));
  }

  /** Where the spotlight should aim: the avatar's chest. */
  get focusHeight(): number {
    return AvatarPedestal.HEIGHT + 1.1;
  }

  dispose(): void {
    this.avatar?.dispose();
    this.root.dispose(false, true);
  }

  private part(mesh: Mesh, pickable = false): void {
    mesh.parent = this.root;
    mesh.isPickable = pickable;
    if (!pickable) this.shadows.receive(mesh);
    else this.pickables.push(mesh);
  }
}
