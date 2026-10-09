import { Color3, Material, PBRMaterial, Scene, Texture } from "@babylonjs/core";
import { TextureFactory, type TextureSet } from "./TextureFactory";

interface PbrOptions {
  color?: string;
  textures?: TextureSet;
  roughness?: number;
  metallic?: number;
  bumpLevel?: number;
}

/** Creates and owns every PBR material of the world (Factory pattern). */
export class MaterialLibrary {
  readonly textures: TextureFactory;

  readonly cobble: PBRMaterial;
  readonly paving: PBRMaterial;
  readonly plaster: PBRMaterial;
  readonly limestone: PBRMaterial;
  readonly woodWarm: PBRMaterial;
  readonly woodDark: PBRMaterial;
  readonly roofTile: PBRMaterial;
  readonly paintRed: PBRMaterial;
  readonly paintGreen: PBRMaterial;
  readonly iron: PBRMaterial;
  readonly brass: PBRMaterial;
  readonly glowWarm: PBRMaterial;
  readonly glowLamp: PBRMaterial;
  readonly water: PBRMaterial;
  readonly awning: PBRMaterial;
  readonly bark: PBRMaterial;
  readonly foliage: PBRMaterial;
  readonly terrain: PBRMaterial;
  readonly flowerBed: PBRMaterial;
  readonly wool: PBRMaterial;
  readonly straw: PBRMaterial;
  readonly skin: PBRMaterial;
  readonly leather: PBRMaterial;
  readonly cloth: PBRMaterial;
  readonly felt: PBRMaterial;
  readonly cream: PBRMaterial;
  readonly translucentGlow: PBRMaterial;

  private readonly waterNormal: Texture;

  constructor(private readonly scene: Scene) {
    this.textures = new TextureFactory(scene);

    this.cobble = this.pbr("cobble", { textures: this.textures.cobblestone(), roughness: 0.92, bumpLevel: 1.2 });
    this.paving = this.pbr("paving", { roughness: 0.85, bumpLevel: 1 });
    this.plaster = this.pbr("plaster", { textures: this.textures.speckled("#efe5d0", 3), roughness: 0.95, bumpLevel: 0.9 });
    this.limestone = this.pbr("limestone", { textures: this.textures.speckled("#cbbd9e", 8, 2.2), roughness: 0.88, bumpLevel: 1.1 });
    this.woodWarm = this.pbr("woodWarm", { textures: this.textures.wood("#5e3822"), roughness: 0.62, bumpLevel: 1 });
    this.woodDark = this.pbr("woodDark", { textures: this.textures.wood("#33190d", 17), roughness: 0.55, bumpLevel: 1 });
    this.roofTile = this.pbr("roofTile", { textures: this.textures.roofTiles(), roughness: 0.82, bumpLevel: 1.4 });
    this.paintRed = this.pbr("paintRed", { color: "#7e2419", roughness: 0.7 });
    this.paintGreen = this.pbr("paintGreen", { color: "#2f5d3a", roughness: 0.65 });
    this.iron = this.pbr("iron", { color: "#17171a", metallic: 0.85, roughness: 0.42 });
    this.brass = this.pbr("brass", { color: "#c8922f", metallic: 1, roughness: 0.28 });
    this.cream = this.pbr("cream", { color: "#e8dcc0", roughness: 0.8 });

    this.glowWarm = this.emissive("glowWarm", "#f2a94a");
    this.glowLamp = this.emissive("glowLamp", "#ffd58a");
    this.translucentGlow = this.emissive("translucentGlow", "#ffcf7a");
    this.translucentGlow.alpha = 0.2;
    this.translucentGlow.backFaceCulling = false;

    this.waterNormal = this.textures.waterRipples();
    this.water = this.pbr("water", { color: "#2f7686", roughness: 0.06 });
    this.water.alpha = 0.82;
    this.water.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
    this.water.bumpTexture = this.waterNormal;
    this.waterNormal.level = 0.6;

    const awning = this.textures.stripedCloth();
    this.awning = this.pbr("awning", { textures: awning, roughness: 0.92 });
    this.awning.backFaceCulling = false;

    this.bark = this.pbr("bark", { textures: this.textures.wood("#4a3322", 29), roughness: 0.95, bumpLevel: 1.6 });
    this.foliage = this.pbr("foliage", { roughness: 0.88 });
    this.terrain = this.pbr("terrain", { roughness: 1 });
    this.flowerBed = this.pbr("flowerBed", { roughness: 0.9 });

    this.wool = this.pbr("wool", { textures: this.textures.wool(), roughness: 0.97, bumpLevel: 0.8 });
    this.straw = this.pbr("straw", { textures: this.textures.straw(), roughness: 0.8 });
    this.skin = this.pbr("skin", { color: "#b98462", roughness: 0.6 });
    this.leather = this.pbr("leather", { color: "#6b4528", roughness: 0.55 });
    this.cloth = this.pbr("cloth", { color: "#2b2320", roughness: 0.95 });
    this.felt = this.pbr("felt", { color: "#15100d", roughness: 0.9 });
  }

  /** Sets how many times a textured material repeats over a mesh whose UVs span 0..1. */
  tile(material: PBRMaterial, u: number, v: number): void {
    for (const texture of [material.albedoTexture, material.bumpTexture]) {
      if (texture instanceof Texture) {
        texture.uScale = u;
        texture.vScale = v;
      }
    }
  }

  /** Scrolls the fountain water; call every frame. */
  animateWater(dt: number): void {
    this.waterNormal.uOffset += dt * 0.02;
    this.waterNormal.vOffset += dt * 0.015;
  }

  /** Glossy resin finish of Barniz de Pasto, as a clear-coated PBR material. */
  varnish(color: string): PBRMaterial {
    const material = this.pbr(`varnish-${color}`, { color, roughness: 0.35 });
    material.clearCoat.isEnabled = true;
    material.clearCoat.intensity = 1;
    material.clearCoat.roughness = 0.04;
    return material;
  }

  private pbr(name: string, options: PbrOptions): PBRMaterial {
    const material = new PBRMaterial(name, this.scene);
    material.albedoColor = Color3.FromHexString(options.color ?? "#ffffff");
    material.metallic = options.metallic ?? 0;
    material.roughness = options.roughness ?? 0.8;
    if (options.textures) {
      material.albedoTexture = options.textures.albedo;
      material.bumpTexture = options.textures.normal;
      options.textures.normal.level = options.bumpLevel ?? 1;
    }
    return material;
  }

  private emissive(name: string, color: string): PBRMaterial {
    const material = new PBRMaterial(name, this.scene);
    material.albedoColor = Color3.Black();
    material.emissiveColor = Color3.FromHexString(color);
    material.disableLighting = true;
    return material;
  }

  /** Painted wooden board with lettering that stays slightly self-lit at dusk. */
  signBoard(lines: string[], width = 768, height = 192): PBRMaterial {
    const texture = this.textures.sign(lines, width, height);
    const material = new PBRMaterial(`sign-${lines.join("-")}`, this.scene);
    material.albedoTexture = texture;
    material.emissiveTexture = texture;
    material.emissiveColor = new Color3(0.3, 0.3, 0.3);
    material.metallic = 0;
    material.roughness = 0.6;
    return material;
  }

  /** Assigns the unique plaza paving texture set (created by the Plaza itself). */
  setPavingTextures(set: TextureSet): void {
    this.paving.albedoTexture = set.albedo;
    this.paving.bumpTexture = set.normal;
    set.normal.level = 1;
  }
}

export type AnyMaterial = Material;
