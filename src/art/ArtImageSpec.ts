/** What a generated picture of a barniz piece shows. Encoded in URLs as "art:..." in the demo data. */
export interface ArtImageSpec {
  shape: string;
  motif: string;
  colors: string[];
  seed: number;
  view: "front" | "detail" | "side";
}

const PREFIX = "art:";

export class ArtImageCodec {
  static isArtUrl(url: string): boolean {
    return url.startsWith(PREFIX);
  }

  static encode(spec: ArtImageSpec): string {
    return `${PREFIX}${spec.shape};${spec.motif};${spec.colors.map((c) => c.replace("#", "")).join(",")};${spec.seed};${spec.view}`;
  }

  static decode(url: string): ArtImageSpec {
    const [shape, motif, colors, seed, view] = url.slice(PREFIX.length).split(";");
    return {
      shape,
      motif,
      colors: colors ? colors.split(",").filter(Boolean).map((c) => `#${c}`) : [],
      seed: Number(seed) || 1,
      view: (view as ArtImageSpec["view"]) || "front",
    };
  }
}
