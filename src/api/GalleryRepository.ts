import { RoomCatalog } from "../data/RoomCatalog";
import type { GalleryNode, Language } from "../model/models";

/** Holds the backend room nodes indexed by the key of their sala in the 3D world. */
export class GalleryRepository {
  private rooms = new Map<string, GalleryNode>();

  constructor() {
    this.useDemo();
  }

  /** Indexes a gallery tree; returns false (keeping the current data) if it holds no known room. */
  load(gallery: GalleryNode): boolean {
    const indexed = GalleryRepository.index(gallery);
    if (!indexed.size) return false;
    this.rooms = indexed;
    return true;
  }

  useDemo(): void {
    this.rooms = GalleryRepository.index(RoomCatalog.demoGallery());
  }

  displayName(key: string, language: Language): string {
    const node = this.rooms.get(key);
    const room = RoomCatalog.find(key);
    if (node) return language === "es" ? node.nameEs : node.nameEn;
    return room ? room.displayName[language] : key;
  }

  artworkCount(key: string): number {
    return this.rooms.get(key)?.artworkCount ?? 0;
  }

  private static index(gallery: GalleryNode): Map<string, GalleryNode> {
    const map = new Map<string, GalleryNode>();
    for (const node of gallery.children ?? []) {
      const key = RoomCatalog.matchKey(node.nameEs, node.nameEn, node.masterName);
      if (key) map.set(key, node);
    }
    return map;
  }
}
