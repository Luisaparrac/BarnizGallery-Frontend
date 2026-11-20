import { Color3, Constants, DynamicTexture, StandardMaterial, type Scene } from "@babylonjs/core";

/**
 * Materials of the picture lights, shared by every frame of the scene (Flyweight): the soft beam
 * that falls from each ceiling spot and the warm halo it leaves on the wall. They are emissive and
 * added on top of what is behind them (no real lights), so they cost no lighting and merge into one
 * mesh per sala.
 */
export class GalleryLights {
  private static readonly cache = new WeakMap<Scene, GalleryLights>();
  private static readonly WARM = Color3.FromHexString("#ffe2b0");

  readonly beam: StandardMaterial;
  readonly halo: StandardMaterial;

  static for(scene: Scene): GalleryLights {
    let lights = GalleryLights.cache.get(scene);
    if (!lights) {
      lights = new GalleryLights(scene);
      GalleryLights.cache.set(scene, lights);
    }
    return lights;
  }

  private constructor(scene: Scene) {
    // The beam fades towards both ends of the cone: brightest just below the lamp.
    this.beam = GalleryLights.glow(scene, "pictureBeam", 0.2, GalleryLights.gradient(scene, "pictureBeamTex", 8, 256, (_x, y) => {
      const v = y / 255;
      return Math.pow(Math.sin(Math.PI * Math.min(1, v * 1.15)), 1.6);
    }));
    // A round halo, strong in the middle and gone at the edge.
    this.halo = GalleryLights.glow(scene, "pictureHalo", 0.55, GalleryLights.gradient(scene, "pictureHaloTex", 256, 256, (x, y) => {
      const d = Math.hypot(x - 127.5, y - 127.5) / 127.5;
      return Math.pow(Math.max(0, 1 - d), 2.2);
    }));
  }

  private static glow(scene: Scene, name: string, alpha: number, opacity: DynamicTexture): StandardMaterial {
    const material = new StandardMaterial(name, scene);
    material.disableLighting = true;
    material.diffuseColor = Color3.Black();
    material.specularColor = Color3.Black();
    material.emissiveColor = GalleryLights.WARM;
    material.opacityTexture = opacity;
    material.alpha = alpha;
    material.alphaMode = Constants.ALPHA_ADD;
    material.disableDepthWrite = true;
    material.backFaceCulling = false;
    material.fogEnabled = false;
    return material;
  }

  /** Grey-scale opacity texture: `value(x, y)` in 0..1 for each pixel. */
  private static gradient(scene: Scene, name: string, width: number, height: number, value: (x: number, y: number) => number): DynamicTexture {
    const texture = new DynamicTexture(name, { width, height }, scene, false);
    texture.hasAlpha = true;
    const ctx = texture.getContext() as CanvasRenderingContext2D;
    const image = ctx.createImageData(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = Math.round(Math.min(1, Math.max(0, value(x, y))) * 255);
        image.data.set([255, 255, 255, alpha], (y * width + x) * 4);
      }
    }
    ctx.putImageData(image, 0, 0);
    texture.update();
    return texture;
  }
}
