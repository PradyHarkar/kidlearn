import type {
  AgeGroup,
  Child,
  ChildButtonStyle,
  ChildCardStyle,
  ChildPreferences,
  ChildRewardStyle,
  ChildThemeKey,
} from "@/types";

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
  themeKey: ChildThemeKey;
  preset: ChildThemePreset;
  themeLabel: string;
  themeEmoji: string;
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
  buttonStyle: ChildButtonStyle;
  cardStyle: ChildCardStyle;
  rewardStyle: ChildRewardStyle;
  backgroundImageHint: string;
}

export interface ChildThemePreset {
  id: ChildThemeKey;
  label: string;
  subtitle: string;
  emoji: string;
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
  backgroundImageHint: string;
  defaultButtonStyle: ChildButtonStyle;
  defaultCardStyle: ChildCardStyle;
  defaultRewardStyle: ChildRewardStyle;
}

type JourneyVisualTokens = {
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
};

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

export const CHILD_THEME_PRESETS: ChildThemePreset[] = [
  {
    id: "fantasy",
    label: "Fantasy",
    subtitle: "Castles, clouds, rainbows, and cozy magic",
    emoji: "🏰",
    pageGradient: "bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-100",
    pageGlow: "from-pink-200/60 via-purple-100/30 to-transparent",
    surfaceCard: "bg-white/95",
    surfaceCardMuted: "bg-purple-50/80",
    surfaceBorder: "border-purple-200/80",
    heroPanel: "bg-gradient-to-br from-purple-600 via-pink-500 to-amber-400 text-white",
    heroPanelSoft: "bg-gradient-to-br from-purple-100 via-pink-50 to-amber-50",
    chip: "bg-purple-100 text-purple-800 border-purple-200",
    chipSelected: "bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-200",
    primaryButton: "bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-purple-200",
    secondaryButton: "bg-white text-purple-700 border-purple-200 hover:bg-purple-50",
    answerOption: "border-purple-100 hover:border-purple-300 hover:bg-purple-50",
    answerOptionSelected: "border-purple-500 bg-purple-50 ring-2 ring-purple-200",
    answerOptionCorrect: "border-emerald-400 bg-emerald-50",
    progressTrack: "bg-purple-100",
    progressFill: "bg-gradient-to-r from-purple-600 to-pink-500",
    badge: "bg-purple-100 text-purple-800",
    mascotGlow: "shadow-purple-100",
    backgroundImageHint: "fantasy castle clouds rainbow",
    defaultButtonStyle: "gradient",
    defaultCardStyle: "soft",
    defaultRewardStyle: "coins",
  },
  {
    id: "unicorn",
    label: "Unicorn",
    subtitle: "Pink sparkles, rainbow trails, happy magic",
    emoji: "🦄",
    pageGradient: "bg-gradient-to-br from-pink-50 via-rose-50 to-fuchsia-100",
    pageGlow: "from-pink-200/60 via-rose-100/30 to-transparent",
    surfaceCard: "bg-white/96",
    surfaceCardMuted: "bg-pink-50/85",
    surfaceBorder: "border-pink-200/80",
    heroPanel: "bg-gradient-to-br from-pink-500 via-rose-500 to-fuchsia-500 text-white",
    heroPanelSoft: "bg-gradient-to-br from-pink-100 via-rose-50 to-fuchsia-50",
    chip: "bg-pink-100 text-pink-800 border-pink-200",
    chipSelected: "bg-pink-600 text-white border-pink-600 shadow-lg shadow-pink-200",
    primaryButton: "bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white shadow-pink-200",
    secondaryButton: "bg-white text-pink-700 border-pink-200 hover:bg-pink-50",
    answerOption: "border-pink-100 hover:border-pink-300 hover:bg-pink-50",
    answerOptionSelected: "border-pink-500 bg-pink-50 ring-2 ring-pink-200",
    answerOptionCorrect: "border-emerald-400 bg-emerald-50",
    progressTrack: "bg-pink-100",
    progressFill: "bg-gradient-to-r from-pink-500 to-fuchsia-500",
    badge: "bg-pink-100 text-pink-800",
    mascotGlow: "shadow-pink-100",
    backgroundImageHint: "unicorn sparkles rainbow pink",
    defaultButtonStyle: "cartoon",
    defaultCardStyle: "soft",
    defaultRewardStyle: "stars",
  },
  {
    id: "space",
    label: "Space",
    subtitle: "Dark purple skies, stars, and planets",
    emoji: "🚀",
    pageGradient: "bg-gradient-to-br from-slate-950 via-indigo-950 to-fuchsia-950",
    pageGlow: "from-indigo-600/35 via-fuchsia-500/20 to-transparent",
    surfaceCard: "bg-slate-900/90",
    surfaceCardMuted: "bg-slate-800/85",
    surfaceBorder: "border-slate-700/80",
    heroPanel: "bg-gradient-to-br from-slate-900 via-indigo-900 to-fuchsia-900 text-white",
    heroPanelSoft: "bg-gradient-to-br from-slate-800 via-indigo-900 to-slate-900",
    chip: "bg-indigo-900/70 text-indigo-100 border-indigo-700",
    chipSelected: "bg-cyan-400 text-slate-950 border-cyan-300 shadow-lg shadow-cyan-500/20",
    primaryButton: "bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white shadow-indigo-900/30",
    secondaryButton: "bg-slate-900 text-indigo-100 border-slate-700 hover:bg-slate-800",
    answerOption: "border-slate-700 hover:border-indigo-400 hover:bg-slate-800",
    answerOptionSelected: "border-cyan-400 bg-slate-800 ring-2 ring-cyan-400/40",
    answerOptionCorrect: "border-emerald-400 bg-emerald-950/40 text-emerald-100",
    progressTrack: "bg-slate-800",
    progressFill: "bg-gradient-to-r from-cyan-400 to-fuchsia-500",
    badge: "bg-slate-800 text-indigo-100",
    mascotGlow: "shadow-cyan-500/20",
    backgroundImageHint: "space planets stars purple galaxy",
    defaultButtonStyle: "gradient",
    defaultCardStyle: "bold",
    defaultRewardStyle: "gems",
  },
  {
    id: "soccer",
    label: "Soccer",
    subtitle: "Green fields, stadium lights, winning goals",
    emoji: "⚽",
    pageGradient: "bg-gradient-to-br from-lime-50 via-green-50 to-emerald-100",
    pageGlow: "from-lime-200/60 via-green-100/30 to-transparent",
    surfaceCard: "bg-white/96",
    surfaceCardMuted: "bg-green-50/80",
    surfaceBorder: "border-green-200/80",
    heroPanel: "bg-gradient-to-br from-green-600 via-lime-500 to-emerald-500 text-white",
    heroPanelSoft: "bg-gradient-to-br from-green-100 via-lime-50 to-emerald-50",
    chip: "bg-green-100 text-green-800 border-green-200",
    chipSelected: "bg-green-600 text-white border-green-600 shadow-lg shadow-green-200",
    primaryButton: "bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-green-200",
    secondaryButton: "bg-white text-green-700 border-green-200 hover:bg-green-50",
    answerOption: "border-green-100 hover:border-green-300 hover:bg-green-50",
    answerOptionSelected: "border-green-500 bg-green-50 ring-2 ring-green-200",
    answerOptionCorrect: "border-emerald-400 bg-emerald-50",
    progressTrack: "bg-green-100",
    progressFill: "bg-gradient-to-r from-green-500 to-emerald-500",
    badge: "bg-green-100 text-green-800",
    mascotGlow: "shadow-green-100",
    backgroundImageHint: "soccer field stadium goal",
    defaultButtonStyle: "cartoon",
    defaultCardStyle: "bold",
    defaultRewardStyle: "coins",
  },
  {
    id: "jungle",
    label: "Jungle",
    subtitle: "Animals, trees, vines, and wild adventures",
    emoji: "🦁",
    pageGradient: "bg-gradient-to-br from-emerald-50 via-lime-50 to-yellow-100",
    pageGlow: "from-emerald-200/60 via-lime-100/30 to-transparent",
    surfaceCard: "bg-white/96",
    surfaceCardMuted: "bg-emerald-50/80",
    surfaceBorder: "border-emerald-200/80",
    heroPanel: "bg-gradient-to-br from-emerald-600 via-lime-500 to-yellow-500 text-white",
    heroPanelSoft: "bg-gradient-to-br from-emerald-100 via-lime-50 to-yellow-50",
    chip: "bg-emerald-100 text-emerald-800 border-emerald-200",
    chipSelected: "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200",
    primaryButton: "bg-gradient-to-r from-emerald-600 to-lime-500 text-white shadow-emerald-200",
    secondaryButton: "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50",
    answerOption: "border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50",
    answerOptionSelected: "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200",
    answerOptionCorrect: "border-emerald-400 bg-emerald-50",
    progressTrack: "bg-emerald-100",
    progressFill: "bg-gradient-to-r from-emerald-500 to-lime-500",
    badge: "bg-emerald-100 text-emerald-800",
    mascotGlow: "shadow-emerald-100",
    backgroundImageHint: "jungle animals trees leaves",
    defaultButtonStyle: "cartoon",
    defaultCardStyle: "soft",
    defaultRewardStyle: "gems",
  },
  {
    id: "ocean",
    label: "Ocean",
    subtitle: "Fish, bubbles, coral, and calm blue waves",
    emoji: "🐠",
    pageGradient: "bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-100",
    pageGlow: "from-cyan-200/60 via-sky-100/30 to-transparent",
    surfaceCard: "bg-white/96",
    surfaceCardMuted: "bg-cyan-50/80",
    surfaceBorder: "border-cyan-200/80",
    heroPanel: "bg-gradient-to-br from-cyan-600 via-sky-500 to-blue-600 text-white",
    heroPanelSoft: "bg-gradient-to-br from-cyan-100 via-sky-50 to-blue-50",
    chip: "bg-cyan-100 text-cyan-800 border-cyan-200",
    chipSelected: "bg-cyan-600 text-white border-cyan-600 shadow-lg shadow-cyan-200",
    primaryButton: "bg-gradient-to-r from-cyan-600 to-blue-500 text-white shadow-cyan-200",
    secondaryButton: "bg-white text-cyan-700 border-cyan-200 hover:bg-cyan-50",
    answerOption: "border-cyan-100 hover:border-cyan-300 hover:bg-cyan-50",
    answerOptionSelected: "border-cyan-500 bg-cyan-50 ring-2 ring-cyan-200",
    answerOptionCorrect: "border-emerald-400 bg-emerald-50",
    progressTrack: "bg-cyan-100",
    progressFill: "bg-gradient-to-r from-cyan-500 to-blue-500",
    badge: "bg-cyan-100 text-cyan-800",
    mascotGlow: "shadow-cyan-100",
    backgroundImageHint: "ocean fish bubbles coral",
    defaultButtonStyle: "gradient",
    defaultCardStyle: "soft",
    defaultRewardStyle: "coins",
  },
];

