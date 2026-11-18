/** Colors, fonts and sizes shared by every 3D panel and the HUD (same palette as the panel site). */
export class UiTheme {
  /** Layer of the UI camera: the world camera never sees it, so post-processing does not touch the UI. */
  static readonly LAYER_MASK = 0x10000000;

  static readonly color = {
    ink: "#241612",
    inkSoft: "#5b4339",
    paper: "#f6efe2",
    paperShade: "#ebdfc8",
    line: "#cdb894",
    accent: "#b8321f",
    accentHover: "#9c2817",
    green: "#2f5d3a",
    white: "#ffffff",
    disabled: "#a89a88",
    hudBack: "#1a100cc0",
    hudBackHover: "#3a2419d9",
    hudText: "#f6efe2",
    hudTextMuted: "#b9ab98",
  } as const;

  static readonly font = {
    display: '"Bricolage Grotesque", "Segoe UI", system-ui, sans-serif',
    body: '"Figtree", "Segoe UI", system-ui, sans-serif',
  } as const;

  /** Sizes on the paper of a panel, in texture pixels (the paper is PanelSurface.PAPER_WIDTH wide). */
  static readonly panel = {
    padding: 64,
    gap: 22,
    title: 56,
    subtitle: 36,
    body: 28,
    small: 23,
    controlHeight: 68,
    radius: 14,
    swatch: 56,
  } as const;

  /** Sizes of the HUD, in screen pixels. */
  static readonly hud = {
    margin: 18,
    gap: 10,
    buttonHeight: 42,
    text: 18,
    prompt: 20,
    radius: 21,
  } as const;
}
