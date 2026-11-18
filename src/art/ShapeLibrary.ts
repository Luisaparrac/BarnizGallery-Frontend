/** SVG outlines of each piece shape, drawn in an 800 × 800 frame. */
export class ShapeLibrary {
  private static readonly outlines: Record<string, string> = {
    bandeja:
      "M150 250 Q150 210 190 210 L610 210 Q650 210 650 250 L650 550 Q650 590 610 590 L190 590 Q150 590 150 550 Z",
    caja: "M190 330 L400 260 L610 330 L610 590 L400 650 L190 590 Z",
    jarron:
      "M330 140 L470 140 L460 190 Q600 270 590 430 Q580 590 470 650 L330 650 Q220 590 210 430 Q200 270 340 190 Z",
    plato: "M400 130 A270 270 0 1 1 399.9 130 Z",
    cuenco: "M140 330 L660 330 Q650 560 470 620 L330 620 Q150 560 140 330 Z",
    joyero: "M230 360 Q230 250 400 240 Q570 250 570 360 L590 360 L590 600 L210 600 L210 360 Z",
    mascara:
      "M400 130 Q600 140 610 360 Q610 560 400 680 Q190 560 190 360 Q200 140 400 130 Z M300 320 Q340 290 370 330 Q340 360 300 320 Z M430 330 Q460 290 500 320 Q460 360 430 330 Z",
    escultura:
      "M400 120 Q480 120 490 200 Q560 230 560 340 Q600 420 560 520 L580 660 L220 660 L240 520 Q200 420 240 340 Q240 230 310 200 Q320 120 400 120 Z",
    marco: "M170 150 L630 150 L630 650 L170 650 Z M260 240 L260 560 L540 560 L540 240 Z",
    cuadro: "M220 120 L580 120 L580 680 L220 680 Z",
    mueble: "M200 180 L600 180 L600 600 L570 600 L570 670 L530 670 L530 600 L270 600 L270 670 L230 670 L230 600 L200 600 Z",
    accesorio: "M400 170 A90 90 0 1 1 399.9 170 Z M400 380 L530 560 Q400 680 270 560 Z",
  };

  static outline(shape: string): string {
    return ShapeLibrary.outlines[shape] ?? ShapeLibrary.outlines.bandeja;
  }

  static get codes(): string[] {
    return Object.keys(ShapeLibrary.outlines);
  }
}