const THEME_ALIAS_TO_KEY: Record<string, ChildThemeKey> = {
  "fantasy": "fantasy",
  "unicorn": "unicorn",
  "space": "space",
  "soccer": "soccer",
  "jungle": "jungle",
  "ocean": "ocean",
  "themes-rainbow": "fantasy",
  "games-arcade": "fantasy",
  "games-space": "space",
  "sports-stadium": "soccer",
  "sports-court": "soccer",
  "places-castle": "fantasy",
  "places-city": "jungle",
  "themes-ocean": "ocean",
};

export function getDefaultChildThemeKey(): ChildThemeKey {
  return "fantasy";
}

export function resolveChildThemeKey(theme: string | undefined, child: Pick<Child, "ageGroup" | "yearLevel" | "country">): ChildThemeKey {
  const normalized = String(theme || "").trim().toLowerCase();
  if (normalized && THEME_ALIAS_TO_KEY[normalized]) {
    return THEME_ALIAS_TO_KEY[normalized];
  }

  const fallback = getDefaultChildThemeKey();
  return fallback;
}

export function getThemePreset(themeKey: ChildThemeKey): ChildThemePreset {
  return CHILD_THEME_PRESETS.find((preset) => preset.id === themeKey) ?? CHILD_THEME_PRESETS[0];
}

