import {
  Color3,
  FreeCamera,
  ImageProcessingConfiguration,
  Matrix,
  MeshBuilder,
  StandardMaterial,
  Vector3,
  type Camera,
  type Mesh,
  type Observer,
  type Scene,
  type Texture,
} from "@babylonjs/core";
import type { PhotoTexture } from "./PhotoTexture";

/** A photo of a piece: its mesh in the world and its texture. */
export interface PassPhoto {
  mesh: Mesh;
  texture: PhotoTexture;
}

/** One sala for the photo pass: where its inside is, its photos and what can hide them. */
export interface PassRoom {
  /** Local frame of the room: the camera is inside when its local position is within the box. */
  world: Matrix;
  min: Vector3;
  max: Vector3;
  photos: PassPhoto[];
  /** Static parts of the room (walls, cases, frames) that can stand between the camera and a photo. */
  occluders: Mesh[];
}

interface ActiveRoom {
  inverse: Matrix;
  min: Vector3;
  max: Vector3;
  photos: PassPhoto[];
  overlays: Mesh[];
  occluders: Mesh[];
}

/**
 * Draws the photos of the pieces a second time, after the scene's post-processing, so the bloom,
 * the ambient occlusion, the tone mapping and the vignette never touch them: the visitor sees the
 * colours of the real photo. A second camera copies the world camera every frame and only sees the
 * photo layer: first the room's walls and cases and the visitor's avatar in depth only (so they
 * still hide the photos behind them), then the photos with their raw colours.
 * It only runs while the camera is inside a sala; outside, the photos are tiny and the world
 * camera's own (post-processed) copy is enough.
 */
export class PhotoPass {
  /** Layer of the second pass: outside the world camera's mask (0x0FFFFFFF) and the UI's. */
  static readonly LAYER_MASK = 0x20000000;
  /** Rendering group of the photos, drawn after the depth-only occluders of group 0. */
  private static readonly PHOTO_GROUP = 1;

  readonly camera: FreeCamera;
  private readonly rooms: ActiveRoom[] = [];
  private readonly photos: PassPhoto[] = [];
  private readonly depthOnly: StandardMaterial;
  private readonly avatarProxy: Mesh;
  private readonly cameraObserver: Observer<Camera>;
  private active: ActiveRoom | null = null;

  constructor(
    private readonly scene: Scene,
    private readonly worldCamera: FreeCamera,
  ) {
    this.camera = new FreeCamera("photoCamera", worldCamera.position.clone(), scene);
    this.camera.inputs.clear();
    this.camera.layerMask = PhotoPass.LAYER_MASK;
    // Copy the world camera right before this camera draws.
    this.cameraObserver = scene.onBeforeCameraRenderObservable.add((camera) => {
      if (camera === this.camera) this.syncCamera();
    });
    // The photos must be tested against the depth the occluders just wrote.
    scene.setRenderingAutoClearDepthStencil(PhotoPass.PHOTO_GROUP, false, false, false);

    this.depthOnly = new StandardMaterial("photoPassDepth", scene);
    this.depthOnly.disableLighting = true;
    this.depthOnly.disableColorWrite = true;
    this.depthOnly.fogEnabled = false;

    // Rough stand-in for the avatar in third person, so it still hides the photo behind it.
    this.avatarProxy = MeshBuilder.CreateCylinder("photoPassAvatar", { diameter: 0.55, height: 1.75, tessellation: 12 }, scene);
    this.prepare(this.avatarProxy);
    this.avatarProxy.setEnabled(false);
  }

  addRoom(room: PassRoom): void {
    const overlays = room.photos.map((photo) => this.overlay(photo));
    const occluders = room.occluders.map((mesh) => {
      const clone = mesh.clone(`${mesh.name}-photoDepth`, null, true);
      this.prepare(clone);
      return clone;
    });
    [...overlays, ...occluders].forEach((mesh) => mesh.setEnabled(false));
    this.photos.push(...room.photos);
    this.rooms.push({ inverse: room.world.clone().invert(), min: room.min, max: room.max, photos: room.photos, overlays, occluders });
  }

