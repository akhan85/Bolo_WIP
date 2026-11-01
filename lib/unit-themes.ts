// Each unit on the learning path gets its own colour; lessons match their unit.
export const UNIT_THEMES = [
  {
    banner: "bg-green-500 border-green-600",
    button: "bg-green-500 border-green-600 hover:bg-green-500/90",
    ring: "#58cc02",
  },
  {
    banner: "bg-sky-500 border-sky-600",
    button: "bg-sky-500 border-sky-600 hover:bg-sky-500/90",
    ring: "#1cb0f6",
  },
  {
    banner: "bg-violet-500 border-violet-600",
    button: "bg-violet-500 border-violet-600 hover:bg-violet-500/90",
    ring: "#8b5cf6",
  },
  {
    banner: "bg-orange-500 border-orange-600",
    button: "bg-orange-500 border-orange-600 hover:bg-orange-500/90",
    ring: "#ff9600",
  },
  {
    banner: "bg-rose-500 border-rose-600",
    button: "bg-rose-500 border-rose-600 hover:bg-rose-500/90",
    ring: "#ff4b4b",
  },
  {
    banner: "bg-teal-500 border-teal-600",
    button: "bg-teal-500 border-teal-600 hover:bg-teal-500/90",
    ring: "#14b8a6",
  },
] as const;

export type UnitTheme = (typeof UNIT_THEMES)[number];

export const unitTheme = (order: number): UnitTheme =>
  UNIT_THEMES[(order - 1 + UNIT_THEMES.length) % UNIT_THEMES.length];
