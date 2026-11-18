import { SeededRandom } from "./SeededRandom";

/** Draws the decorative resin figures that cover a piece, as SVG elements over an 800 × 800 frame. */
export class MotifPainter {
  constructor(
    private readonly colors: string[],
    private readonly random: SeededRandom,
  ) {}

  paint(motif: string, scale: number): string {
    switch (motif) {
      case "floral":
        return this.grid(130 * scale, (x, y, s) => this.flower(x, y, s));
      case "zoomorfo":
        return this.grid(150 * scale, (x, y, s) => this.bird(x, y, s));
      case "precolombino":
        return this.grid(120 * scale, (x, y, s) => this.fret(x, y, s));
      case "geometrico":
        return this.grid(100 * scale, (x, y, s) => this.diamond(x, y, s));
      case "paisaje":
        return this.landscape(scale);
      case "antropomorfo":
        return this.grid(140 * scale, (x, y, s) => this.figure(x, y, s));
      case "religioso":
        return this.grid(150 * scale, (x, y, s) => this.star(x, y, s));
      default:
        return this.abstract(scale);
    }
  }

  private color(): string {
    return this.random.pick(this.colors);
  }

  private grid(step: number, draw: (x: number, y: number, size: number) => string): string {
    const parts: string[] = [];
    const offset = this.random.range(0, step);
    for (let row = -1; row * step < 900; row++) {
      for (let col = -1; col * step < 900; col++) {
        const x = col * step + (row % 2 ? step / 2 : 0) + offset;
        const y = row * step + offset;
        parts.push(draw(x, y, step * 0.42));
      }
    }
    return parts.join("");
  }

  private flower(x: number, y: number, r: number): string {
    const petal = this.color();
    const centre = this.color();
    const petals = Array.from({ length: 6 }, (_, i) => {
      const a = (i * Math.PI) / 3;
      return `<ellipse cx="${x + Math.cos(a) * r * 0.55}" cy="${y + Math.sin(a) * r * 0.55}" rx="${r * 0.42}" ry="${r * 0.22}" transform="rotate(${(a * 180) / Math.PI} ${x + Math.cos(a) * r * 0.55} ${y + Math.sin(a) * r * 0.55})" fill="${petal}"/>`;
    }).join("");
    const leaf = `<path d="M${x + r * 0.8} ${y + r * 0.9} q${r * 0.5} ${-r * 0.2} ${r * 0.7} ${-r * 0.7} q${-r * 0.6} ${0} ${-r * 0.7} ${r * 0.7}z" fill="${this.color()}"/>`;
    return leaf + petals + `<circle cx="${x}" cy="${y}" r="${r * 0.22}" fill="${centre}"/>`;
  }

  private bird(x: number, y: number, r: number): string {
    const body = this.color();
    const wing = this.color();
    return (
      `<path d="M${x - r} ${y} Q${x - r * 0.2} ${y - r * 0.7} ${x + r * 0.6} ${y - r * 0.2} L${x + r} ${y - r * 0.35} L${x + r * 0.7} ${y} Q${x} ${y + r * 0.6} ${x - r} ${y}z" fill="${body}"/>` +
      `<path d="M${x - r * 0.3} ${y - r * 0.15} L${x + r * 0.1} ${y - r * 0.95} L${x + r * 0.25} ${y - r * 0.2}z" fill="${wing}"/>` +
      `<circle cx="${x + r * 0.55}" cy="${y - r * 0.2}" r="${r * 0.07}" fill="#1a110c"/>`
    );
  }

  private fret(x: number, y: number, r: number): string {
    const c = this.color();
    const w = r * 0.22;
    return `<path d="M${x - r} ${y + r} L${x - r} ${y - r} L${x + r} ${y - r} L${x + r} ${y + r * 0.4} L${x - r * 0.3} ${y + r * 0.4} L${x - r * 0.3} ${y - r * 0.3} L${x + r * 0.35} ${y - r * 0.3}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="miter"/>`;
  }

  private diamond(x: number, y: number, r: number): string {
    return (
      `<path d="M${x} ${y - r} L${x + r} ${y} L${x} ${y + r} L${x - r} ${y}z" fill="${this.color()}"/>` +
      `<path d="M${x} ${y - r * 0.45} L${x + r * 0.45} ${y} L${x} ${y + r * 0.45} L${x - r * 0.45} ${y}z" fill="${this.color()}"/>`
    );
  }

  private figure(x: number, y: number, r: number): string {
    const c = this.color();
    return (
      `<circle cx="${x}" cy="${y - r * 0.6}" r="${r * 0.25}" fill="${c}"/>` +
      `<path d="M${x - r * 0.5} ${y + r} L${x} ${y - r * 0.3} L${x + r * 0.5} ${y + r}z" fill="${c}"/>` +
      `<path d="M${x - r * 0.7} ${y - r * 0.05} L${x + r * 0.7} ${y - r * 0.05}" stroke="${this.color()}" stroke-width="${r * 0.14}"/>`
    );
  }

  private star(x: number, y: number, r: number): string {
    const points = Array.from({ length: 16 }, (_, i) => {
      const a = (i * Math.PI) / 8;
      const radius = i % 2 ? r * 0.42 : r;
      return `${x + Math.cos(a) * radius},${y + Math.sin(a) * radius}`;
    }).join(" ");
    return `<polygon points="${points}" fill="${this.color()}"/><circle cx="${x}" cy="${y}" r="${r * 0.25}" fill="${this.color()}"/>`;
  }

  private landscape(scale: number): string {
    const parts: string[] = [`<circle cx="${this.random.range(250, 550)}" cy="${260 / scale}" r="${70 * scale}" fill="${this.color()}"/>`];
    for (let band = 0; band < 6; band++) {
      const base = 300 + band * 80 * scale;
      let d = `M0 ${base}`;
      for (let x = 0; x <= 800; x += 100) d += ` L${x} ${base - this.random.range(20, 110) * scale}`;
      parts.push(`<path d="${d} L800 900 L0 900z" fill="${this.color()}"/>`);
    }
    return parts.join("");
  }

  private abstract(scale: number): string {
    return Array.from({ length: 26 }, () => {
      const x = this.random.range(0, 800);
      const y = this.random.range(0, 800);
      const r = this.random.range(30, 110) * scale;
      return `<path d="M${x} ${y} q${r} ${-r} ${r * 2} 0 q${-r * 0.6} ${r} ${-r * 2} 0z" fill="${this.color()}" opacity="0.92"/>`;
    }).join("");
  }
}
