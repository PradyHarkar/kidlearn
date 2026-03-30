import type { AgeGroup, ChildThemeKey, Question, QuestionVisualMode, Subject } from "@/types";

export interface QuestionVisualProfile {
  mode: QuestionVisualMode;
  title: string;
  subtitle: string;
  accentEmoji: string;
  secondaryEmoji: string;
  sceneItems: string[];
  counters: Array<{ label: string; value: string }>;
  primaryLabel: string;
}

export interface QuestionVisualContext {
  themeKey?: ChildThemeKey;
  favoriteTags?: string[];
}

const COUNTING_OBJECTS = ["🍎", "⭐", "⚽", "🐟", "🧸", "🪁", "🎈", "🍪"];
const WORD_CARDS = ["🔤", "📘", "💬", "🪄", "🧠"];
const SCIENCE_ITEMS = ["🔬", "🧪", "🌱", "🌦️", "🪨", "🌊"];
const STORY_ITEMS = ["🏰", "🌈", "🚀", "🐾", "🌳", "🪐"];
const SHAPE_ITEMS: Record<string, string[]> = {
  triangle: ["🔺", "●", "●", "●"],
  square: ["⬛", "●", "●", "●", "●"],
  rectangle: ["▭", "●", "●", "●", "●"],
  circle: ["◯", "●", "●", "●"],
  star: ["⭐", "●", "●", "●", "●"],
};

type ThemeWorld = {
  title: string;
  subtitle: string;
  accentEmoji: string;
  secondaryEmoji: string;
  countingEmoji: string;
  primaryLabel: string;
  sceneItems: string[];
  counterLabels: [string, string];
};

const THEME_WORLDS: Record<ChildThemeKey, ThemeWorld> = {
  fantasy: {
    title: "Castle count",
    subtitle: "A magical castle scene helps you count the treasures.",
    accentEmoji: "🏰",
    secondaryEmoji: "✨",
    countingEmoji: "🧚",
    primaryLabel: "Count the magical pieces",
    sceneItems: ["🏰", "✨", "🐉", "🌈"],
    counterLabels: ["Castle side", "Magic side"],
  },
  unicorn: {
    title: "Rainbow count",
    subtitle: "Sparkles and unicorn fun make the counting scene friendly.",
    accentEmoji: "🦄",
    secondaryEmoji: "🌈",
    countingEmoji: "🦄",
    primaryLabel: "Count the unicorns",
    sceneItems: ["🦄", "🌈", "✨", "💖"],
    counterLabels: ["Sparkles", "Rainbows"],
  },
  space: {
    title: "Space count",
    subtitle: "A rocket and planets are floating across the screen.",
    accentEmoji: "🚀",
    secondaryEmoji: "🪐",
    countingEmoji: "🪐",
    primaryLabel: "Count the planets",
    sceneItems: ["🚀", "🪐", "🌟", "🛰️"],
    counterLabels: ["Rocket", "Orbit"],
  },
  soccer: {
    title: "Football count",
    subtitle: "Messi kicks the first footballs and Ronaldo adds the next set.",
    accentEmoji: "⚽",
    secondaryEmoji: "🥅",
    countingEmoji: "⚽",
    primaryLabel: "Count the footballs",
    sceneItems: ["⚽", "🥅", "🏟️", "👟"],
    counterLabels: ["Messi", "Ronaldo"],
  },
  jungle: {
    title: "Jungle count",
    subtitle: "Animals and trees make the jungle scene feel alive.",
    accentEmoji: "🐒",
    secondaryEmoji: "🌴",
    countingEmoji: "🐒",
    primaryLabel: "Count the jungle friends",
    sceneItems: ["🐒", "🦁", "🌴", "🍃"],
    counterLabels: ["Animals", "Trees"],
  },
  ocean: {
    title: "Ocean count",
    subtitle: "Fish and shells are swimming together underwater.",
    accentEmoji: "🐠",
    secondaryEmoji: "🌊",
    countingEmoji: "🐟",
    primaryLabel: "Count the sea friends",
    sceneItems: ["🐠", "🐙", "🫧", "🌊"],
    counterLabels: ["Fish", "Waves"],
  },
};

function normalizeTag(value: string): string {
  return value.trim().toLowerCase();
}

function resolveThemeWorld(context: QuestionVisualContext = {}): ThemeWorld {
  const tags = new Set((context.favoriteTags ?? []).map(normalizeTag));

  if (tags.has("sports") || tags.has("soccer")) return THEME_WORLDS.soccer;
  if (tags.has("space")) return THEME_WORLDS.space;
  if (tags.has("ocean")) return THEME_WORLDS.ocean;
  if (tags.has("animals") || tags.has("jungle")) return THEME_WORLDS.jungle;
  if (tags.has("rainbow") || tags.has("themes") || tags.has("fantasy")) return THEME_WORLDS.fantasy;
  if (tags.has("games") || tags.has("arcade")) return THEME_WORLDS.unicorn;

  return THEME_WORLDS[context.themeKey ?? "fantasy"];
}

