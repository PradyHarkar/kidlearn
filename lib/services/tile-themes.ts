import type { AgeGroup, Child } from "@/types";

export interface TileThemePreset {
  id: string;
  group: "sports" | "places" | "themes" | "games";
  label: string;
  subtitle: string;
  emoji: string;
  accentFrom: string;
  accentTo: string;
  surface: string;
  text: string;
}

export const TILE_THEME_PRESETS: TileThemePreset[] = [
  { id: "sports-stadium", group: "sports", label: "Stadium", subtitle: "Bold, energetic, game-day feel", emoji: "🏟️", accentFrom: "from-orange-500", accentTo: "to-red-500", surface: "from-orange-50 via-amber-50 to-red-50", text: "text-orange-900" },
  { id: "sports-court", group: "sports", label: "Court", subtitle: "Clean hoops and fast play", emoji: "🏀", accentFrom: "from-amber-500", accentTo: "to-orange-500", surface: "from-amber-50 via-yellow-50 to-orange-50", text: "text-amber-900" },
  { id: "places-castle", group: "places", label: "Castle", subtitle: "Fairy-tale world and big adventures", emoji: "🏰", accentFrom: "from-indigo-500", accentTo: "to-fuchsia-500", surface: "from-indigo-50 via-purple-50 to-fuchsia-50", text: "text-indigo-900" },
  { id: "places-city", group: "places", label: "City", subtitle: "Modern, bright, polished tiles", emoji: "🌆", accentFrom: "from-sky-500", accentTo: "to-cyan-500", surface: "from-sky-50 via-cyan-50 to-blue-50", text: "text-sky-900" },
  { id: "themes-rainbow", group: "themes", label: "Rainbow", subtitle: "Playful and colorful by default", emoji: "🌈", accentFrom: "from-pink-500", accentTo: "to-purple-500", surface: "from-pink-50 via-rose-50 to-purple-50", text: "text-pink-900" },
  { id: "themes-ocean", group: "themes", label: "Ocean", subtitle: "Calm, cool, and easy on the eyes", emoji: "🌊", accentFrom: "from-cyan-500", accentTo: "to-blue-500", surface: "from-cyan-50 via-blue-50 to-sky-50", text: "text-cyan-900" },
  { id: "games-arcade", group: "games", label: "Arcade", subtitle: "Bright arcade glow and neon energy", emoji: "🕹️", accentFrom: "from-violet-500", accentTo: "to-fuchsia-500", surface: "from-violet-50 via-fuchsia-50 to-pink-50", text: "text-violet-900" },
  { id: "games-space", group: "games", label: "Space", subtitle: "Stars, rockets, and cosmic focus", emoji: "🚀", accentFrom: "from-slate-700", accentTo: "to-indigo-600", surface: "from-slate-50 via-indigo-50 to-blue-50", text: "text-slate-900" },
];

function normalizeAgeGroup(ageGroup: AgeGroup | undefined): AgeGroup {
  return ageGroup || "year3";
}

export function getDefaultTileThemeId(child: Pick<Child, "ageGroup" | "yearLevel" | "country">): string {
  const ageGroup = normalizeAgeGroup(child.ageGroup ?? (child.yearLevel === "prep" ? "foundation" : (child.yearLevel as AgeGroup | undefined)));
  if (ageGroup === "foundation" || ageGroup === "year1") return "themes-rainbow";
  if (ageGroup === "year2" || ageGroup === "year3") return "games-arcade";
  if (ageGroup === "year4" || ageGroup === "year5") return "places-castle";
  if (ageGroup === "year6" || ageGroup === "year7" || ageGroup === "year8") return "themes-ocean";
  return "themes-rainbow";
}

export function getTileThemePreset(themeId: string | undefined, child: Pick<Child, "ageGroup" | "yearLevel" | "country">): TileThemePreset {
  return TILE_THEME_PRESETS.find((preset) => preset.id === themeId) ?? TILE_THEME_PRESETS.find((preset) => preset.id === getDefaultTileThemeId(child)) ?? TILE_THEME_PRESETS[0];
}

export function getTileThemeGroups() {
  return ["sports", "places", "themes", "games"] as const;
}
