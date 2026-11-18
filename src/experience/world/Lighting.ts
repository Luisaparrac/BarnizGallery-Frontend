import { Color3, DirectionalLight, HemisphericLight, Vector3, type Scene } from "@babylonjs/core";

/** Late-afternoon sun plus a warm sky fill light. */
export class Lighting {
  /** Direction the sunlight travels (sun is low in the south-west). */
  static readonly SUN_TRAVEL = new Vector3(0.55, -0.34, 0.77).normalize();

  readonly sun: DirectionalLight;
  readonly fill: HemisphericLight;

  constructor(scene: Scene) {
    this.fill = new HemisphericLight("fill", new Vector3(0.1, 1, -0.2), scene);
    this.fill.intensity = 0.95;
    this.fill.diffuse = Color3.FromHexString("#ffd9b0");
    this.fill.groundColor = Color3.FromHexString("#6b5040");
    this.fill.specular = Color3.Black();

    this.sun = new DirectionalLight("sun", Lighting.SUN_TRAVEL.clone(), scene);
    this.sun.intensity = 4.2;
    this.sun.diffuse = Color3.FromHexString("#ffc78a");
    this.sun.specular = Color3.FromHexString("#ffd7a8");
  }

  /** Position of the sun in the sky, as seen from the origin. */
  sunPosition(distance: number): Vector3 {
    return Lighting.SUN_TRAVEL.scale(-distance);
  }
}
