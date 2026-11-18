/** Derives a tangent-space normal map from the brightness of an albedo image (wraps at the edges). */
export class NormalMapBuilder {
  static fromAlbedo(source: ImageData, strength: number): ImageData {
    const { width, height, data } = source;
    const heights = new Float32Array(width * height);
    for (let i = 0; i < heights.length; i++) {
      heights[i] = (0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]) / 255;
    }
    const out = new ImageData(width, height);
    const at = (x: number, y: number) => heights[((y + height) % height) * width + ((x + width) % width)];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
        const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
        const length = Math.hypot(dx, dy, 1);
        const i = (y * width + x) * 4;
        out.data[i] = ((-dx / length) * 0.5 + 0.5) * 255;
        out.data[i + 1] = ((dy / length) * 0.5 + 0.5) * 255;
        out.data[i + 2] = ((1 / length) * 0.5 + 0.5) * 255;
        out.data[i + 3] = 255;
      }
    }
    return out;
  }
}
