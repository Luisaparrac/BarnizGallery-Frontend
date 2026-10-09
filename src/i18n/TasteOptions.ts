export interface TasteOption {
  /** Stable value sent to the backend (Spanish, lower case). */
  value: string;
  labels: { es: string; en: string };
}

/** Choices offered by the kiosk questionnaire. */
export class TasteOptions {
  static readonly colors: readonly TasteOption[] = [
    { value: "rojo", labels: { es: "Rojo", en: "Red" } },
    { value: "verde", labels: { es: "Verde", en: "Green" } },
    { value: "dorado", labels: { es: "Dorado", en: "Gold" } },
    { value: "negro", labels: { es: "Negro", en: "Black" } },
    { value: "azul", labels: { es: "Azul", en: "Blue" } },
    { value: "multicolor", labels: { es: "Multicolor", en: "Multicolor" } },
  ];

  static readonly types: readonly TasteOption[] = [
    { value: "bandeja", labels: { es: "Bandejas", en: "Trays" } },
    { value: "caja", labels: { es: "Cajas", en: "Boxes" } },
    { value: "jarrón", labels: { es: "Jarrones", en: "Vases" } },
    { value: "escultura", labels: { es: "Esculturas", en: "Sculptures" } },
  ];

  static readonly styles: readonly TasteOption[] = [
    { value: "tradicional", labels: { es: "Tradicional", en: "Traditional" } },
    { value: "contemporáneo", labels: { es: "Contemporáneo", en: "Contemporary" } },
  ];

  static readonly budgets: readonly TasteOption[] = [
    { value: "0-100", labels: { es: "Hasta 100", en: "Up to 100" } },
    { value: "100-300", labels: { es: "100 – 300", en: "100 – 300" } },
    { value: "300-800", labels: { es: "300 – 800", en: "300 – 800" } },
    { value: "800+", labels: { es: "Más de 800", en: "Over 800" } },
  ];
}
