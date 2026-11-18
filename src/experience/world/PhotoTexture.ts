import { DynamicTexture, type Scene } from "@babylonjs/core";

/**
 * Loads a piece's photo into a texture. Drawing through an <img> works for real URLs and for the
 * demo SVG pictures alike; while it loads the texture shows a neutral backdrop.
 */
export class PhotoTexture {
  private static readonly SIZE = 512;

  static create(scene: Scene, name: string, url: string): DynamicTexture {
    const size = PhotoTexture.SIZE;
    const texture = new DynamicTexture(name, { width: size, height: size }, scene, true);
    const ctx = texture.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = "#e7e1d6";
    ctx.fillRect(0, 0, size, size);
    texture.update();
    texture.anisotropicFilteringLevel = 8;

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      if (!texture.getScene()) return;
      // Cover the square without stretching.
      const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      ctx.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
      texture.update();
    };
    image.src = url;
    return texture;
  }
}