function isEarlyYears(ageGroup?: AgeGroup): boolean {
  return !!ageGroup && ["foundation", "year1", "year2"].includes(ageGroup);
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function inferMode(question: Question): QuestionVisualMode {
  const templateId = normalize(question.generationMetadata?.templateId ?? "");
  const text = normalize(question.questionText);
  const topics = (question.topics ?? []).map(normalize);

  if (templateId.includes("visual-shape") || topics.some((topic) => /(shape|geometry|triangle|square|circle|rectangle)/.test(topic)) || /(triangle|square|circle|rectangle|\bstar\b)/.test(text)) {
    return "shape-dots";
  }

  if (
    templateId.includes("counting") ||
    question.subject === "maths" ||
    /(how many|altogether|left|count|plus|\+|minus|take away)/.test(text)
  ) {
    return isEarlyYears(question.ageGroup) ? "counting-scene" : "concept-cards";
  }

  if (
    question.subject === "english" ||
    templateId.includes("phonics") ||
    templateId.includes("sight-word") ||
    templateId.includes("rhyme") ||
    templateId.includes("sentence-order")
  ) {
    return isEarlyYears(question.ageGroup) ? "word-cards" : "story-scene";
  }

  if (question.subject === "science" || /(weather|habitat|materials|electric|circuit|living|chemical|force|mass|animal)/.test(text)) {
    return "story-scene";
  }

  return "concept-cards";
}

function extractNumbers(text: string): number[] {
  return (text.match(/\b\d+\b/g) ?? []).map((value) => Number(value)).filter((value) => Number.isFinite(value));
}

function primaryTopic(question: Question): string {
  const topics = question.topics ?? [];
  return topics[0] ?? question.subject;
}

export function buildQuestionVisualProfile(question: Question, context: QuestionVisualContext = {}): QuestionVisualProfile {
  const mode = question.generationMetadata?.visualMode ?? inferMode(question);
  const text = question.questionText;
  const topic = primaryTopic(question);
  const subject = question.subject;
  const numbers = extractNumbers(text);
  const world = resolveThemeWorld(context);

  if (mode === "shape-dots") {
    const shapeWord = /(triangle|square|rectangle|circle|star)/.exec(text)?.[1] ?? "shape";
    return {
      mode,
      title: world.title,
      subtitle: `${world.subtitle} Touch the dots to build the ${shapeWord}.`,
      accentEmoji: SHAPE_ITEMS[shapeWord]?.[0] ?? world.accentEmoji,
      secondaryEmoji: world.secondaryEmoji,
      sceneItems: SHAPE_ITEMS[shapeWord] ?? ["●", "●", "●", "●"],
      counters: [
        { label: "Dots", value: String(SHAPE_ITEMS[shapeWord]?.length ?? 4) },
        { label: "Shape", value: shapeWord },
      ],
      primaryLabel: world.primaryLabel,
    };
  }

  if (mode === "counting-scene") {
    const first = numbers[0] ?? 2;
    const second = numbers[1] ?? 3;
    const total = numbers[2] ?? first + second;
    return {
      mode,
      title: world.title,
      subtitle: world.subtitle,
      accentEmoji: world.countingEmoji,
      secondaryEmoji: world.secondaryEmoji,
      sceneItems: [
        ...Array.from({ length: Math.max(1, first) }, () => world.countingEmoji),
        "➕",
        ...Array.from({ length: Math.max(1, second) }, () => world.countingEmoji),
      ],
      counters: [
        { label: "Group 1", value: String(first) },
        { label: "Group 2", value: String(second) },
        { label: "Total", value: String(total) },
      ],
      primaryLabel: world.primaryLabel,
    };
  }

  if (mode === "word-cards") {
    return {
      mode,
      title: subject === "english" ? world.title : "Picture clues",
      subtitle: subject === "english" ? "Look, listen, and choose the best match." : world.subtitle,
      accentEmoji: world.accentEmoji,
      secondaryEmoji: world.secondaryEmoji,
      sceneItems: [world.accentEmoji, WORD_CARDS[1], WORD_CARDS[2], WORD_CARDS[3]],
      counters: [
        { label: "Topic", value: topic.replace(/-/g, " ") },
        { label: "Mode", value: "Tap cards" },
      ],
      primaryLabel: "Choose the word",
    };
  }

  if (mode === "story-scene") {
    return {
      mode,
      title: subject === "science" ? world.title : "Story scene",
      subtitle: world.subtitle,
      accentEmoji: subject === "science" ? world.accentEmoji : "📖",
      secondaryEmoji: world.secondaryEmoji,
      sceneItems: subject === "science"
        ? [world.accentEmoji, SCIENCE_ITEMS[1], SCIENCE_ITEMS[2], SCIENCE_ITEMS[3]]
        : [world.accentEmoji, STORY_ITEMS[1], STORY_ITEMS[2], STORY_ITEMS[3]],
      counters: [
        { label: "Subject", value: subject },
        { label: "Level", value: question.yearLevel },
      ],
      primaryLabel: "Watch the scene",
    };
  }

  return {
    mode: "concept-cards",
    title: world.title,
    subtitle: world.subtitle,
    accentEmoji: subject === "maths" ? world.accentEmoji : subject === "science" ? "🧠" : "💡",
    secondaryEmoji: world.secondaryEmoji,
    sceneItems: subject === "maths"
      ? [world.countingEmoji, ...COUNTING_OBJECTS.slice(1, 4)]
      : subject === "science"
      ? SCIENCE_ITEMS.slice(0, 4)
      : WORD_CARDS.slice(0, 4),
    counters: [
      { label: "Subject", value: subject },
      { label: "Topic", value: topic.replace(/-/g, " ") },
    ],
    primaryLabel: world.primaryLabel,
  };
}
