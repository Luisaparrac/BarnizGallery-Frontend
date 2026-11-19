/**
 * What Babylon GUI still draws outside the boards: the layer of the UI camera and the name that
 * floats over the pedestals. The boards and the HUD take their look from dom-ui.css (HTML) or
 * BoardTheme (?ui=babylon).
 */
export class UiTheme {
  /** Layer of the UI camera: the world camera never sees it, so post-processing does not touch the UI. */
  static readonly LAYER_MASK = 0x10000000;

  static readonly color = {
    hudBack: "#1a100cc0",
    hudText: "#f6efe2",
  } as const;

  static readonly font = {
    body: '"Figtree", "Segoe UI", system-ui, sans-serif',
  } as const;

  /** Sizes of the HUD, in screen pixels. */
  static readonly hud = {
    text: 18,
  } as const;
}
