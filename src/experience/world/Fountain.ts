import { Color4, MeshBuilder, ParticleSystem, Vector3, type Mesh } from "@babylonjs/core";
import { PlazaLayout } from "./PlazaLayout";
import { SceneComponent } from "./SceneComponent";
import type { SceneContext } from "./SceneContext";

/** Two-tier limestone fountain with animated water and spray. */
export class Fountain extends SceneComponent {
  constructor(ctx: SceneContext) {
    super(ctx);
  }

  build(): void {
    const { x, z } = PlazaLayout.fountain;
    const stone = this.materials.limestone;

    const basin = MeshBuilder.CreateCylinder("fountainBasin", { diameter: 9.2, height: 0.9, tessellation: 48 }, this.scene);
    basin.material = stone;
    basin.position.set(x, 0.45, z);
    this.solid(basin);

    const rim = this.detail(MeshBuilder.CreateTorus("fountainRim", { diameter: 9.0, thickness: 0.5, tessellation: 64 }, this.scene));
    rim.material = stone;
    rim.position.set(x, 0.95, z);

    const water = MeshBuilder.CreateCylinder("fountainWater", { diameter: 8.4, height: 0.04, tessellation: 48 }, this.scene);
    water.material = this.materials.water;
    water.position.set(x, 0.74, z);
    water.isPickable = false;

    // Stepped column with a lathe-turned bowl and finial.
    const column = MeshBuilder.CreateCylinder("fountainColumn", { diameterTop: 0.5, diameterBottom: 1.1, height: 2.3, tessellation: 24 }, this.scene);
    column.material = stone;
    column.position.set(x, 1.85, z);
    this.solid(column);

    this.detail(this.lathe("lowerBowl", [[0.5, 0], [1.9, 0.25], [2.6, 0.75], [2.7, 0.95], [2.5, 0.95], [1.9, 0.55], [0.4, 0.35]], x, 1.9, z));
    this.detail(this.lathe("upperBowl", [[0.2, 0], [0.8, 0.2], [1.25, 0.55], [1.3, 0.7], [1.15, 0.7], [0.7, 0.4], [0.2, 0.3]], x, 3.2, z));
    this.detail(this.lathe("finial", [[0.001, 0], [0.22, 0.05], [0.14, 0.3], [0.2, 0.45], [0.001, 0.75]], x, 3.45, z));

    this.flushDetails("fountain");

    this.createSpray(new Vector3(x, 4.1, z), 6, 320);
    this.rimJets(x, z);
  }

  update(deltaSeconds: number): void {
    this.materials.animateWater(deltaSeconds);
  }

  private lathe(name: string, profile: [number, number][], x: number, y: number, z: number): Mesh {
    const mesh = MeshBuilder.CreateLathe(name, { shape: profile.map(([r, h]) => new Vector3(r, h, 0)), tessellation: 40, closed: true, sideOrientation: 2 }, this.scene);
    mesh.material = this.materials.limestone;
    mesh.position.set(x, y, z);
    return mesh;
  }

  private rimJets(x: number, z: number): ParticleSystem[] {
    const jets: ParticleSystem[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      jets.push(this.createSpray(new Vector3(x + Math.cos(angle) * 3.7, 1.0, z + Math.sin(angle) * 3.7), 2.6, 90));
    }
    return jets;
  }

  private createSpray(emitter: Vector3, lift: number, rate: number): ParticleSystem {
    const spray = new ParticleSystem("spray", 600, this.scene);
    spray.particleTexture = this.materials.textures.dropSprite();
    spray.emitter = emitter;
    spray.minEmitBox = new Vector3(-0.05, 0, -0.05);
    spray.maxEmitBox = new Vector3(0.05, 0, 0.05);
    spray.color1 = new Color4(0.9, 0.97, 1, 0.9);
    spray.color2 = new Color4(0.65, 0.85, 1, 0.75);
    spray.colorDead = new Color4(0.65, 0.85, 1, 0);
    spray.minSize = 0.05;
    spray.maxSize = 0.13;
    spray.minLifeTime = 0.8;
    spray.maxLifeTime = 1.3;
    spray.emitRate = rate;
    spray.direction1 = new Vector3(-0.5, lift * 0.9, -0.5);
    spray.direction2 = new Vector3(0.5, lift * 1.1, 0.5);
    spray.gravity = new Vector3(0, -9.8, 0);
    spray.minEmitPower = 0.9;
    spray.maxEmitPower = 1.1;
    spray.blendMode = ParticleSystem.BLENDMODE_ONEONE;
    spray.start();
    return spray;
  }
}
