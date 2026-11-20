import { join } from "node:path";
import { CsvReader } from "./CsvReader.ts";

export interface InventoryMaster {
  key: string;
  name: string;
  folder: string;
  storeEs: string;
  storeEn: string;
  city: string;
  avatar: string;
  biographyEs: string;
  biographyEn: string;
}

/** Pixel rectangle cut from an original photo before resizing it. */
export interface CropBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface InventoryPhoto {
  /** Original file name inside the master's folder. */
  source: string;
  /** Path under public/, also the URL the app uses (with a leading "/"). */
  output: string;
  /** 1 is the main photo. */
  index: number;
  crop: CropBox | null;
}

export interface InventoryWork {
  masterKey: string;
  slug: string;
  titleEs: string;
  titleEn: string;
  photos: InventoryPhoto[];
  shape: string;
  colors: string[];
  motifs: string[];
  style: string;
  descriptionEs: string;
  descriptionEn: string;
  price: number | null;
  currency: string;
  provisionalPrice: boolean;
  widthCm: number | null;
  heightCm: number | null;
  depthCm: number | null;
  saleMode: "SALE" | "AUCTION";
  stock: number;
}

/** The real masters and works, read from data/maestros.csv and data/obras.csv (shared by the import scripts). */
export class Inventory {
  readonly masters: InventoryMaster[];
  readonly works: InventoryWork[];

  constructor(dataDir: string) {
    this.masters = CsvReader.read(join(dataDir, "maestros.csv")).map((row) => ({
      key: row["clave"],
      name: row["nombre"],
      folder: row["carpeta"],
      storeEs: row["tienda ES"],
      storeEn: row["tienda EN"],
      city: row["ciudad"],
      avatar: row["avatar"],
      biographyEs: row["biografía ES"],
      biographyEn: row["biografía EN"],
    }));
    this.works = CsvReader.read(join(dataDir, "obras.csv")).map((row) => this.work(row));
    for (const work of this.works) {
      if (!this.masters.some((master) => master.key === work.masterKey)) throw new Error(`"${work.titleEs}": unknown master "${work.masterKey}"`);
    }
  }

  master(key: string): InventoryMaster {
    const found = this.masters.find((master) => master.key === key);
    if (!found) throw new Error(`Unknown master "${key}"`);
    return found;
  }

  static slug(text: string): string {
    return text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  private work(row: Record<string, string>): InventoryWork {
    const masterKey = row["maestro"];
    const titleEs = row["obra ES"];
    const slug = Inventory.slug(titleEs);
    const crops = Inventory.crops(row["recorte"]);
    const photos = Inventory.orderPhotos(Inventory.list(row["fotos"])).map((source, position) => ({
      source,
      output: `obras/${masterKey}/${slug}-${position + 1}.webp`,
      index: position + 1,
      crop: crops.get(position + 1) ?? null,
    }));
    if (!photos.length) throw new Error(`"${titleEs}" has no photos`);
    const mode = Inventory.slug(row["modo de venta"]);
    if (mode !== "directa" && mode !== "subasta") throw new Error(`"${titleEs}": sale mode must be Directa or Subasta`);
    return {
      masterKey,
      slug,
      titleEs,
      titleEn: row["obra EN"],
      photos,
      shape: row["forma"],
      colors: Inventory.list(row["colores"]),
      motifs: Inventory.list(row["figuras"]),
      style: row["estilo"],
      descriptionEs: row["descripción ES"],
      descriptionEn: row["descripción EN"],
      price: Inventory.number(row["precio"]),
      currency: row["moneda"] || "USD",
      provisionalPrice: Inventory.slug(row["precio provisional"]) === "si",
      widthCm: Inventory.number(row["ancho cm"]),
      heightCm: Inventory.number(row["alto cm"]),
      depthCm: Inventory.number(row["fondo cm"]),
      saleMode: mode === "subasta" ? "AUCTION" : "SALE",
      stock: Inventory.number(row["stock"]) ?? 1,
    };
  }

  /**
   * Same piece, several angles: "Bandeja (2).jpg" is another view of "Bandeja.jpg". The file without a
   * number is the main photo; without it, "(1)" is. The rest follow in number order.
   */
  static orderPhotos(files: string[]): string[] {
    const number = (file: string) => Number(/\((\d+)\)\.[^.]+$/.exec(file)?.[1] ?? 0);
    return [...files].sort((a, b) => number(a) - number(b));
  }

  private static list(value: string | undefined): string[] {
    return (value ?? "")
      .split(/[|,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private static number(value: string | undefined): number | null {
    if (!value) return null;
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }

  /** "1:215,0,680,864" → photo 1 is cut to left 215, top 0, width 680, height 864. Several are separated by "|". */
  private static crops(value: string | undefined): Map<number, CropBox> {
    const result = new Map<number, CropBox>();
    for (const part of (value ?? "").split("|").map((item) => item.trim()).filter(Boolean)) {
      const match = /^(\d+):(\d+),(\d+),(\d+),(\d+)$/.exec(part.replace(/\s/g, ""));
      if (!match) throw new Error(`Invalid crop "${part}"`);
      const [, index, left, top, width, height] = match.map(Number);
      result.set(index, { left, top, width, height });
    }
    return result;
  }
}
