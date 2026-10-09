/**
 * Static description of one master's sala: who it belongs to and where it stands in the plaza.
 * World axes (Babylon): +x east, +z north, y up. The visitor enters from the south (z < 0).
 */
export class RoomDefinition {
  constructor(
    /** Surname without accents, used to match backend rooms. */
    readonly key: string,
    readonly master: string,
    readonly label: string,
    readonly x: number,
    readonly z: number,
    /** Y rotation that turns the door towards the plaza centre. */
    readonly facing: number,
    /** Placeholder tags used ONLY by the offline demo recommender. */
    readonly demoTags: readonly string[],
  ) {}

  get displayName(): { es: string; en: string } {
    return { es: `Sala ${this.master}`, en: `${this.master} Room` };
  }
}