export function getDefaultChildPreferences(child: Pick<Child, "ageGroup" | "yearLevel" | "country">): ChildPreferences {
  const theme = getDefaultChildThemeKey();
  const preset = getThemePreset(theme);
  return {
    theme,
    avatar: "🧒",
    buttonStyle: preset.defaultButtonStyle,
    cardStyle: preset.defaultCardStyle,
    rewardStyle: preset.defaultRewardStyle,
  };
}

export function getLegacyTileThemeIdFromChildTheme(themeKey: ChildThemeKey): string {
  switch (themeKey) {
    case "unicorn":
    case "fantasy":
      return "themes-rainbow";
    case "space":
      return "games-space";
    case "soccer":
      return "sports-stadium";
    case "jungle":
      return "places-city";
    case "ocean":
      return "themes-ocean";
    default:
      return "themes-rainbow";
  }
}

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

function buildJourneyTokens(themeKey: ChildThemeKey): JourneyVisualTokens {
  switch (themeKey) {
    case "unicorn":
      return {
        pageGradient: "bg-gradient-to-br from-pink-50 via-rose-50 to-fuchsia-100",
        pageGlow: "from-pink-200/60 via-rose-100/30 to-transparent",
        surfaceCard: "bg-white/95",
        surfaceCardMuted: "bg-pink-50/80",
        surfaceBorder: "border-pink-200/80",
        heroPanel: "bg-gradient-to-br from-pink-500 via-rose-500 to-fuchsia-500 text-white",
        heroPanelSoft: "bg-gradient-to-br from-pink-100 via-rose-50 to-fuchsia-50",
        chip: "bg-pink-100 text-pink-800 border-pink-200",
        chipSelected: "bg-pink-600 text-white border-pink-600 shadow-lg shadow-pink-200",
        primaryButton: "bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white shadow-pink-200",
        secondaryButton: "bg-white text-pink-700 border-pink-200 hover:bg-pink-50",
        answerOption: "border-pink-100 hover:border-pink-300 hover:bg-pink-50",
        answerOptionSelected: "border-pink-500 bg-pink-50 ring-2 ring-pink-200",
        answerOptionCorrect: "border-emerald-400 bg-emerald-50",
        progressTrack: "bg-pink-100",
        progressFill: "bg-gradient-to-r from-pink-500 to-fuchsia-500",
        badge: "bg-pink-100 text-pink-800",
        mascotGlow: "shadow-pink-100",
      };
    case "space":
      return {
        pageGradient: "bg-gradient-to-br from-slate-950 via-indigo-950 to-fuchsia-950",
        pageGlow: "from-indigo-600/35 via-fuchsia-500/20 to-transparent",
        surfaceCard: "bg-slate-900/90",
        surfaceCardMuted: "bg-slate-800/85",
        surfaceBorder: "border-slate-700/80",
        heroPanel: "bg-gradient-to-br from-slate-900 via-indigo-900 to-fuchsia-900 text-white",
        heroPanelSoft: "bg-gradient-to-br from-slate-800 via-indigo-900 to-slate-900",
        chip: "bg-indigo-900/70 text-indigo-100 border-indigo-700",
        chipSelected: "bg-cyan-400 text-slate-950 border-cyan-300 shadow-lg shadow-cyan-500/20",
        primaryButton: "bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white shadow-indigo-900/30",
        secondaryButton: "bg-slate-900 text-indigo-100 border-slate-700 hover:bg-slate-800",
        answerOption: "border-slate-700 hover:border-indigo-400 hover:bg-slate-800",
        answerOptionSelected: "border-cyan-400 bg-slate-800 ring-2 ring-cyan-400/40",
        answerOptionCorrect: "border-emerald-400 bg-emerald-950/40 text-emerald-100",
        progressTrack: "bg-slate-800",
        progressFill: "bg-gradient-to-r from-cyan-400 to-fuchsia-500",
        badge: "bg-slate-800 text-indigo-100",
        mascotGlow: "shadow-cyan-500/20",
      };
    case "soccer":
      return {
        pageGradient: "bg-gradient-to-br from-lime-50 via-green-50 to-emerald-100",
        pageGlow: "from-lime-200/60 via-green-100/30 to-transparent",
        surfaceCard: "bg-white/96",
        surfaceCardMuted: "bg-green-50/80",
        surfaceBorder: "border-green-200/80",
        heroPanel: "bg-gradient-to-br from-green-600 via-lime-500 to-emerald-500 text-white",
        heroPanelSoft: "bg-gradient-to-br from-green-100 via-lime-50 to-emerald-50",
        chip: "bg-green-100 text-green-800 border-green-200",
        chipSelected: "bg-green-600 text-white border-green-600 shadow-lg shadow-green-200",
        primaryButton: "bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-green-200",
        secondaryButton: "bg-white text-green-700 border-green-200 hover:bg-green-50",
        answerOption: "border-green-100 hover:border-green-300 hover:bg-green-50",
        answerOptionSelected: "border-green-500 bg-green-50 ring-2 ring-green-200",
        answerOptionCorrect: "border-emerald-400 bg-emerald-50",
        progressTrack: "bg-green-100",
        progressFill: "bg-gradient-to-r from-green-500 to-emerald-500",
        badge: "bg-green-100 text-green-800",
        mascotGlow: "shadow-green-100",
      };
    case "jungle":
      return {
        pageGradient: "bg-gradient-to-br from-emerald-50 via-lime-50 to-yellow-100",
        pageGlow: "from-emerald-200/60 via-lime-100/30 to-transparent",
        surfaceCard: "bg-white/96",
        surfaceCardMuted: "bg-emerald-50/80",
        surfaceBorder: "border-emerald-200/80",
        heroPanel: "bg-gradient-to-br from-emerald-600 via-lime-500 to-yellow-500 text-white",
        heroPanelSoft: "bg-gradient-to-br from-emerald-100 via-lime-50 to-yellow-50",
        chip: "bg-emerald-100 text-emerald-800 border-emerald-200",
        chipSelected: "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200",
        primaryButton: "bg-gradient-to-r from-emerald-600 to-lime-500 text-white shadow-emerald-200",
        secondaryButton: "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50",
        answerOption: "border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50",
        answerOptionSelected: "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200",
        answerOptionCorrect: "border-emerald-400 bg-emerald-50",
        progressTrack: "bg-emerald-100",
        progressFill: "bg-gradient-to-r from-emerald-500 to-lime-500",
        badge: "bg-emerald-100 text-emerald-800",
        mascotGlow: "shadow-emerald-100",
      };
    case "ocean":
      return {
        pageGradient: "bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-100",
        pageGlow: "from-cyan-200/60 via-sky-100/30 to-transparent",
        surfaceCard: "bg-white/96",
        surfaceCardMuted: "bg-cyan-50/80",
        surfaceBorder: "border-cyan-200/80",
        heroPanel: "bg-gradient-to-br from-cyan-600 via-sky-500 to-blue-600 text-white",
        heroPanelSoft: "bg-gradient-to-br from-cyan-100 via-sky-50 to-blue-50",
        chip: "bg-cyan-100 text-cyan-800 border-cyan-200",
        chipSelected: "bg-cyan-600 text-white border-cyan-600 shadow-lg shadow-cyan-200",
        primaryButton: "bg-gradient-to-r from-cyan-600 to-blue-500 text-white shadow-cyan-200",
        secondaryButton: "bg-white text-cyan-700 border-cyan-200 hover:bg-cyan-50",
        answerOption: "border-cyan-100 hover:border-cyan-300 hover:bg-cyan-50",
        answerOptionSelected: "border-cyan-500 bg-cyan-50 ring-2 ring-cyan-200",
        answerOptionCorrect: "border-emerald-400 bg-emerald-50",
        progressTrack: "bg-cyan-100",
        progressFill: "bg-gradient-to-r from-cyan-500 to-blue-500",
        badge: "bg-cyan-100 text-cyan-800",
        mascotGlow: "shadow-cyan-100",
      };
    case "fantasy":
    default:
      return {
        pageGradient: "bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-100",
        pageGlow: "from-pink-200/60 via-purple-100/30 to-transparent",
        surfaceCard: "bg-white/95",
        surfaceCardMuted: "bg-purple-50/80",
        surfaceBorder: "border-purple-200/80",
        heroPanel: "bg-gradient-to-br from-purple-600 via-pink-500 to-amber-400 text-white",
        heroPanelSoft: "bg-gradient-to-br from-purple-100 via-pink-50 to-amber-50",
        chip: "bg-purple-100 text-purple-800 border-purple-200",
        chipSelected: "bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-200",
        primaryButton: "bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-purple-200",
        secondaryButton: "bg-white text-purple-700 border-purple-200 hover:bg-purple-50",
        answerOption: "border-purple-100 hover:border-purple-300 hover:bg-purple-50",
        answerOptionSelected: "border-purple-500 bg-purple-50 ring-2 ring-purple-200",
        answerOptionCorrect: "border-emerald-400 bg-emerald-50",
        progressTrack: "bg-purple-100",
        progressFill: "bg-gradient-to-r from-purple-600 to-pink-500",
        badge: "bg-purple-100 text-purple-800",
        mascotGlow: "shadow-purple-100",
      };
  }
}

export function getThemeJourneyTokens(
  themeId: string | undefined,
  child: Pick<Child, "ageGroup" | "yearLevel" | "country">
): ThemeJourneyTokens {
  const themeKey = resolveChildThemeKey(themeId, child);
  const preset = getThemePreset(themeKey);
  const base = buildJourneyTokens(themeKey);
  return {
    themeKey,
    preset,
    themeLabel: preset.label,
    themeEmoji: preset.emoji,
    ...base,
    buttonStyle: preset.defaultButtonStyle,
    cardStyle: preset.defaultCardStyle,
    rewardStyle: preset.defaultRewardStyle,
    backgroundImageHint: preset.backgroundImageHint,
  };
}