  /**
   * Called every frame: picks the textures' resolution by distance and turns the pass on only
   * while the camera is inside a sala.
   */
  update(avatar: Vector3, thirdPerson: boolean): void {
    const eye = this.worldCamera.globalPosition;
    for (const photo of this.photos) photo.texture.update(Vector3.Distance(eye, photo.mesh.getAbsolutePosition()));

    const room = this.rooms.find((candidate) => {
      const local = Vector3.TransformCoordinates(eye, candidate.inverse);
      return local.x > candidate.min.x && local.x < candidate.max.x && local.z > candidate.min.z && local.z < candidate.max.z && local.y < candidate.max.y;
    });
    if (room !== this.active) {
      this.active?.overlays.forEach((mesh) => mesh.setEnabled(false));
      this.active?.occluders.forEach((mesh) => mesh.setEnabled(false));
      room?.overlays.forEach((mesh) => mesh.setEnabled(true));
      room?.occluders.forEach((mesh) => mesh.setEnabled(true));
      this.active = room ?? null;
      this.setCameraOn(!!room);
    }
    this.avatarProxy.setEnabled(!!room && thirdPerson);
    this.avatarProxy.position.set(avatar.x, 0.88, avatar.z);
  }

  dispose(): void {
    this.scene.onBeforeCameraRenderObservable.remove(this.cameraObserver);
    this.setCameraOn(false);
    this.camera.dispose();
  }

  /** Second copy of a photo, in the photo layer, with its raw colours. */
  private overlay(photo: PassPhoto): Mesh {
    const mesh = photo.mesh.clone(`${photo.mesh.name}-true`, photo.mesh.parent, true);
    mesh.layerMask = PhotoPass.LAYER_MASK;
    mesh.renderingGroupId = PhotoPass.PHOTO_GROUP;
    mesh.isPickable = false;
    mesh.metadata = null;

    const material = new StandardMaterial(`${photo.mesh.name}-trueMat`, this.scene);
    material.disableLighting = true;
    material.fogEnabled = false;
    material.diffuseColor = Color3.Black();
    material.specularColor = Color3.Black();
    material.emissiveColor = Color3.FromHexString("#e7e1d6");
    // No tone mapping, contrast or exposure: the texture's pixels go to the screen as they are.
    material.imageProcessingConfiguration = new ImageProcessingConfiguration();
    material.imageProcessingConfiguration.isEnabled = false;
    const show = (texture: Texture | null) => {
      material.emissiveTexture = texture;
      material.emissiveColor = texture ? Color3.Black() : Color3.FromHexString("#e7e1d6");
    };
    show(photo.texture.texture);
    photo.texture.changed.subscribe(show);
    mesh.material = material;
    return mesh;
  }

  private prepare(mesh: Mesh): void {
    mesh.material = this.depthOnly;
    mesh.layerMask = PhotoPass.LAYER_MASK;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    mesh.receiveShadows = false;
  }

  private syncCamera(): void {
    const source = this.worldCamera;
    this.camera.position.copyFrom(source.position);
    this.camera.rotation.copyFrom(source.rotation);
    this.camera.fov = source.fov;
    this.camera.minZ = source.minZ;
    this.camera.maxZ = 60;
  }

  /** Puts the photo camera right after the world camera (the UI camera, if any, stays last). */
  private setCameraOn(on: boolean): void {
    const cameras = this.scene.activeCameras ?? [];
    const index = cameras.indexOf(this.camera);
    if (on && index < 0) {
      if (!cameras.length) cameras.push(this.worldCamera);
      cameras.splice(cameras.indexOf(this.worldCamera) + 1, 0, this.camera);
      this.scene.activeCameras = cameras;
    } else if (!on && index >= 0) {
      cameras.splice(index, 1);
    }
  }
}
