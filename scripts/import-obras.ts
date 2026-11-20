/**
 * Copies the real photos of the works into public/obras, optimized for the web.
 *
 *   npm run import:obras -- --src "C:\ruta\Obras-BarnizGallery"
 *
 * Reads data/maestros.csv and data/obras.csv, opens each original (avif, png, webp or jpeg) from
 * <src>/<carpeta del maestro>/ and writes public/obras/<maestro>/<obra>-<n>.webp: at most 1600 px
 * per side and about 300 KB. The originals are only read, never changed. Running it again
 * rewrites the output and removes old outputs (public/obras/<clave>/*.webp) that are no longer in the
 * inventory; other folders in public/obras are left alone.
 */
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Inventory, type InventoryPhoto } from "./lib/Inventory.ts";

const MAX_SIDE = 1600;
const TARGET_BYTES = 300 * 1024;
const QUALITIES = [82, 76, 70, 64, 58, 52];

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = join(root, "public");

function sourceDir(): string {
  const index = process.argv.indexOf("--src");
  const dir = index >= 0 ? process.argv[index + 1] : process.env.OBRAS_DIR;
  if (!dir) throw new Error('Missing the originals folder: npm run import:obras -- --src "C:\\ruta\\Obras-BarnizGallery"');
  if (!existsSync(dir)) throw new Error(`Folder not found: ${dir}`);
  return dir;
}

async function optimize(input: string, photo: InventoryPhoto): Promise<{ bytes: number; width: number; height: number; quality: number }> {
  const output = join(outputRoot, photo.output);
  for (const quality of QUALITIES) {
    let image = sharp(input, { failOn: "error" }).rotate();
    if (photo.crop) image = image.extract(photo.crop);
    const { data, info } = await image
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality, effort: 6 })
      .toBuffer({ resolveWithObject: true });
    if (data.length <= TARGET_BYTES || quality === QUALITIES[QUALITIES.length - 1]) {
      await sharp(data).toFile(output);
      return { bytes: data.length, width: info.width, height: info.height, quality };
    }
  }
  throw new Error("unreachable");
}

/**
 * Deletes old .webp outputs that the inventory no longer produces. It only looks inside the output
 * folders (public/obras/<clave>/), never in other folders such as copies of the originals.
 */
function removeStale(inventory: Inventory, expected: Set<string>): void {
  for (const master of inventory.masters) {
    const dir = join(outputRoot, "obras", master.key);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const path = relative(outputRoot, full).replaceAll("\\", "/");
      if (!statSync(full).isFile() || !/^[a-z0-9-]+-\d+\.webp$/.test(name) || expected.has(path)) continue;
      rmSync(full);
      console.log(`  removed ${path}`);
    }
  }
}

async function main(): Promise<void> {
  const src = sourceDir();
  const inventory = new Inventory(join(root, "data"));
  const expected = new Set<string>();
  let total = 0;
  for (const work of inventory.works) {
    const master = inventory.master(work.masterKey);
    for (const photo of work.photos) {
      const input = join(src, master.folder, photo.source);
      if (!existsSync(input)) throw new Error(`Original not found: ${input}`);
      mkdirSync(dirname(join(outputRoot, photo.output)), { recursive: true });
      const result = await optimize(input, photo);
      expected.add(photo.output);
      total += result.bytes;
      console.log(`${photo.output}  ${result.width}x${result.height}  q${result.quality}  ${Math.round(result.bytes / 1024)} KB`);
    }
  }
  removeStale(inventory, expected);
  console.log(`${inventory.works.length} works, ${expected.size} photos, ${Math.round(total / 1024)} KB in total.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
