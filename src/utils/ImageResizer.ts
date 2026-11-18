/** Shrinks an uploaded photo in the browser so the demo data fits in local storage. */
export class ImageResizer {
  static async toDataUrl(file: File, maxSide = 1000, quality = 0.82): Promise<string> {
    if (!file.type.startsWith("image/")) throw new Error("Only images can be uploaded");
    const url = URL.createObjectURL(file);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error("The image could not be read"));
        element.src = url;
      });
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", quality);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}
