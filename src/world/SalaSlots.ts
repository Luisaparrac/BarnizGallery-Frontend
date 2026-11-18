import type { WorldRoom } from "./WorldTypes";

/** Where a sala stands in the plaza. World axes: +x east, +z north, y up; the visitor enters from the south. */
export interface SalaSlot {
  x: number;
  z: number;
  /** Y rotation that turns the door towards the plaza centre. */
  facing: number;
  /** Surname this slot was designed for, so known masters keep their usual place. */
  preferredKey: string;
}

/** The six building plots around the plaza and how the masters are assigned to them. */
export class SalaSlots {
  static readonly slots: readonly SalaSlot[] = [
    { x: -14, z: 40, facing: 0, preferredKey: "valderrama" },
    { x: 14, z: 40, facing: 0, preferredKey: "naria" },
    { x: 42, z: 11, facing: Math.PI / 2, preferredKey: "cabrera" },
    { x: 42, z: -11, facing: Math.PI / 2, preferredKey: "hernaza" },
    { x: -42, z: 11, facing: -Math.PI / 2, preferredKey: "uzcategui" },
    { x: -42, z: -11, facing: -Math.PI / 2, preferredKey: "chavez" },
  ];

  static get capacity(): number {
    return SalaSlots.slots.length;
  }

  /** Gives every room a plot: first the plot named after its master, then the first free one. */
  static assign(rooms: readonly WorldRoom[]): { room: WorldRoom; slot: SalaSlot }[] {
    const free = new Set(SalaSlots.slots);
    const result: { room: WorldRoom; slot: SalaSlot }[] = [];
    const pending: WorldRoom[] = [];
    for (const room of rooms.slice(0, SalaSlots.capacity)) {
      const name = SalaSlots.normalize(room.masterName);
      const slot = [...free].find((candidate) => name.includes(candidate.preferredKey));
      if (slot) {
        free.delete(slot);
        result.push({ room, slot });
      } else pending.push(room);
    }
    for (const room of pending) {
      const slot = [...free][0];
      free.delete(slot);
      result.push({ room, slot });
    }
    return result;
  }

  private static normalize(text: string): string {
    return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }
}
