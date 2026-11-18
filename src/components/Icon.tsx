const PATHS: Record<string, string> = {
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "M6 6l12 12M18 6L6 18",
  cart: "M3 4h2l2.4 11h10.2L20 8H6.2M9 20a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z",
  bell: "M6 16V11a6 6 0 1112 0v5l2 2H4l2-2zm4 4h4",
  chat: "M4 5h16v11H9l-5 4V5z",
  heart: "M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z",
  search: "M11 18a7 7 0 100-14 7 7 0 000 14zm9 2l-4.5-4.5",
  zoom: "M11 18a7 7 0 100-14 7 7 0 000 14zm9 2l-4.5-4.5M11 8v6M8 11h6",
  share: "M8 12l8-5M8 12l8 5M6 14a2 2 0 100-4 2 2 0 000 4zm12-7a2 2 0 100-4 2 2 0 000 4zm0 14a2 2 0 100-4 2 2 0 000 4z",
  flag: "M5 21V4h11l-2 4 2 4H5",
  left: "M15 5l-7 7 7 7",
  right: "M9 5l7 7-7 7",
  up: "M6 15l6-6 6 6",
  down: "M6 9l6 6 6-6",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm10 3a3 3 0 100-6 3 3 0 000 6z",
  eyeOff: "M3 3l18 18M10.6 6.1A10 10 0 0112 6c6 0 10 6 10 6a17 17 0 01-3.2 3.8M6.4 6.4A17 17 0 002 12s4 6 10 6a9.8 9.8 0 004.1-.9",
  plus: "M12 5v14M5 12h14",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  upload: "M12 16V4m0 0l-4 4m4-4l4 4M4 16v4h16v-4",
  check: "M5 12l5 5L20 7",
  gavel: "M14 4l6 6M11 7l6 6M8 10l6-6 6 6-6 6M12 12l-8 8M3 21h8",
  spark: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6",
  store: "M4 9l1-5h14l1 5M4 9v11h16V9M4 9h16M9 20v-6h6v6",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19 12l2-1-1-3-2 .3-1.5-1.5L17 5l-3-1-1 2h-2L10 4 7 5l.3 2L6 8.5 4 8l-1 3 2 1v0l-2 1 1 3 2-.3L7.5 17 7 19l3 1 1-2h2l1 2 3-1-.3-2 1.5-1.5 2 .3 1-3-2-1z",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zm-3 9l2 2 4-4",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  coins: "M12 4c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zm-8 3v5c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5",
  box: "M3 7l9-4 9 4-9 4-9-4zm0 0v10l9 4 9-4V7M12 11v10",
  truck: "M3 6h11v10H3zM14 10h4l3 3v3h-7M7 19a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4z",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zm-8 9c0-4 4-6 8-6s8 2 8 6",
  logout: "M10 5H5v14h5M14 8l4 4-4 4M18 12H9",
  brush: "M14 4l6 6-8 8-6-6 8-8zM6 12l-2 8 8-2",
  history: "M4 12a8 8 0 108-8 8 8 0 00-6 2.7M4 4v4h4M12 8v4l3 2",
};

export type IconName = keyof typeof PATHS;

/** Line icons drawn inline, sized by the text around them. */
export function Icon({ name, size = 18, filled = false, label }: { name: IconName; size?: number; filled?: boolean; label?: string }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
