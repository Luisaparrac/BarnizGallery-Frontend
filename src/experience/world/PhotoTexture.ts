import { DynamicTexture, type Scene } from "@babylonjs/core";

/**
 * Loads a piece's photo into a texture. Drawing through an <img> works for real URLs and for the
 * demo SVG pictures alike; while it loads the texture shows a neutral backdrop.
 */
export class PhotoTexture {
  private static readonly SIZE = 512;
  /** Margin around the photo, so the piece never touches the frame. */
  private static readonly MARGIN = 0.04;
  /**
   * The photo is self-lit and the scene's tone mapping and bloom brighten it; slightly below 1 keeps
   * white backgrounds from washing out the piece.
   */
  private static readonly LEVEL = 0.9;

  static create(scene: Scene, name: string, url: string): DynamicTexture {
    const size = PhotoTexture.SIZE;
    const texture = new DynamicTexture(name, { width: size, height: size }, scene, true);
    texture.level = PhotoTexture.LEVEL;
    const ctx = texture.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = "#e7e1d6";
    ctx.fillRect(0, 0, size, size);
    texture.update();
    texture.anisotropicFilteringLevel = 8;

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      if (!texture.getScene()) return;
      // Fit the whole photo in the square (tall vases and masks must not lose their top or base)
      // and fill the rest with the colour of the photo's edges, so it reads as one backdrop.
      ctx.fillStyle = PhotoTexture.edgeColor(image);
      ctx.fillRect(0, 0, size, size);
      const inner = size * (1 - PhotoTexture.MARGIN * 2);
      const scale = Math.min(inner / image.naturalWidth, inner / image.naturalHeight);
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      ctx.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
      texture.update();
    };
    image.src = url;
    return texture;
  }

  /** Average colour of the photo's outer border (its studio backdrop). */
  private static edgeColor(image: HTMLImageElement): string {
    const sample = 32;
    const canvas = document.createElement("canvas");
    canvas.width = sample;
    canvas.height = sample;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return "#e7e1d6";
    ctx.drawImage(image, 0, 0, sample, sample);
    const { data } = ctx.getImageData(0, 0, sample, sample);
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;
    for (let y = 0; y < sample; y++) {
      for (let x = 0; x < sample; x++) {
        if (x > 0 && y > 0 && x < sample - 1 && y < sample - 1) continue;
        const i = (y * sample + x) * 4;
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
    }
    return `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`;
  }
}
