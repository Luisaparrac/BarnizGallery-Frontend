import type { Catalogs } from "../domain/catalog";
import type { Localizer } from "../i18n/Localizer";
import type { ChipOption } from "./ChipPicker";

/** Turns catalog lists into chip options in the active language (only active items). */
export class CatalogOptions {
  constructor(
    private readonly catalogs: Catalogs | null,
    private readonly i18n: Localizer,
  ) {}

  colors(): ChipOption[] {
    return (this.catalogs?.colors ?? []).filter((item) => item.isActive).map((item) => ({ id: item.id, label: this.i18n.name(item), swatch: item.hex }));
  }

  shapes(): ChipOption[] {
    return this.plain(this.catalogs?.shapes);
  }

  motifs(): ChipOption[] {
    return this.plain(this.catalogs?.motifs);
  }

  styles(): ChipOption[] {
    return this.plain(this.catalogs?.styles);
  }

  budgets(): ChipOption[] {
    return this.plain(this.catalogs?.budgets);
  }

  private plain(list: { id: number; nameEs: string; nameEn: string; isActive: boolean; sortOrder: number }[] | undefined): ChipOption[] {
    return (list ?? [])
      .filter((item) => item.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({ id: item.id, label: this.i18n.name(item) }));
  }
}
