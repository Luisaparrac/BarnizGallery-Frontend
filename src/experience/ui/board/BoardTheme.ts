/**
 * Design tokens of the boards (see the design plan): six colors, two fonts with a clear scale and
 * sizes in multiples of 8. Sizes are screen pixels; the paper is drawn at SCALE times that, so
 * the text stays sharp. Use `BoardTheme.px` to turn a size into texture pixels.
 */
export class BoardTheme {
  /** Texture pixels per screen pixel. */
  static readonly SCALE = 2;

  static readonly color = {
    ink: "#241612",
    inkSoft: "#241612b3",
    paper: "#f6efe2",
    paperHover: "#efe5d2",
    line: "#d9c7a3",
    red: "#b3261e",
    redHover: "#8f1d17",
    green: "#2e7d32",
    /** Background of a chosen card: the green barely showing. */
    greenTint: "rgba(46, 125, 50, 0.035)",
    /** Cards a little lighter than the paper (the order summary). */
    card: "#fbf7ef",
    bronze: "#b08a3e",
    wood: "#5e3822",
    white: "#ffffff",
  } as const;

  static readonly font = {
    display: '"Bricolage Grotesque", "Segoe UI", system-ui, sans-serif',
    body: '"Figtree", "Segoe UI", system-ui, sans-serif',
  } as const;

  /** Type scale: title, section, text and note/label. */
  static readonly type = {
    title: 40,
    section: 26,
    text: 18,
    note: 15,
    button: 16,
  } as const;

  /** Paper widths of each kind of board. */
  static readonly width = {
    form: 560,
    content: 780,
    piece: 980,
  } as const;

  static readonly size = {
    padding: 40,
    gap: 24,
    gapSmall: 8,
    gapMedium: 16,
    band: 16,
    frame: 14,
    corner: 20,
    /** Room around the frame for its shadow. */
    margin: 48,
    control: 48,
    radius: 8,
    border: 2,
    focus: 3,
    /** Highest share of the screen the board may take; the rest scrolls. */
    maxScreenHeight: 0.8,
  } as const;

  static px(value: number): number {
    return Math.round(value * BoardTheme.SCALE);
  }
}
