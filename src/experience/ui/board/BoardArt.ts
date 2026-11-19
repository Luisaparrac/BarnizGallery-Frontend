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
