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

export interface ThemeJourneyTokens {
  preset: TileThemePreset;
  pageGradient: string;
  pageGlow: string;
  surfaceCard: string;
  surfaceCardMuted: string;
  surfaceBorder: string;
  heroPanel: string;
  heroPanelSoft: string;
  chip: string;
  chipSelected: string;
  primaryButton: string;
  secondaryButton: string;
  answerOption: string;
  answerOptionSelected: string;
  answerOptionCorrect: string;
  progressTrack: string;
  progressFill: string;
  badge: string;
  mascotGlow: string;
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

function buildJourneyTokens(preset: TileThemePreset): Omit<ThemeJourneyTokens, "preset"> {
  const groupTokens: Record<TileThemePreset["group"], Omit<ThemeJourneyTokens, "preset">> = {
    sports: {
      pageGradient: "bg-gradient-to-br from-orange-50 via-amber-50 to-rose-100",
      pageGlow: "from-orange-200/60 via-amber-100/30 to-transparent",
      surfaceCard: "bg-white/95",
      surfaceCardMuted: "bg-orange-50/80",
      surfaceBorder: "border-orange-200/80",
      heroPanel: "bg-gradient-to-br from-orange-500 via-amber-500 to-red-500 text-white",
      heroPanelSoft: "bg-gradient-to-br from-orange-100 via-amber-50 to-rose-50",
      chip: "bg-orange-100 text-orange-800 border-orange-200",
      chipSelected: "bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-200",
      primaryButton: "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-orange-200",
      secondaryButton: "bg-white text-orange-700 border-orange-200 hover:bg-orange-50",
      answerOption: "border-orange-100 hover:border-orange-300 hover:bg-orange-50",
      answerOptionSelected: "border-orange-500 bg-orange-50 ring-2 ring-orange-200",
      answerOptionCorrect: "border-emerald-400 bg-emerald-50",
      progressTrack: "bg-orange-100",
      progressFill: "bg-gradient-to-r from-orange-500 to-red-500",
      badge: "bg-orange-100 text-orange-800",
      mascotGlow: "shadow-orange-100",
    },
    places: {
      pageGradient: "bg-gradient-to-br from-indigo-50 via-purple-50 to-sky-100",
      pageGlow: "from-indigo-200/60 via-purple-100/30 to-transparent",
      surfaceCard: "bg-white/95",
      surfaceCardMuted: "bg-indigo-50/80",
      surfaceBorder: "border-indigo-200/80",
      heroPanel: "bg-gradient-to-br from-indigo-500 via-violet-500 to-sky-500 text-white",
      heroPanelSoft: "bg-gradient-to-br from-indigo-100 via-violet-50 to-sky-50",
      chip: "bg-indigo-100 text-indigo-800 border-indigo-200",
      chipSelected: "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200",
      primaryButton: "bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-indigo-200",
      secondaryButton: "bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50",
      answerOption: "border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50",
      answerOptionSelected: "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200",
      answerOptionCorrect: "border-emerald-400 bg-emerald-50",
      progressTrack: "bg-indigo-100",
      progressFill: "bg-gradient-to-r from-indigo-500 to-sky-500",
      badge: "bg-indigo-100 text-indigo-800",
      mascotGlow: "shadow-indigo-100",
    },
    themes: {
      pageGradient: "bg-gradient-to-br from-pink-50 via-rose-50 to-purple-100",
      pageGlow: "from-pink-200/60 via-rose-100/30 to-transparent",
      surfaceCard: "bg-white/95",
      surfaceCardMuted: "bg-pink-50/80",
      surfaceBorder: "border-pink-200/80",
      heroPanel: "bg-gradient-to-br from-pink-500 via-rose-500 to-purple-500 text-white",
      heroPanelSoft: "bg-gradient-to-br from-pink-100 via-rose-50 to-purple-50",
      chip: "bg-pink-100 text-pink-800 border-pink-200",
      chipSelected: "bg-pink-600 text-white border-pink-600 shadow-lg shadow-pink-200",
      primaryButton: "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-pink-200",
      secondaryButton: "bg-white text-pink-700 border-pink-200 hover:bg-pink-50",
      answerOption: "border-pink-100 hover:border-pink-300 hover:bg-pink-50",
      answerOptionSelected: "border-pink-500 bg-pink-50 ring-2 ring-pink-200",
      answerOptionCorrect: "border-emerald-400 bg-emerald-50",
      progressTrack: "bg-pink-100",
      progressFill: "bg-gradient-to-r from-pink-500 to-purple-500",
      badge: "bg-pink-100 text-pink-800",
      mascotGlow: "shadow-pink-100",
    },
    games: {
      pageGradient: "bg-gradient-to-br from-slate-50 via-violet-50 to-fuchsia-100",
      pageGlow: "from-slate-200/60 via-violet-100/30 to-transparent",
      surfaceCard: "bg-white/95",
      surfaceCardMuted: "bg-violet-50/80",
      surfaceBorder: "border-violet-200/80",
      heroPanel: "bg-gradient-to-br from-violet-600 via-fuchsia-500 to-slate-700 text-white",
      heroPanelSoft: "bg-gradient-to-br from-violet-100 via-fuchsia-50 to-slate-50",
      chip: "bg-violet-100 text-violet-800 border-violet-200",
      chipSelected: "bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-200",
      primaryButton: "bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-violet-200",
      secondaryButton: "bg-white text-violet-700 border-violet-200 hover:bg-violet-50",
      answerOption: "border-violet-100 hover:border-violet-300 hover:bg-violet-50",
      answerOptionSelected: "border-violet-500 bg-violet-50 ring-2 ring-violet-200",
      answerOptionCorrect: "border-emerald-400 bg-emerald-50",
      progressTrack: "bg-violet-100",
      progressFill: "bg-gradient-to-r from-violet-600 to-fuchsia-500",
      badge: "bg-violet-100 text-violet-800",
      mascotGlow: "shadow-violet-100",
    },
  };

  return groupTokens[preset.group];
}

export function getThemeJourneyTokens(
  themeId: string | undefined,
  child: Pick<Child, "ageGroup" | "yearLevel" | "country">
): ThemeJourneyTokens {
  const preset = getTileThemePreset(themeId, child);
  const base = buildJourneyTokens(preset);
  return {
    preset,
    ...base,
  };
}
