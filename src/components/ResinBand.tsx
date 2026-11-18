import { SeededRandom } from "../art/SeededRandom";

const COLORS = ["#B3261E", "#2E7D32", "#E8B422", "#1F4E9C", "#E07B24", "#F5F1E8"];

/**
 * Strip of hand-cut resin pieces, the way barniz is laid on wood: the visual signature of MUSEO.
 * Drawn once per height and seed so it never changes between visits.
 */
export function ResinBand({ height = 10, seed = 7, className }: { height?: number; seed?: number; className?: string }) {
  const random = new SeededRandom(seed);
  const pieces: string[] = [];
  let x = 0;
  while (x < 1200) {
    const width = random.range(18, 64);
    const slant = random.range(-14, 14);
    pieces.push(`<path d="M${x + slant} 0 L${x + width + slant} 0 L${x + width} 40 L${x} 40Z" fill="${random.pick(COLORS)}"/>`);
    x += width + random.range(2, 5);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 40" preserveAspectRatio="none"><rect width="1200" height="40" fill="#241612"/>${pieces.join("")}</svg>`;
  return <div className={`resin-band ${className ?? ""}`} style={{ height, backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")` }} aria-hidden="true" />;
}
