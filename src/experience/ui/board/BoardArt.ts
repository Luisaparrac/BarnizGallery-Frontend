import { SeededRandom } from "../../../art/SeededRandom";
import { BoardTheme } from "./BoardTheme";

/**
 * Pictures of the board painted once with the 2D canvas and kept as data URLs: the strip of
 * hand-cut resin (the signature of MUSEO, the same as the ResinBand of the web), the fibre of
 * the paper and the grain of the wooden frame.
 */
export class BoardArt {
  private static readonly RESIN = ["#B3261E", "#2E7D32", "#E8B422", "#1F4E9C", "#E07B24", "#F5F1E8"];
  private static readonly cache = new Map<string, string>();

  /** Slanted resin pieces of the Barniz colors on dark ground. */
  static resinBand(seed = 7): string {
    return BoardArt.remember(`band-${seed}`, () =>
      BoardArt.paint(1200, 40, (ctx) => {
        const random = new SeededRandom(seed);
        ctx.fillStyle = BoardTheme.color.ink;
        ctx.fillRect(0, 0, 1200, 40);
        let x = 0;
        while (x < 1200) {
          const width = random.range(18, 64);
          const slant = random.range(-14, 14);
          ctx.fillStyle = random.pick(BoardArt.RESIN);
          ctx.beginPath();
          ctx.moveTo(x + slant, 0);
          ctx.lineTo(x + width + slant, 0);
          ctx.lineTo(x + width, 40);
          ctx.lineTo(x, 40);
          ctx.fill();
          x += width + random.range(2, 5);
        }
      }),
    );
  }

  /** Very faint fibres on cream paper. */
  static paperFibre(): string {
    return BoardArt.remember("paper", () =>
      BoardArt.paint(512, 512, (ctx) => {
        const random = new SeededRandom(3);
        ctx.fillStyle = BoardTheme.color.paper;
        ctx.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 2600; i++) {
          const dark = random.next() > 0.45;
          // Half as strong as at first, so the fibre never shows behind the text.
          ctx.strokeStyle = dark ? `rgba(90,60,30,${random.range(0.01, 0.025)})` : `rgba(255,255,255,${random.range(0.025, 0.06)})`;
          ctx.lineWidth = random.range(0.6, 1.2);
          const x = random.next() * 512;
          const y = random.next() * 512;
          const angle = random.next() * Math.PI;
          const length = random.range(4, 14);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
          ctx.stroke();
        }
      }),
    );
  }

  /** Dark varnished wood with long grain lines. */
  static wood(): string {
    return BoardArt.remember("wood", () =>
      BoardArt.paint(1024, 256, (ctx) => {
        const random = new SeededRandom(23);
        const gradient = ctx.createLinearGradient(0, 0, 0, 256);
        gradient.addColorStop(0, "#6b4129");
        gradient.addColorStop(0.5, BoardTheme.color.wood);
        gradient.addColorStop(1, "#4a2b18");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1024, 256);
        for (let i = 0; i < 90; i++) {
          ctx.strokeStyle = `rgba(30,14,6,${random.range(0.08, 0.25)})`;
          ctx.lineWidth = random.range(0.6, 2.2);
          const y = random.next() * 256;
          ctx.beginPath();
          ctx.moveTo(0, y);
          for (let x = 0; x <= 1024; x += 64) ctx.lineTo(x, y + Math.sin(x / 90 + i) * random.range(1, 4));
          ctx.stroke();
        }
      }),
    );
  }

  /**
   * Small line icons (64 × 64, drawn with round strokes): lock, card, bank (PSE), phone
   * (Nequi) and plus. `color` is the stroke color.
   */
  static icon(name: "lock" | "card" | "bank" | "phone" | "plus", color: string = BoardTheme.color.ink): string {
    return BoardArt.remember(`icon-${name}-${color}`, () =>
      BoardArt.paint(64, 64, (ctx) => {
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        const box = (x: number, y: number, w: number, h: number, r: number) => {
          ctx.beginPath();
          ctx.roundRect(x, y, w, h, r);
          ctx.stroke();
        };
        const line = (x1: number, y1: number, x2: number, y2: number) => {
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        };
        if (name === "lock") {
          box(12, 28, 40, 28, 6);
          ctx.beginPath();
          ctx.arc(32, 28, 12, Math.PI, 0);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(32, 41, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (name === "card") {
          box(6, 14, 52, 36, 6);
          line(6, 26, 58, 26);
          line(14, 40, 28, 40);
        } else if (name === "bank") {
          ctx.beginPath();
          ctx.moveTo(8, 24);
          ctx.lineTo(32, 10);
          ctx.lineTo(56, 24);
          ctx.closePath();
          ctx.stroke();
          for (const x of [16, 27, 37, 48]) line(x, 30, x, 46);
          line(8, 54, 56, 54);
        } else if (name === "phone") {
          box(18, 6, 28, 52, 6);
          line(28, 48, 36, 48);
        } else {
          line(32, 14, 32, 50);
          line(14, 32, 50, 32);
        }
      }),
    );
  }

  private static paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): string {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    draw(ctx);
    return canvas.toDataURL("image/png");
  }

  private static remember(key: string, make: () => string): string {
    const cached = BoardArt.cache.get(key);
    if (cached) return cached;
    const url = make();
    BoardArt.cache.set(key, url);
    return url;
  }
}
