import type { ImgHTMLAttributes } from "react";
import { ArtworkImageFactory } from "../art/ArtworkImageFactory";

/** <img> that also understands the generated demo pictures ("art:" URLs). */
export function ArtImage({ src, alt, ...rest }: Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & { src: string | null | undefined; alt: string }) {
  const resolved = ArtworkImageFactory.resolve(src);
  if (!resolved) return <div className="img-missing" aria-label={alt} role="img" />;
  return <img src={resolved} alt={alt} loading="lazy" decoding="async" {...rest} />;
}
