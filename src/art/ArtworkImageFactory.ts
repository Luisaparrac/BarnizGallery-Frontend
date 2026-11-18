import { ArtImageCodec, type ArtImageSpec } from "./ArtImageSpec";
import { MotifPainter } from "./MotifPainter";
import { SeededRandom } from "./SeededRandom";
import { ShapeLibrary } from "./ShapeLibrary";

const BARNIZ_PALETTE = ["#B3261E", "#2E7D32", "#F2C230", "#1F4E9C", "#E07B24", "#C9A227", "#F5F1E8"];
const WOODS = ["#3B2417", "#4A2C1A", "#2E1C12", "#56331F"];

/**
 * Builds the demo "photos" of barniz pieces as SVG: a studio backdrop, the wooden piece and the
 * coloured resin figures with a varnish shine. Used only while the app runs on simulated data.
 */
export class ArtworkImageFactory {
  private static readonly cache = new Map<string, string>();

  /** Returns a usable image source for any stored URL (real URLs pass through untouched). */
  static resolve(url: string | null | undefined): string {
    if (!url) return "";
    if (!ArtImageCodec.isArtUrl(url)) return url;
    let cached = ArtworkImageFactory.cache.get(url);
    if (!cached) {
      cached = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(ArtworkImageFactory.render(ArtImageCodec.decode(url)))}`;
      ArtworkImageFactory.cache.set(url, cached);
    }
    return cached;
  }

  static render(spec: ArtImageSpec): string {
    const random = new SeededRandom(spec.seed);
    const colors = spec.colors.length ? spec.colors : BARNIZ_PALETTE;
    const wood = random.pick(WOODS);
    const painter = new MotifPainter(colors, random);
    const id = `p${spec.seed}${spec.view[0]}`;

    if (spec.view === "detail") {
      return ArtworkImageFactory.svg(
        `<rect width="800" height="800" fill="${wood}"/>${painter.paint(spec.motif, 2.3)}` + ArtworkImageFactory.gloss(id, 0, 0, 800, 800),
      );
    }

    const outline = ShapeLibrary.outline(spec.shape);
    const tilt = spec.view === "side" ? random.range(-9, -5) : random.range(-2, 2);
    const backdrop = random.pick(["#ECE8E1", "#E4E7E4", "#EDE6DB"]);
    const piece =
      `<g transform="rotate(${tilt} 400 400)">` +
      `<clipPath id="${id}c"><path d="${outline}" fill-rule="evenodd"/></clipPath>` +
      `<path d="${outline}" fill-rule="evenodd" fill="${wood}" transform="translate(10 16)" opacity="0.18"/>` +
      `<g clip-path="url(#${id}c)"><rect width="800" height="800" fill="${wood}"/>` +
      `<g transform="translate(400 400) scale(0.62) translate(-400 -400)">${painter.paint(spec.motif, 1)}</g>` +
      ArtworkImageFactory.gloss(id, 0, 0, 800, 800) +
      `</g><path d="${outline}" fill-rule="evenodd" fill="none" stroke="#1b100a" stroke-opacity="0.55" stroke-width="5"/></g>`;

    return ArtworkImageFactory.svg(
      `<defs><radialGradient id="${id}b" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${backdrop}"/></radialGradient></defs>` +
        `<rect width="800" height="800" fill="url(#${id}b)"/>` +
        `<ellipse cx="400" cy="705" rx="300" ry="34" fill="#000" opacity="0.13"/>` +
        piece,
    );
  }

  private static gloss(id: string, x: number, y: number, w: number, h: number): string {
    return (
      `<linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.38"/>` +
      `<stop offset="0.35" stop-color="#fff" stop-opacity="0.04"/><stop offset="0.7" stop-color="#fff" stop-opacity="0"/>` +
      `<stop offset="1" stop-color="#fff" stop-opacity="0.12"/></linearGradient>` +
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id}g)"/>`
    );
  }

  private static svg(body: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">${body}</svg>`;
  }
}
