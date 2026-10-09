import { Color3, DynamicTexture, MeshBuilder, StandardMaterial, Texture, type Mesh, type Scene } from "@babylonjs/core";
import type { Lighting } from "./Lighting";

/** Gradient sunset sky (painted once on a canvas) with a visible sun disc and matching fog colour. */
export class SkyDome {
  /** Colour the distance fades into; keep it close to the sky colour at the horizon. */
  readonly horizonColor = Color3.FromHexString("#e2b48a");
  readonly sunDisc: Mesh;
  readonly sunDistance = 2200;

  constructor(scene: Scene, lighting: Lighting) {
    const dome = MeshBuilder.CreateSphere("skyDome", { diameter: 4800, segments: 24, sideOrientation: 1 }, scene);
    dome.material = this.createSkyMaterial(scene);
    dome.infiniteDistance = true;
    dome.applyFog = false;
    dome.isPickable = false;

    const discMaterial = new StandardMaterial("sunDisc", scene);
    discMaterial.emissiveColor = new Color3(1, 0.82, 0.55);
    discMaterial.disableLighting = true;
    this.sunDisc = MeshBuilder.CreateSphere("sunDisc", { diameter: 150, segments: 12 }, scene);
    this.sunDisc.material = discMaterial;
    this.sunDisc.position = lighting.sunPosition(this.sunDistance);
    this.sunDisc.applyFog = false;
    this.sunDisc.isPickable = false;
  }

  private createSkyMaterial(scene: Scene): StandardMaterial {
    const texture = new DynamicTexture("skyGradient", { width: 8, height: 512 }, scene, false);
    const context = texture.getContext();
    // v = 0 is the bottom of the sphere, v = 1 the zenith; the horizon sits at v = 0.5.
    const gradient = context.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, "#e2b48a");
    gradient.addColorStop(0.46, "#e8bf96");
    gradient.addColorStop(0.5, "#eec9a0");
    gradient.addColorStop(0.58, "#d9b69c");
    gradient.addColorStop(0.72, "#9fb3c4");
    gradient.addColorStop(0.88, "#5f86ad");
    gradient.addColorStop(1, "#3f6a96");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 8, 512);
    texture.update(true);
    texture.wrapU = Texture.CLAMP_ADDRESSMODE;
    texture.wrapV = Texture.CLAMP_ADDRESSMODE;

    const material = new StandardMaterial("sky", scene);
    material.disableLighting = true;
    material.emissiveTexture = texture;
    material.diffuseColor = Color3.Black();
    material.specularColor = Color3.Black();
    material.backFaceCulling = false;
    return material;
  }
}
