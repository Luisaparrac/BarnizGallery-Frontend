import { DynamicTexture, Texture, type Scene } from "@babylonjs/core";
import { Signal } from "../../core/Signal";

/** Texture sizes by distance: none far away, 1024 px in the sala, 2048 px up close. */
type Detail = 0 | 1024 | 2048;

/**
 * The photo of a piece as a texture whose resolution follows the visitor's distance (LOD): no texture
 * beyond 30 m (the photo is not drawn there), 1024 px in the room and 2048 px within a few metres.
 * Each texture has mipmaps and the GPU's maximum anisotropic filtering, so it stays sharp at an angle.
 * The image is downloaded once; a new texture is drawn from it when the detail changes.
 */
export class PhotoTexture {
  /** Margin around the photo, so the piece never touches the frame. */
  private static readonly MARGIN = 0.03;
  private static readonly LOAD_DISTANCE = 30;
  private static readonly DROP_DISTANCE = 40;
  private static readonly SHARP_DISTANCE = 4.5;
  private static readonly SOFT_DISTANCE = 6;

  /** The texture to show changed (null: none yet, the material shows its plain colour). */
  readonly changed = new Signal<Texture | null>();
  private readonly image = new Image();
  private loaded = false;
  private current: DynamicTexture | null = null;
  private detail: Detail = 0;
  private wanted: Detail = 0;
  private backdrop = "#e7e1d6";

  constructor(
    private readonly scene: Scene,
    private readonly name: string,
    url: string | null,
  ) {
    this.image.crossOrigin = "anonymous";
    this.image.onload = () => {
      this.loaded = true;
      this.backdrop = PhotoTexture.edgeColor(this.image);
      this.apply(true);
    };
    if (url) this.image.src = url;
  }

  /** Shows another image (the design wall changes with the visitor's commissions). */
  setUrl(url: string): void {
    if (this.image.src === url || this.image.getAttribute("src") === url) return;
    this.loaded = false;
    this.image.src = url;
  }

  get texture(): Texture | null {
    return this.current;
  }

  /** Chooses the resolution for this distance (in metres) from the camera, with some hysteresis. */
  update(distance: number): void {
    let wanted = this.wanted;
    if (distance > PhotoTexture.DROP_DISTANCE) wanted = 0;
    else if (distance < PhotoTexture.SHARP_DISTANCE) wanted = 2048;
    else if (distance < PhotoTexture.LOAD_DISTANCE) wanted = wanted === 2048 && distance < PhotoTexture.SOFT_DISTANCE ? 2048 : 1024;
    if (wanted === this.wanted) return;
    this.wanted = wanted;
    this.apply();
  }

  dispose(): void {
    this.image.onload = null;
    this.current?.dispose();
    this.current = null;
  }

  /** Draws the texture for the wanted detail; `redraw` also repaints it when only the image changed. */
  private apply(redraw = false): void {
    if ((this.wanted === this.detail && !(redraw && this.detail)) || (this.wanted !== 0 && !this.loaded)) return;
    const previous = this.current;
    this.detail = this.wanted;
    this.current = this.detail ? this.draw(this.detail) : null;
    this.changed.emit(this.current);
    previous?.dispose();
  }

  private draw(size: number): DynamicTexture {
    const texture = new DynamicTexture(`${this.name}-${size}`, { width: size, height: size }, this.scene, true, Texture.TRILINEAR_SAMPLINGMODE);
    texture.anisotropicFilteringLevel = this.scene.getEngine().getCaps().maxAnisotropy || 16;
    texture.wrapU = texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    const ctx = texture.getContext() as CanvasRenderingContext2D;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    // Fit the whole photo (tall vases and masks keep their top and base) and fill the rest with the
    // colour of the photo's edges, so it reads as one backdrop.
    ctx.fillStyle = this.backdrop;
    ctx.fillRect(0, 0, size, size);
    const inner = size * (1 - PhotoTexture.MARGIN * 2);
    const scale = Math.min(inner / this.image.naturalWidth, inner / this.image.naturalHeight);
    const width = this.image.naturalWidth * scale;
    const height = this.image.naturalHeight * scale;
    ctx.drawImage(this.image, (size - width) / 2, (size - height) / 2, width, height);
    texture.update();
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
    let data: Uint8ClampedArray;
    try {
      data = ctx.getImageData(0, 0, sample, sample).data;
    } catch {
      // An image from another site without CORS cannot be read: use the neutral backdrop.
      return "#e7e1d6";
    }
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
