import type { GalleryNode } from "../model/models";
import { RoomDefinition } from "./RoomDefinition";

/** The six salas of the gallery and helpers to match them with backend data. */
export class RoomCatalog {
  static readonly rooms: readonly RoomDefinition[] = [
    new RoomDefinition("valderrama", "Richard Valderrama", "Valderrama", -14, 40, 0, ["tradicional", "rojo", "bandeja"]),
    new RoomDefinition("naria", "José Naria", "Naria", 14, 40, 0, ["contemporáneo", "verde", "caja"]),
    new RoomDefinition("cabrera", "María Cabrera", "Cabrera", 42, 11, Math.PI / 2, ["tradicional", "dorado", "jarrón"]),
    new RoomDefinition("hernaza", "Ricardo Hernaza", "Hernaza", 42, -11, Math.PI / 2, ["contemporáneo", "negro", "escultura"]),
    new RoomDefinition("uzcategui", "David Uzcátegui", "Uzcátegui", -42, 11, -Math.PI / 2, ["tradicional", "multicolor", "caja"]),
    new RoomDefinition("chavez", "Wilson Chávez", "Chávez", -42, -11, -Math.PI / 2, ["contemporáneo", "azul", "bandeja"]),
  ];

  static normalize(text: string): string {
    return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }

  static find(key: string): RoomDefinition | undefined {
    return RoomCatalog.rooms.find((room) => room.key === key);
  }

  /** Finds which sala a backend room or master name refers to. */
  static matchKey(...names: (string | undefined)[]): string | undefined {
    const haystack = RoomCatalog.normalize(names.filter(Boolean).join(" "));
    return RoomCatalog.rooms.find((room) => haystack.includes(room.key))?.key;
  }

  /** Gallery used when the backend is unreachable or has no data yet (it ships no seed data). */
  static demoGallery(): GalleryNode {
    return {
      type: "GALLERY",
      nameEs: "MUSEO (demo)",
      nameEn: "MUSEO (demo)",
      artworkCount: 0,
      availableForAuctionCount: 0,
      children: RoomCatalog.rooms.map((room, index) => ({
        id: -(index + 1),
        type: "ROOM" as const,
        nameEs: room.displayName.es,
        nameEn: room.displayName.en,
        artworkCount: 0,
        availableForAuctionCount: 0,
        masterName: room.master,
        children: [],
      })),
    };
  }
}
