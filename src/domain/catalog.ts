import type { Id } from "./common";

/** Fields shared by every catalog the administrator edits (colors, shapes, motifs...). */
export interface CatalogItem {
  id: Id;
  code: string;
  nameEs: string;
  nameEn: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Color extends CatalogItem {
  /** Null for "multicolor". */
  hex: string | null;
}

export type Shape = CatalogItem;
export type Motif = CatalogItem;
export type Style = CatalogItem;

export interface BudgetRange extends CatalogItem {
  minAmount: number;
  /** Null = no upper limit. */
  maxAmount: number | null;
  currency: string;
}

export interface Avatar extends CatalogItem {
  imageUrl: string;
}

export type SectionType =
  | "COVER"
  | "STORY"
  | "TECHNIQUE"
  | "WORKSHOP"
  | "GALLERY"
  | "CATALOG"
  | "FEATURED"
  | "AUCTIONS"
  | "CUSTOM_ORDERS"
  | "CONTACT"
  | "FREE_TEXT";

export interface StoreTheme {
  primary: string;
  accent: string;
  background: string;
  font: string;
}

export interface StoreTemplate {
  id: Id;
  code: string;
  nameEs: string;
  nameEn: string;
  descriptionEs: string;
  descriptionEn: string;
  previewUrl: string;
  defaultLayout: SectionType[];
  defaultTheme: StoreTheme;
  sortOrder: number;
  isActive: boolean;
}

export interface Catalogs {
  colors: Color[];
  shapes: Shape[];
  motifs: Motif[];
  styles: Style[];
  budgets: BudgetRange[];
  avatars: Avatar[];
  templates: StoreTemplate[];
}

export type CatalogKind = "colors" | "shapes" | "motifs" | "styles" | "budgets" | "avatars" | "templates";
