import { COUNTRY_CONFIGS, getTopicsForGrade } from "../curriculum";
import type {
  AgeGroup,
  AnswerOption,
  Country,
  DifficultyLevel,
  Question,
  QuestionGenerationMetadata,
  QuestionVisualMode,
  Subject,
  YearLevel,
} from "../../types";

const AGE_GROUPS: AgeGroup[] = ["foundation", "year1", "year2", "year3", "year4", "year5", "year6", "year7", "year8"];
const SUBJECTS: Subject[] = ["maths", "english", "science"];
const ALL_COUNTRIES: Country[] = ["AU", "US", "IN", "UK"];
const EARLY_YEARS: AgeGroup[] = ["foundation", "year1", "year2"];
const PRIMARY_YEARS: AgeGroup[] = ["year3", "year4", "year5", "year6"];

const SHAPES = ["triangle", "square", "circle", "rectangle", "star"] as const;
const COLORS = ["red", "blue", "green", "orange", "yellow", "purple"] as const;
const SHAPE_EMOJI: Record<(typeof SHAPES)[number], string> = {
  triangle: "🔺",
  square: "🟥",
  circle: "🔵",
  rectangle: "▬",
  star: "⭐",
};

const COUNTABLE_OBJECTS = [
  { name: "apple", emoji: "🍎" },
  { name: "ball", emoji: "⚽" },
  { name: "book", emoji: "📘" },
  { name: "shell", emoji: "🐚" },
  { name: "leaf", emoji: "🍃" },
  { name: "sticker", emoji: "🏷️" },
] as const;

const NAMES = ["Mia", "Leo", "Noah", "Ava", "Liam", "Zara", "Aanya", "Ben", "Aria", "Riya", "Owen", "Ivy"];
const PLACES = ["library", "garden", "museum", "school fair", "science room", "playground", "beach", "classroom", "sports field", "art room"];
const CLASSROOM_CONTEXTS = [
  "during a guided lesson",
  "during partner practice",
  "in a small-group activity",
  "during a review round",
  "at the learning station",
  "during independent work",
  "during a challenge card round",
  "during a revision check",
  "in a quick warm-up",
  "during a hands-on activity",
  "during a learning game",
  "in a thinking task",
];
const SOUND_SETS = [
  { prompt: "sh", correct: "ship", wrong: ["chip", "ring", "lamp"] },
  { prompt: "ch", correct: "chair", wrong: ["whale", "stone", "plane"] },
  { prompt: "th", correct: "thumb", wrong: ["drum", "flag", "crown"] },
  { prompt: "ai", correct: "rain", wrong: ["rock", "stem", "glove"] },
  { prompt: "ee", correct: "tree", wrong: ["clock", "sand", "brush"] },
  { prompt: "oa", correct: "boat", wrong: ["grass", "drip", "tent"] },
  { prompt: "igh", correct: "light", wrong: ["crate", "stamp", "drum"] },
  { prompt: "oo", correct: "moon", wrong: ["crab", "nest", "plant"] },
] as const;
const RHYME_SETS = [
  { word: "cat", correct: "hat", wrong: ["sun", "log", "pen"] },
  { word: "dog", correct: "frog", wrong: ["lamp", "book", "tree"] },
  { word: "cake", correct: "lake", wrong: ["mouse", "drum", "leaf"] },
  { word: "sun", correct: "fun", wrong: ["road", "chair", "stone"] },
  { word: "tree", correct: "bee", wrong: ["park", "coat", "hill"] },
  { word: "star", correct: "car", wrong: ["fish", "desk", "rain"] },
  { word: "moon", correct: "spoon", wrong: ["grass", "block", "ring"] },
  { word: "bell", correct: "shell", wrong: ["cloud", "drip", "train"] },
] as const;
const WEATHER_SETS = [
  { clue: "dark clouds and heavy rain", correct: "rainy", wrong: ["sunny", "snowy", "foggy"] },
  { clue: "bright sun and no clouds", correct: "sunny", wrong: ["stormy", "foggy", "icy"] },
  { clue: "strong wind bending trees", correct: "windy", wrong: ["dry", "snowy", "humid"] },
  { clue: "thick white mist near the ground", correct: "foggy", wrong: ["sunny", "stormy", "dusty"] },
] as const;
const SUBJECT_WORDS = ["puppy", "teacher", "student", "artist", "robot", "team", "friend", "class"];
const ACTION_WORDS = ["plays", "runs", "writes", "reads", "builds", "jumps", "packs", "draws"];
const SIGHT_WORDS = [
  "the", "and", "is", "to", "we", "go", "see", "my", "you", "here", "come", "look",
  "like", "play", "said", "little", "big", "blue", "yellow", "green", "help", "where", "what", "this",
  "that", "with", "for", "me", "he", "she", "they", "was", "are", "have", "want", "good",
];

type GenerateQuestionBankOptions = {
  ageGroup: AgeGroup;
  subject: Subject;
  count: number;
  country?: Country;
};

type ExamProfile = {
  benchmarkFamily: string;
  examStyle: string;
  focus: string[];
};

type DraftQuestion = Omit<Question, "pk" | "questionId" | "subject" | "yearLevel" | "ageGroup" | "country" | "createdAt" | "cached">;

type GeneratorContext = {
  ageGroup: AgeGroup;
  country: Country;
  examProfile: ExamProfile;
  seed: number;
  acceptedCount: number;
  subject: Subject;
  topics: string[];
};

type TemplateGenerator = (context: GeneratorContext) => DraftQuestion;

function localSeed(context: GeneratorContext): number {
  return context.seed + 1;
}

function mixSeed(seed: number, factor: number, offset = 0): number {
  const mixed = ((seed + offset) * 2654435761 + factor * 1013904223) >>> 0;
  return mixed;
}

function classroomContext(seed: number, offset = 0): string {
  return pick(CLASSROOM_CONTEXTS, seed, offset);
}

function pick<T>(values: readonly T[], seed: number, offset = 0): T {
  return values[(seed + offset) % values.length];
}

function distinctPicks<T>(values: readonly T[], seed: number, count: number, avoid: readonly T[] = []): T[] {
  const picked: T[] = [];
  let cursor = 0;

  while (picked.length < count && cursor < values.length * 3) {
    const candidate = values[(seed + cursor) % values.length];
    if (!picked.includes(candidate) && !avoid.includes(candidate)) {
      picked.push(candidate);
    }
    cursor += 1;
  }

  return picked;
}

function encodeSvg(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function shapeSvg(shape: typeof SHAPES[number], color: typeof COLORS[number]): string {
  const fill = {
    red: "#ff6b6b",
    blue: "#4dabf7",
    green: "#51cf66",
    orange: "#ffa94d",
    yellow: "#ffd43b",
    purple: "#b197fc",
  }[color];

  const content = {
    triangle: `<polygon points="60,12 108,108 12,108" fill="${fill}" />`,
    square: `<rect x="18" y="18" width="84" height="84" rx="10" fill="${fill}" />`,
    circle: `<circle cx="60" cy="60" r="44" fill="${fill}" />`,
    rectangle: `<rect x="12" y="30" width="96" height="60" rx="10" fill="${fill}" />`,
    star: `<polygon points="60,10 74,42 108,46 82,68 90,102 60,84 30,102 38,68 12,46 46,42" fill="${fill}" />`,
  }[shape];

  return encodeSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="24" fill="#fff8e7" />${content}</svg>`);
}

function isEarlyYears(ageGroup: AgeGroup): boolean {
  return EARLY_YEARS.includes(ageGroup);
}

function targetAgeBand(ageGroup: AgeGroup): "early-years" | "primary" | "middle-school" {
  if (EARLY_YEARS.includes(ageGroup)) return "early-years";
  if (PRIMARY_YEARS.includes(ageGroup)) return "primary";
  return "middle-school";
}

function toLegacyYearLevel(ageGroup: AgeGroup): YearLevel {
  return ageGroup === "foundation" ? "prep" : ageGroup;
}

function buildPk(subject: Subject, ageGroup: AgeGroup, country?: Country): string {
  return country ? `${subject}#${ageGroup}#${country}` : `${subject}#${ageGroup}`;
}

function getRepresentativeGrade(country: Country, ageGroup: AgeGroup): string | undefined {
  return COUNTRY_CONFIGS[country].grades.find((grade) => grade.ageGroup === ageGroup)?.gradeId;
}

function difficultyFor(ageGroup: AgeGroup, acceptedCount: number): DifficultyLevel {
  const base = Math.max(1, AGE_GROUPS.indexOf(ageGroup) + 1);
  const ramp = Math.floor((acceptedCount / 250) % 4);
  return Math.min(10, base + ramp) as DifficultyLevel;
}

function hasAnyKeyword(value: string, keywords: string[]): boolean {
  const normalized = value.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

function curriculumTopic(context: GeneratorContext, keywords: string[], offset = 0): string {
  const matching = context.topics.filter((topic) => hasAnyKeyword(topic, keywords));
  const source = matching.length > 0 ? matching : context.topics;
  return pick(source, mixSeed(context.seed, 23), offset);
}

function uniqueTags(...tags: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const tag of tags) {
    if (!tag) continue;
    const normalized = tag.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function option(id: string, text: string, isCorrect: boolean, extras?: Partial<AnswerOption>): AnswerOption {
  return { id, text, isCorrect, ...extras };
}

/** Fisher-Yates shuffle using a seeded LCG so order is deterministic per question but varies across seeds */
function shuffleOptions(options: AnswerOption[], seed: number): AnswerOption[] {
  const arr = [...options];
  let s = (seed * 1664525 + 1013904223) >>> 0;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // Reassign ids (a/b/c/d) to reflect the new display order
  const letters = ["a", "b", "c", "d", "e"];
  return arr.map((opt, idx) => ({ ...opt, id: letters[idx] ?? opt.id }));
}

function metadata(context: GeneratorContext, templateId: string, variant: string, visualStyle?: "playful" | "illustrated" | "standard"): QuestionGenerationMetadata {
  const inferredVisualMode = inferQuestionVisualMode(templateId, context.subject, context.ageGroup);
  return {
    generator: "template",
    templateId,
    variantKey: variant,
    visualStyle: visualStyle ?? (isEarlyYears(context.ageGroup) ? "illustrated" : "standard"),
    visualMode: inferredVisualMode,
    targetAgeBand: targetAgeBand(context.ageGroup),
    benchmarkFamily: context.examProfile.benchmarkFamily,
    examStyle: context.examProfile.examStyle,
    qualityVersion: "2026-03-25-q2",
  };
}

function inferQuestionVisualMode(templateId: string, subject: Subject, ageGroup: AgeGroup): QuestionVisualMode {
  const id = templateId.toLowerCase();

  if (id.includes("match-pairs")) return "match-pairs";
  if (id.includes("visual-shape")) return "shape-dots";
  if (id.includes("counting")) return "counting-scene";
  if (id.includes("phonics") || id.includes("sight-word") || id.includes("rhyme") || id.includes("sentence-order")) return "word-cards";
  if (id.includes("reading") || id.includes("summary") || id.includes("style")) return "story-scene";
  if (id.includes("habitat") || id.includes("weather") || id.includes("materials") || id.includes("reasoning") || id.includes("physics") || id.includes("biology") || id.includes("chemistry")) return "story-scene";
  if (subject === "maths" && isEarlyYears(ageGroup)) return "counting-scene";
  return "concept-cards";
}

function capitalizeLeadingLetter(text: string): string {
  const leadingWhitespace = text.match(/^\s*/)?.[0] ?? "";
  const body = text.slice(leadingWhitespace.length);
  const index = body.search(/[A-Za-z]/);
  if (index < 0) {
    return text;
  }

  return `${leadingWhitespace}${body.slice(0, index)}${body[index].toUpperCase()}${body.slice(index + 1)}`;
}

function createQuestion(context: GeneratorContext, draft: DraftQuestion): Question {
  const acceptedIndex = context.acceptedCount + 1;
  const questionText = capitalizeLeadingLetter(draft.questionText);
  return {
    pk: buildPk(context.subject, context.ageGroup, context.country),
    questionId: `generated-${context.country}-${context.subject}-${context.ageGroup}-${String(acceptedIndex).padStart(5, "0")}`,
    questionText,
    answerOptions: shuffleOptions(draft.answerOptions, context.seed),
    difficulty: draft.difficulty,
    topics: draft.topics,
    explanation: draft.explanation,
    subject: context.subject,
    yearLevel: toLegacyYearLevel(context.ageGroup),
    ageGroup: context.ageGroup,
    country: context.country,
    grade: getRepresentativeGrade(context.country, context.ageGroup),
    hint: draft.hint,
    ttsText: draft.ttsText ?? questionText,
    interactionType: draft.interactionType,
    interactionData: draft.interactionData,
    generationMetadata: draft.generationMetadata,
    cached: false,
    createdAt: new Date().toISOString(),
  };
}

function getExamProfile(country: Country, ageGroup: AgeGroup, subject: Subject): ExamProfile {
  if (country === "AU") {
    return {
      benchmarkFamily: ageGroup === "year3" || ageGroup === "year5" || ageGroup === "year7" ? "NAPLAN" : "Australian classroom assessment",
      examStyle: subject === "english" ? "reading and conventions of language" : subject === "maths" ? "numeracy reasoning" : "curriculum science checks",
      focus: ["Australian Curriculum alignment", "clear reasoning", "no trick wording"],
    };
  }

  if (country === "UK") {
    if (ageGroup === "year1" && subject === "english") {
      return {
        benchmarkFamily: "Phonics screening check",
        examStyle: "short decoding prompts",
        focus: ["phonics", "word reading", "simple response"],
      };
    }
    if (ageGroup === "year4" && subject === "maths") {
      return {
        benchmarkFamily: "Multiplication tables check",
        examStyle: "rapid recall",
        focus: ["times tables", "accuracy", "speed"],
      };
    }
    return {
      benchmarkFamily: "Key stage assessments",
      examStyle: subject === "english" ? "SPaG and comprehension" : subject === "maths" ? "SATs-style reasoning" : "national curriculum science checks",
      focus: ["precise wording", "curriculum coverage", "age-standard challenge"],
    };
  }

  if (country === "IN") {
    return {
      benchmarkFamily: isEarlyYears(ageGroup) ? "NIPUN Bharat and foundational stage" : "NCERT school exam style",
      examStyle: subject === "science" ? "EVS and science application" : subject === "english" ? "foundational literacy and grammar" : "word problems and concept fluency",
      focus: ["NCERT alignment", "classroom relevance", "gradual difficulty"],
    };
  }

  return {
    benchmarkFamily: "Common Core benchmark style",
    examStyle: subject === "english" ? "comprehension, editing, vocabulary" : subject === "maths" ? "problem solving and number reasoning" : "evidence-based science understanding",
    focus: ["standards alignment", "plausible distractors", "multi-step thinking"],
  };
}

function visualShapeQuestion(context: GeneratorContext): DraftQuestion {
  const seed = localSeed(context);
  const shape = pick(SHAPES, mixSeed(seed, 2));
  const color = pick(COLORS, mixSeed(seed, 3));
  const place = pick(PLACES, mixSeed(seed, 5));
  const name = pick(NAMES, mixSeed(seed, 7));
  const frame = classroomContext(seed, 5);
  const distractors = distinctPicks(SHAPES, mixSeed(seed, 11), 3, [shape]);

  return {
    questionText: `${name} is sorting cards in the ${place} ${frame}. Tap the ${color} ${shape}.`,
    answerOptions: [
      option("a", `${color} ${shape}`, true, {
        emoji: SHAPE_EMOJI[shape],
        imageUrl: shapeSvg(shape, color),
        imageAlt: `${color} ${shape}`,
        visualDescription: `${color} ${shape}`,
      }),
      ...distractors.map((value, index) =>
        option(String.fromCharCode(98 + index), `${pick(COLORS, seed, index + 1)} ${value}`, false, {
          emoji: SHAPE_EMOJI[value],
          imageUrl: shapeSvg(value, pick(COLORS, seed, index + 1)),
          imageAlt: `${value}`,
          visualDescription: `${value}`,
        })
      ),
    ],
    difficulty: difficultyFor(context.ageGroup, context.acceptedCount),
    topics: [pick(context.topics, seed), "shape recognition", context.examProfile.benchmarkFamily],
    explanation: `The correct choice is the ${color} ${shape} card.`,
    hint: "Match the color first, then check the shape.",
    interactionType: "tap-card",
    interactionData: {
      layout: "visual-grid",
      ariaLabel: `Select the ${color} ${shape}.`,
    },
    generationMetadata: metadata(context, "maths-visual-shape", `${shape}-${color}`, "illustrated"),
  };
}

function countingQuestion(context: GeneratorContext): DraftQuestion {
  const seed = localSeed(context);
  const item = pick(COUNTABLE_OBJECTS, mixSeed(seed, 2));
  const count = 3 + (mixSeed(seed, 5) % 8);
  const name = pick(NAMES, mixSeed(seed, 7));
  const place = pick(PLACES, mixSeed(seed, 11));
  const frame = classroomContext(seed, 6);
  const distractors = distinctPicks([count - 1, count + 1, count + 2, Math.max(1, count - 2)], seed, 3, [count]);

  return {
    questionText: `${name} lays out some ${count === 1 ? item.name : `${item.name}s`} at the ${place} ${frame}. How many ${count === 1 ? "is" : "are"} shown?`,
    answerOptions: [
      option("a", String(count), true, { emoji: item.emoji, visualDescription: `${count} ${item.name}s` }),
      ...distractors.map((value, index) => option(String.fromCharCode(98 + index), String(value), false)),
    ],
    difficulty: difficultyFor(context.ageGroup, context.acceptedCount),
    topics: [pick(context.topics, seed), "counting", context.examProfile.benchmarkFamily],
    explanation: `Count one by one. There are ${count} ${count === 1 ? item.name : `${item.name}s`}.`,
    hint: "Point to each picture once as you count.",
    interactionType: "tap-card",
    interactionData: {
      visualContext: Array.from({ length: count }, () => item.emoji).join(" "),
      ariaLabel: `Count the ${item.name}s and select the matching number.`,
    },
    generationMetadata: metadata(context, "maths-counting-visual", `${item.name}-${count}`, "playful"),
  };
}

function numeracyReasoningQuestion(context: GeneratorContext): DraftQuestion {
  const seed = localSeed(context);
  const name = pick(NAMES, mixSeed(seed, 2));
  const item = pick(COUNTABLE_OBJECTS, mixSeed(seed, 3));
  const operationType = mixSeed(seed, 5) % 4;
  const place = pick(PLACES, mixSeed(seed, 7));
  const frame = classroomContext(seed, 7);
  const base = 5 + (mixSeed(seed, 11) % 31) + AGE_GROUPS.indexOf(context.ageGroup);
  const second = 2 + (mixSeed(seed, 13) % 18);
  const third = 2 + (mixSeed(seed, 17) % 8);

  let questionText = "";
  let correctAnswer = 0;
  let explanation = "";
  let hint = "";
  let topic = pick(context.topics, seed);

  if (operationType === 0) {
    correctAnswer = base + second;
    questionText = `${name} collected ${base} ${item.name}s at the ${place} ${frame} and found ${second} more. How many ${item.name}s does ${name} have now?`;
    explanation = `${base} + ${second} = ${correctAnswer}.`;
    hint = "Add the two groups together.";
    topic = "addition and subtraction";
  } else if (operationType === 1) {
    const start = base + second;
    correctAnswer = start - second;
    questionText = `${name} had ${start} ${item.name}s at the ${place} ${frame} and gave away ${second}. How many are left?`;
    explanation = `${start} - ${second} = ${correctAnswer}.`;
    hint = "Take away the amount that was given away.";
    topic = "subtraction";
  } else if (operationType === 2) {
    correctAnswer = second * third;
    questionText = `${name} packed ${third} boxes with ${second} ${item.name}s in each box for the ${place} ${frame}. How many ${item.name}s are there altogether?`;
    explanation = `${third} groups of ${second} makes ${correctAnswer}.`;
    hint = "Think of equal groups or repeated addition.";
    topic = "multiplication";
  } else {
    const denominator = 2 + (context.seed % 4);
    const numerator = 1 + (context.seed % (denominator - 1));
    correctAnswer = numerator;
    questionText = `On a worksheet from the ${place} ${frame}, a shape is split into ${denominator} equal parts and ${numerator} parts are shaded. How many parts are shaded?`;
    explanation = `${numerator} of the ${denominator} equal parts are shaded.`;
    hint = "Count only the shaded parts.";
    topic = "fractions";
  }

  const wrongAnswers = distinctPicks([correctAnswer + 1, Math.max(1, correctAnswer - 1), correctAnswer + 2, Math.max(1, correctAnswer - 2)], seed, 3, [correctAnswer]);

  return {
    questionText,
    answerOptions: [
      option("a", String(correctAnswer), true),
      ...wrongAnswers.map((value, index) => option(String.fromCharCode(98 + index), String(value), false)),
    ],
    difficulty: difficultyFor(context.ageGroup, context.acceptedCount),
    topics: [topic, context.examProfile.benchmarkFamily, pick(context.topics, seed, 1)],
    explanation,
    hint,
    interactionType: "tap-card",
    interactionData: { ariaLabel: "Select the best numerical answer." },
    generationMetadata: metadata(context, "maths-reasoning", `${operationType}-${base}-${second}-${third}-${place}`),
  };
}

function timesTableQuestion(context: GeneratorContext): DraftQuestion {
  const seed = localSeed(context);
  const left = 2 + (mixSeed(seed, 2) % 11);
  const right = 2 + ((mixSeed(seed, 3) + AGE_GROUPS.indexOf(context.ageGroup)) % 12);
  const correctAnswer = left * right;
  const name = pick(NAMES, mixSeed(seed, 5));
  const item = pick(COUNTABLE_OBJECTS, mixSeed(seed, 7));
  const place = pick(PLACES, mixSeed(seed, 11));
  const frame = classroomContext(seed, 8);
  const wrongAnswers = distinctPicks([correctAnswer + left, correctAnswer - right, correctAnswer + 2, Math.max(1, correctAnswer - 2)], seed, 3, [correctAnswer]);
  const phrasing = seed % 3;

  return {
    questionText: phrasing === 0
      ? `${frame}, what is ${left} x ${right}?`
      : phrasing === 1
      ? `${name} lines up ${left} rows of ${right} ${item.name}s for the ${place} ${frame}. How many ${item.name}s are there altogether?`
      : `${name} arranges ${right} groups with ${left} ${item.name}s in each group at the ${place} ${frame}. What is the total?`,
    answerOptions: [
      option("a", String(correctAnswer), true),
      ...wrongAnswers.map((value, index) => option(String.fromCharCode(98 + index), String(value), false)),
    ],
    difficulty: difficultyFor(context.ageGroup, context.acceptedCount),
    topics: ["multiplication", context.examProfile.benchmarkFamily, pick(context.topics, seed)],
    explanation: `${left} groups of ${right} equals ${correctAnswer}.`,
    hint: "Use a known multiplication fact, then build from it.",
    interactionType: "tap-card",
    interactionData: { ariaLabel: "Select the correct product." },
    generationMetadata: metadata(context, "maths-times-table", `${left}-${right}`),
  };
}

function upperYearsMathsQuestion(context: GeneratorContext): DraftQuestion {
  const seed = localSeed(context);
  const topic = pick(context.topics, mixSeed(seed, 29));
  const name = pick(NAMES, mixSeed(seed, 31));
  const place = pick(PLACES, mixSeed(seed, 37));
  const frame = classroomContext(seed, 12);

  if (hasAnyKeyword(topic, ["algebra", "equation"])) {
    const x = 3 + (mixSeed(seed, 41) % 15);
    const coefficient = 2 + (mixSeed(seed, 43) % 5);
    const constant = 4 + (mixSeed(seed, 47) % 18);
    const total = coefficient * x + constant;
    const correct = x;
    const wrong = distinctPicks([correct + 1, Math.max(1, correct - 1), correct + 2, Math.max(1, correct - 2)], seed, 3, [correct]);

    return {
      questionText: `${name} solves an algebra puzzle in the ${place} ${frame}. If ${coefficient}x + ${constant} = ${total}, what is x?`,
      answerOptions: [
        option("a", String(correct), true),
        ...wrong.map((value, index) => option(String.fromCharCode(98 + index), String(value), false)),
      ],
      difficulty: difficultyFor(context.ageGroup, context.acceptedCount),
      topics: uniqueTags(topic, "algebra", "equations", "problem solving", context.examProfile.benchmarkFamily),
      explanation: `Subtract ${constant} from ${total} to get ${total - constant}, then divide by ${coefficient}. x = ${correct}.`,
      hint: "Undo the addition first, then divide.",
      interactionType: "tap-card",
      interactionData: { ariaLabel: "Solve the equation and choose the value of x." },
      generationMetadata: metadata(context, "maths-upper-algebra", `${topic}-${coefficient}-${constant}-${correct}`),
    };
  }

  if (hasAnyKeyword(topic, ["ratio", "proportion", "percent", "compound interest"])) {
    const partsA = 2 + (mixSeed(seed, 53) % 6);
    const partsB = 2 + (mixSeed(seed, 59) % 7);
    const scale = 3 + (mixSeed(seed, 61) % 8);
    const correct = (partsA + partsB) * scale;
    const wrong = distinctPicks([correct - scale, correct + scale, correct + partsA, Math.max(1, correct - partsB)], seed, 3, [correct]);

    return {
      questionText: `${name} mixes paint in the ${place} ${frame} using a ${partsA}:${partsB} ratio. If each ratio part stands for ${scale} mL, how many mL of paint are in the full mix?`,
      answerOptions: [
        option("a", String(correct), true),
        ...wrong.map((value, index) => option(String.fromCharCode(98 + index), String(value), false)),
      ],
      difficulty: difficultyFor(context.ageGroup, context.acceptedCount),
      topics: uniqueTags(topic, "ratio", "proportion", "multiplicative reasoning", context.examProfile.benchmarkFamily),
      explanation: `There are ${partsA + partsB} total parts, and each part is ${scale} mL, so ${correct} mL altogether.`,
      hint: "Add the ratio parts before multiplying by the size of one part.",
      interactionType: "tap-card",
      interactionData: { ariaLabel: "Choose the total amount in the ratio problem." },
      generationMetadata: metadata(context, "maths-upper-ratio", `${topic}-${partsA}-${partsB}-${scale}`),
    };
  }

  if (hasAnyKeyword(topic, ["angle", "area", "perimeter", "geometry", "transform", "pythagoras"])) {
    const length = 4 + (mixSeed(seed, 67) % 10);
    const width = 3 + (mixSeed(seed, 71) % 8);
    const correct = 2 * (length + width);
    const wrong = distinctPicks([length * width, correct + 2, Math.max(1, correct - 2), length + width], seed, 3, [correct]);

    return {
      questionText: `${name} sketches a rectangle in the ${place} ${frame}. The rectangle is ${length} cm long and ${width} cm wide. What is its perimeter?`,
      answerOptions: [
        option("a", String(correct), true),
        ...wrong.map((value, index) => option(String.fromCharCode(98 + index), String(value), false)),
      ],
      difficulty: difficultyFor(context.ageGroup, context.acceptedCount),
      topics: uniqueTags(topic, "geometry", "measurement", "perimeter", context.examProfile.benchmarkFamily),
      explanation: `Perimeter means the distance all the way around: 2 x (${length} + ${width}) = ${correct}.`,
      hint: "Add length and width, then double it.",
      interactionType: "tap-card",
      interactionData: { ariaLabel: "Choose the rectangle perimeter." },
      generationMetadata: metadata(context, "maths-upper-geometry", `${topic}-${length}-${width}`),
    };
  }

  if (hasAnyKeyword(topic, ["statistics", "probability", "data"])) {
    const blue = 2 + (mixSeed(seed, 73) % 6);
    const red = 2 + (mixSeed(seed, 79) % 6);
    const yellow = 1 + (mixSeed(seed, 83) % 4);
    const total = blue + red + yellow;
    const correct = `${blue}/${total}`;

    return {
      questionText: `${name} records results in the ${place} ${frame}. A bag has ${blue} blue counters, ${red} red counters, and ${yellow} yellow counters. What is the probability of picking a blue counter?`,
      answerOptions: [
        option("a", correct, true),
        option("b", `${red}/${total}`, false),
        option("c", `${yellow}/${total}`, false),
        option("d", `${blue}/${blue + red}`, false),
      ],
      difficulty: difficultyFor(context.ageGroup, context.acceptedCount),
      topics: uniqueTags(topic, "statistics", "probability", "fractions", context.examProfile.benchmarkFamily),
      explanation: `Probability is successful outcomes over total outcomes, so ${blue} out of ${total} gives ${correct}.`,
      hint: "Use part over whole.",
      interactionType: "tap-card",
      interactionData: { ariaLabel: "Choose the probability of selecting a blue counter." },
      generationMetadata: metadata(context, "maths-upper-probability", `${topic}-${blue}-${red}-${yellow}`),
    };
  }

  const topicLabel = curriculumTopic(context, ["negative", "integer", "decimal", "fraction"], 1);
  const start = -12 + (mixSeed(seed, 89) % 18);
  const change = 3 + (mixSeed(seed, 97) % 9);
  const correct = start + change;
  const wrong = distinctPicks([correct - 1, correct + 1, start - change, change - start], seed, 3, [correct]);

  return {
    questionText: `${name} tracks a number pattern in the ${place} ${frame}. Start at ${start} and move forward ${change}. Which number do you land on?`,
    answerOptions: [
      option("a", String(correct), true),
      ...wrong.map((value, index) => option(String.fromCharCode(98 + index), String(value), false)),
    ],
    difficulty: difficultyFor(context.ageGroup, context.acceptedCount),
    topics: uniqueTags(topicLabel, "integers", "negative numbers", "number sense", context.examProfile.benchmarkFamily),
    explanation: `Moving forward ${change} from ${start} lands on ${correct}.`,
    hint: "Count up from the starting number.",
    interactionType: "tap-card",
    interactionData: { ariaLabel: "Choose the resulting number in the integer pattern." },
    generationMetadata: metadata(context, "maths-upper-integers", `${topicLabel}-${start}-${change}`),
  };
}

function phonicsQuestion(context: GeneratorContext): DraftQuestion {
  const seed = localSeed(context);
  const set = pick(SOUND_SETS, mixSeed(seed, 2));
  const name = pick(NAMES, mixSeed(seed, 5));
  const place = pick(PLACES, mixSeed(seed, 7));
  const frame = classroomContext(seed, 9);

  return {
    questionText: `${name} is reading in the ${place} ${frame}. Which word starts with the sound "${set.prompt}"?`,
    answerOptions: [
      option("a", set.correct, true),
      ...set.wrong.map((value, index) => option(String.fromCharCode(98 + index), value, false)),
    ],
    difficulty: difficultyFor(context.ageGroup, context.acceptedCount),
    topics: ["phonics", context.examProfile.benchmarkFamily, pick(context.topics, seed)],
    explanation: `"${set.correct}" begins with the sound "${set.prompt}".`,
    hint: "Say the beginning sound out loud before you choose.",
    interactionType: "tap-card",
    interactionData: { ariaLabel: `Choose the word that starts with ${set.prompt}.` },
    generationMetadata: metadata(context, "english-phonics", `${set.prompt}-${set.correct}`, "playful"),
  };
}

function sightWordQuestion(context: GeneratorContext): DraftQuestion {
  const seed = localSeed(context);
  const target = pick(SIGHT_WORDS, mixSeed(seed, 2));
  const wrongWords = distinctPicks(SIGHT_WORDS, mixSeed(seed, 5), 3, [target]);
  const name = pick(NAMES, mixSeed(seed, 7));
  const place = pick(PLACES, mixSeed(seed, 11));

  return {
    questionText: `${name} is working in the ${place} ${classroomContext(seed, 3)}. Tap the sight word "${target}".`,
    answerOptions: [
      option("a", target, true),
      ...wrongWords.map((value, index) => option(String.fromCharCode(98 + index), value, false)),
    ],
    difficulty: difficultyFor(context.ageGroup, context.acceptedCount),
    topics: ["sight words", context.examProfile.benchmarkFamily, pick(context.topics, seed)],
    explanation: `"${target}" is the target sight word.`,
    hint: "Look carefully at each whole word, not just the first letter.",
    interactionType: "tap-card",
    interactionData: { ariaLabel: `Select the sight word ${target}.` },
    generationMetadata: metadata(context, "english-sight-word", `${target}-${seed}`, "playful"),
  };
}

function rhymingQuestion(context: GeneratorContext): DraftQuestion {
  const seed = localSeed(context);
  const set = pick(RHYME_SETS, mixSeed(seed, 2));
  const name = pick(NAMES, mixSeed(seed, 5));
  const place = pick(PLACES, mixSeed(seed, 7));

  return {
    questionText: `${name} is listening for rhymes in the ${place} ${classroomContext(seed, 5)}. Which word rhymes with "${set.word}"?`,
    answerOptions: [
      option("a", set.correct, true),
      ...set.wrong.map((value, index) => option(String.fromCharCode(98 + index), value, false)),
    ],
    difficulty: difficultyFor(context.ageGroup, context.acceptedCount),
    topics: ["rhyming words", context.examProfile.benchmarkFamily, pick(context.topics, seed)],
    explanation: `"${set.correct}" rhymes with "${set.word}" because they share the same ending sound.`,
    hint: "Say both words out loud and listen to the ending sound.",
    interactionType: "tap-card",
    interactionData: { ariaLabel: `Choose the word that rhymes with ${set.word}.` },
    generationMetadata: metadata(context, "english-rhyme", `${set.word}-${set.correct}-${seed}`, "playful"),
  };
}

function sentenceOrderQuestion(context: GeneratorContext): DraftQuestion {
  const seed = localSeed(context);
  const name = pick(NAMES, mixSeed(seed, 7));
  const place = pick(PLACES, mixSeed(seed, 11));
  const subjectWord = pick(["The cat", "The dog", "My friend", "The class", "A robot"], mixSeed(seed, 2));
  const action = pick(["runs", "jumps", "reads", "plays", "smiles"], mixSeed(seed, 3));
  const ending = pick(["at school", "in the park", "after lunch", "today", "with care"], mixSeed(seed, 5));
  const sentence = `${subjectWord} ${action} ${ending}.`;
  const wordTiles = `${subjectWord} / ${action} / ${ending}`;

  return {
    questionText: `${name} is checking sentence cards in the ${place} ${classroomContext(seed, 4)}. Which sentence puts these words in the correct order: ${wordTiles}`,
    answerOptions: [
      option("a", sentence, true),
      option("b", `${action} ${subjectWord} ${ending}.`, false),
      option("c", `${ending} ${subjectWord} ${action}.`, false),
      option("d", `${subjectWord} ${ending} ${action}.`, false),
    ],
    difficulty: difficultyFor(context.ageGroup, context.acceptedCount),
    topics: ["sentence structure", context.examProfile.benchmarkFamily, pick(context.topics, seed)],
    explanation: `The correct sentence order is subject, verb, then the rest: "${sentence}"`,
    hint: "A sentence usually starts with who or what it is about.",
    interactionType: "tap-card",
    interactionData: { ariaLabel: "Select the sentence with the correct word order." },
    generationMetadata: metadata(context, "english-sentence-order", `${subjectWord}-${action}-${ending}`),
  };
}

function grammarQuestion(context: GeneratorContext): DraftQuestion {
  const seed = localSeed(context);
  const subjectWord = pick(SUBJECT_WORDS, mixSeed(seed, 2));
  const actionWord = pick(ACTION_WORDS, mixSeed(seed, 3));
  const punctuationLead = pick(["Why", "How", "When", "Where", "What"], mixSeed(seed, 5));
  const frame = classroomContext(seed, 10);
  const variant = seed % 3;

  if (variant === 0) {
    const baseAction = actionWord.endsWith("s") ? actionWord.slice(0, -1) : actionWord;
    return {
      questionText: `Choose the best word ${frame}: "The ${subjectWord} ___ every morning."`,
      answerOptions: [
        option("a", actionWord, true),
        option("b", baseAction, false),
        option("c", `${baseAction}ed`, false),
        option("d", `${baseAction}ing`, false),
      ],
      difficulty: difficultyFor(context.ageGroup, context.acceptedCount),
      topics: ["grammar", context.examProfile.benchmarkFamily, pick(context.topics, seed)],
      explanation: `The subject is singular, so the best verb form is "${actionWord}".`,
      hint: "Read the sentence aloud and listen for the verb that sounds right.",
      interactionType: "tap-card",
      interactionData: { ariaLabel: "Select the best language answer." },
      generationMetadata: metadata(context, "english-grammar-verb", `${subjectWord}-${actionWord}-${seed}`),
    };
  }

  if (variant === 1) {
    return {
      questionText: `Which punctuation mark should finish this question ${frame}: "${punctuationLead} did the class go after lunch"`,
      answerOptions: [
        option("a", "?", true),
        option("b", ".", false),
        option("c", "!", false),
        option("d", ",", false),
      ],
      difficulty: difficultyFor(context.ageGroup, context.acceptedCount),
      topics: ["grammar", context.examProfile.benchmarkFamily, pick(context.topics, seed)],
      explanation: "Questions end with a question mark.",
      hint: "The sentence is asking something.",
      interactionType: "tap-card",
      interactionData: { ariaLabel: "Select the punctuation mark that ends the question." },
      generationMetadata: metadata(context, "english-grammar-punctuation", `${punctuationLead}-${seed}`),
    };
  }

  return {
    questionText: `Choose the correct word ${frame} to begin the sentence: "__ are going to the park after school."`,
    answerOptions: [
      option("a", "They", true),
      option("b", "Their", false),
      option("c", "There", false),
      option("d", "Them", false),
    ],
    difficulty: difficultyFor(context.ageGroup, context.acceptedCount),
    topics: ["grammar", context.examProfile.benchmarkFamily, pick(context.topics, seed)],
    explanation: "\"They\" is the subject pronoun that fits the sentence.",
    hint: "Pick the word that names the people doing the action.",
    interactionType: "tap-card",
    interactionData: { ariaLabel: "Select the correct word for the sentence." },
    generationMetadata: metadata(context, "english-grammar-pronoun", `${seed}`),
  };
}

function vocabularyQuestion(context: GeneratorContext): DraftQuestion {
  const seed = localSeed(context);
  const sets = [
    { word: "ancient", correct: "very old", wrong: ["very noisy", "very small", "very bright"] },
    { word: "generous", correct: "willing to share", wrong: ["easy to break", "hard to hear", "ready to sleep"] },
    { word: "swift", correct: "moving quickly", wrong: ["moving slowly", "full of water", "covered in dust"] },
    { word: "fragile", correct: "easy to break", wrong: ["easy to grow", "hard to reach", "bright and loud"] },
  ] as const;
  const set = pick(sets, seed);

  const frame = classroomContext(seed, 4);
  return {
    questionText: `${frame}, which option is closest in meaning to "${set.word}"?`,
    answerOptions: [
      option("a", set.correct, true),
      ...set.wrong.map((value, index) => option(String.fromCharCode(98 + index), value, false)),
    ],
    difficulty: difficultyFor(context.ageGroup, context.acceptedCount),
    topics: ["vocabulary", context.examProfile.benchmarkFamily, pick(context.topics, seed)],
    explanation: `The best meaning match for "${set.word}" is "${set.correct}".`,
    hint: "Think about how the word would be used in a sentence.",
    interactionType: "tap-card",
    interactionData: { ariaLabel: "Choose the closest meaning." },
    generationMetadata: metadata(context, "english-vocabulary", `${set.word}`),
  };
}

function upperYearsEnglishQuestion(context: GeneratorContext): DraftQuestion {
  const seed = localSeed(context);
  const topic = pick(context.topics, mixSeed(seed, 101));
  const name = pick(NAMES, mixSeed(seed, 103));
  const place = pick(PLACES, mixSeed(seed, 107));
  const frame = classroomContext(seed, 13);

  if (hasAnyKeyword(topic, ["passive", "subjunctive", "modal", "relative", "grammar"])) {
    const baseSentence = `${name} suggested that every student be on time for the debate rehearsal.`;
    return {
      questionText: `Which explanation best matches the grammar choice in this sentence from the ${place} ${frame}: "${baseSentence}"`,
      answerOptions: [
        option("a", "It uses the subjunctive mood to express a recommendation.", true),
        option("b", "It uses a question form to ask for permission.", false),
        option("c", "It uses the passive voice to hide the subject.", false),
        option("d", "It uses slang to sound informal.", false),
      ],
      difficulty: difficultyFor(context.ageGroup, context.acceptedCount),
      topics: uniqueTags(topic, "grammar", "style", "sentence craft", context.examProfile.benchmarkFamily),
      explanation: `The verb "be" after "suggested that" signals the subjunctive mood.`,
      hint: "Look at the unusual verb form after 'suggested that'.",
      interactionType: "tap-card",
      interactionData: { ariaLabel: "Choose the best grammar explanation." },
      generationMetadata: metadata(context, "english-upper-grammar", `${topic}-${seed}`),
    };
  }

  if (hasAnyKeyword(topic, ["literary", "figurative", "poetry", "rhetoric"])) {
    return {
      questionText: `${name} is annotating a poem in the ${place} ${frame}. Which phrase is the clearest example of metaphor?`,
      answerOptions: [
        option("a", "The classroom was a buzzing hive.", true),
        option("b", "The classroom was very busy today.", false),
        option("c", "The classroom had many students.", false),
        option("d", "The classroom looked bright and neat.", false),
      ],
      difficulty: difficultyFor(context.ageGroup, context.acceptedCount),
      topics: uniqueTags(topic, "literary devices", "figurative language", "analysis", context.examProfile.benchmarkFamily),
      explanation: `A metaphor compares two things directly without using "like" or "as".`,
      hint: "Look for a direct comparison, not just a description.",
      interactionType: "tap-card",
      interactionData: { ariaLabel: "Choose the sentence that uses metaphor." },
      generationMetadata: metadata(context, "english-upper-literary", `${topic}-${seed}`),
    };
  }

  if (hasAnyKeyword(topic, ["summaris", "critical", "analysis", "research", "inference"])) {
    const passage = `${name} reviewed three sources in the ${place} ${frame}. Each source agreed that the river had become cleaner after the community reduced plastic waste and planted native reeds along the banks.`;
    return {
      questionText: `Read the passage and choose the best summary.\n\n${passage}`,
      answerOptions: [
        option("a", "Community action helped improve river health.", true),
        option("b", "Rivers are always clean near schools.", false),
        option("c", "Plastic waste is impossible to reduce.", false),
        option("d", "The passage is mainly about choosing a classroom seat.", false),
      ],
      difficulty: difficultyFor(context.ageGroup, context.acceptedCount),
      topics: uniqueTags(topic, "reading comprehension", "summarising", "analysis", context.examProfile.benchmarkFamily),
      explanation: `The main idea is that community efforts improved the river.`,
      hint: "Focus on the shared big idea across the whole passage.",
      interactionType: "tap-card",
      interactionData: { ariaLabel: "Choose the best summary of the passage." },
      generationMetadata: metadata(context, "english-upper-summary", `${topic}-${seed}`),
    };
  }

  return {
    questionText: `${name} is preparing an argument in the ${place} ${frame}. Which sentence uses the most formal tone?`,
    answerOptions: [
      option("a", "The evidence strongly suggests that the later start time would improve student focus.", true),
      option("b", "I reckon starting later would be pretty awesome for everyone.", false),
      option("c", "Starting later is cool because nobody likes mornings.", false),
      option("d", "We should do it, and that's that.", false),
    ],
    difficulty: difficultyFor(context.ageGroup, context.acceptedCount),
    topics: uniqueTags(topic, "writing style", "formal writing", "argument", context.examProfile.benchmarkFamily),
    explanation: `Formal tone is precise, objective, and evidence-focused.`,
    hint: "Choose the option that sounds measured and academic.",
    interactionType: "tap-card",
    interactionData: { ariaLabel: "Choose the sentence with the most formal tone." },
    generationMetadata: metadata(context, "english-upper-style", `${topic}-${seed}`),
  };
}

function readingComprehensionQuestion(context: GeneratorContext): DraftQuestion {
  const seed = localSeed(context);
  const name = pick(NAMES, mixSeed(seed, 2));
  const place = pick(PLACES, mixSeed(seed, 3));
  const goal = pick(["finish a poster", "find a missing clue", "train for a race", "care for a seedling", "build a model bridge"], mixSeed(seed, 5));
  const obstacle = pick(["the instructions were smudged", "the wind kept moving the papers", "one part was missing", "the first idea did not work"], mixSeed(seed, 7));
  const frame = classroomContext(seed, 11);
  const passage = `${name} went to the ${place} ${frame} to ${goal}. At first, ${obstacle}. ${name} changed the plan and finished just before the bell.`;

  if (seed % 2 === 0) {
    return {
      questionText: `Read the short text and answer.\n\n${passage}\n\nWhere did the story happen?`,
      answerOptions: [
        option("a", place, true),
        option("b", pick(PLACES, seed, 4), false),
        option("c", pick(PLACES, seed, 5), false),
        option("d", pick(PLACES, seed, 6), false),
      ],
      difficulty: difficultyFor(context.ageGroup, context.acceptedCount),
      topics: ["reading comprehension", context.examProfile.benchmarkFamily, pick(context.topics, seed)],
      explanation: `The text says the story happened at the ${place}.`,
      hint: "Check the first sentence for the setting.",
      interactionType: "tap-card",
      interactionData: { ariaLabel: "Choose the setting named in the passage." },
      generationMetadata: metadata(context, "english-reading-detail", `${name}-${place}`),
    };
  }

  return {
    questionText: `Read the short text and answer.\n\n${passage}\n\nWhy did ${name} change the plan?`,
    answerOptions: [
      option("a", "because the first approach was not working", true),
      option("b", "because there was nothing left to do", false),
      option("c", "because the teacher sent everyone home", false),
      option("d", "because the bell had already rung", false),
    ],
    difficulty: difficultyFor(context.ageGroup, context.acceptedCount),
    topics: ["reading comprehension", context.examProfile.benchmarkFamily, pick(context.topics, seed, 1)],
    explanation: `${name} changed the plan after the first approach created a problem.`,
    hint: "Look for the problem in the middle of the text.",
    interactionType: "tap-card",
    interactionData: { ariaLabel: "Choose the best explanation from the passage." },
    generationMetadata: metadata(context, "english-reading-reason", `${name}-${place}-${goal}`),
  };
}

function habitatQuestion(context: GeneratorContext): DraftQuestion {
  const seed = localSeed(context);
  const animals = [
    { name: "frog", habitat: "pond" },
    { name: "bird", habitat: "nest" },
    { name: "fish", habitat: "river" },
    { name: "camel", habitat: "desert" },
    { name: "lion", habitat: "savannah" },
    { name: "rabbit", habitat: "burrow" },
  ] as const;
  const animal = pick(animals, seed);
  const wrongHabitats = distinctPicks(animals.map((entry) => entry.habitat), seed + 2, 3, [animal.habitat]);

  const name = pick(NAMES, mixSeed(seed, 5));
  const place = pick(PLACES, mixSeed(seed, 7));

  return {
    questionText: `${name} is learning about animals in the ${place} ${classroomContext(seed, 6)}. Where would a ${animal.name} most likely live?`,
    answerOptions: [
      option("a", animal.habitat, true),
      ...wrongHabitats.map((value, index) => option(String.fromCharCode(98 + index), value, false)),
    ],
    difficulty: difficultyFor(context.ageGroup, context.acceptedCount),
    topics: ["habitats", context.examProfile.benchmarkFamily, pick(context.topics, seed)],
    explanation: `A ${animal.name} is best matched with ${animal.habitat}.`,
    hint: "Think about where that animal finds food and shelter.",
    interactionType: "tap-card",
    interactionData: { ariaLabel: `Choose the best habitat for a ${animal.name}.` },
    generationMetadata: metadata(context, "science-habitat", `${animal.name}-${animal.habitat}`),
  };
}

function materialsQuestion(context: GeneratorContext): DraftQuestion {
  const seed = localSeed(context);
  const materials = [
    { name: "glass", property: "transparent" },
    { name: "rubber", property: "flexible" },
    { name: "metal", property: "strong" },
    { name: "cotton", property: "soft" },
    { name: "plastic", property: "waterproof" },
  ] as const;
  const material = pick(materials, seed);
  const wrongOptions = distinctPicks(materials.map((entry) => entry.property), seed + 1, 3, [material.property]);

  const place = pick(PLACES, mixSeed(seed, 3));
  const object = pick(["raincoat", "window", "bridge", "pillow", "lunch box"], mixSeed(seed, 5));

  return {
    questionText: `During a class check at the ${place} ${classroomContext(seed, 7)}, which property best describes ${material.name} for making a ${object}?`,
    answerOptions: [
      option("a", material.property, true),
      ...wrongOptions.map((value, index) => option(String.fromCharCode(98 + index), value, false)),
    ],
    difficulty: difficultyFor(context.ageGroup, context.acceptedCount),
    topics: ["materials", context.examProfile.benchmarkFamily, pick(context.topics, seed)],
    explanation: `${material.name[0].toUpperCase()}${material.name.slice(1)} is best described as ${material.property}.`,
    hint: "Think about how the material behaves in real life.",
    interactionType: "tap-card",
    interactionData: { ariaLabel: "Choose the best material property." },
    generationMetadata: metadata(context, "science-materials", `${material.name}-${material.property}`),
  };
}

function scienceReasoningQuestion(context: GeneratorContext): DraftQuestion {
  const seed = localSeed(context);
  const processes = [
    { cause: "water is heated", correct: "it changes into water vapour", wrong: ["it becomes heavier", "it turns into rock", "it stops existing"] },
    { cause: "ice is left in the sun", correct: "it melts into liquid water", wrong: ["it grows bigger", "it becomes gas immediately", "it turns white"] },
    { cause: "a seed gets water and sunlight", correct: "it can begin to grow", wrong: ["it changes into soil", "it loses all mass", "it becomes colder"] },
    { cause: "a force pushes a toy car harder", correct: "it can move faster", wrong: ["it always stops", "it turns invisible", "it becomes magnetic"] },
  ] as const;
  const process = pick(processes, seed);

  const name = pick(NAMES, mixSeed(seed, 3));
  const place = pick(PLACES, mixSeed(seed, 5));

  return {
    questionText: `${name} is doing a science check in the ${place} ${classroomContext(seed, 8)}. What is most likely to happen when ${process.cause}?`,
    answerOptions: [
      option("a", process.correct, true),
      ...process.wrong.map((value, index) => option(String.fromCharCode(98 + index), value, false)),
    ],
    difficulty: difficultyFor(context.ageGroup, context.acceptedCount),
    topics: ["scientific reasoning", context.examProfile.benchmarkFamily, pick(context.topics, seed)],
    explanation: `When ${process.cause}, ${process.correct}.`,
    hint: "Connect the cause in the question to the scientific effect you know.",
    interactionType: "tap-card",
    interactionData: { ariaLabel: "Choose the most likely scientific outcome." },
    generationMetadata: metadata(context, "science-reasoning", `${process.cause}`),
  };
}

function weatherQuestion(context: GeneratorContext): DraftQuestion {
  const seed = localSeed(context);
  const set = pick(WEATHER_SETS, mixSeed(seed, 2));
  const name = pick(NAMES, mixSeed(seed, 5));
  const place = pick(PLACES, mixSeed(seed, 7));

  return {
    questionText: `${name} looks outside from the ${place} ${classroomContext(seed, 9)} and sees ${set.clue}. What is the weather most likely like?`,
    answerOptions: [
      option("a", set.correct, true),
      ...set.wrong.map((value, index) => option(String.fromCharCode(98 + index), value, false)),
    ],
    difficulty: difficultyFor(context.ageGroup, context.acceptedCount),
    topics: ["weather", context.examProfile.benchmarkFamily, pick(context.topics, seed)],
    explanation: `Those clues match ${set.correct} weather.`,
    hint: "Think about the weather word that best fits the clues.",
    interactionType: "tap-card",
    interactionData: { ariaLabel: "Choose the weather that matches the clues." },
    generationMetadata: metadata(context, "science-weather", `${set.correct}-${seed}`),
  };
}

function upperYearsScienceQuestion(context: GeneratorContext): DraftQuestion {
  const seed = localSeed(context);
  const topic = pick(context.topics, mixSeed(seed, 109));
  const name = pick(NAMES, mixSeed(seed, 113));
  const place = pick(PLACES, mixSeed(seed, 127));
  const frame = classroomContext(seed, 14);

  if (hasAnyKeyword(topic, ["electricity", "circuit", "energy"])) {
    return {
      questionText: `${name} is testing a circuit in the ${place} ${frame}. Which change would allow a bulb in an open circuit to light?`,
      answerOptions: [
        option("a", "Close the gap so the circuit forms a complete loop.", true),
        option("b", "Remove the battery from the circuit.", false),
        option("c", "Replace the wire with a paper label.", false),
        option("d", "Open the switch even further.", false),
      ],
      difficulty: difficultyFor(context.ageGroup, context.acceptedCount),
      topics: uniqueTags(topic, "physics", "electricity", "circuits", context.examProfile.benchmarkFamily),
      explanation: `A bulb lights only when current can flow through a complete circuit.`,
      hint: "Think about what electric current needs in order to travel.",
      interactionType: "tap-card",
      interactionData: { ariaLabel: "Choose the change that would complete the circuit." },
      generationMetadata: metadata(context, "science-upper-electricity", `${topic}-${seed}`),
    };
  }

  if (hasAnyKeyword(topic, ["cell", "human", "body", "classification", "living"])) {
    return {
      questionText: `${name} is comparing living things in the ${place} ${frame}. Which statement is the strongest evidence that an organism is living?`,
      answerOptions: [
        option("a", "It carries out life processes such as growth and reproduction.", true),
        option("b", "It is blue and shiny.", false),
        option("c", "It can fit inside a backpack.", false),
        option("d", "It was found near a tree.", false),
      ],
      difficulty: difficultyFor(context.ageGroup, context.acceptedCount),
      topics: uniqueTags(topic, "biology", "classification", "life processes", context.examProfile.benchmarkFamily),
      explanation: `Life processes such as growth and reproduction are key signs of living organisms.`,
      hint: "Choose the option that describes what living things do, not just how they look.",
      interactionType: "tap-card",
      interactionData: { ariaLabel: "Choose the strongest evidence that something is living." },
      generationMetadata: metadata(context, "science-upper-biology", `${topic}-${seed}`),
    };
  }

  if (hasAnyKeyword(topic, ["chemical", "atom", "element", "material"])) {
    return {
      questionText: `${name} is working in the ${place} ${frame}. Which observation is the best sign that a chemical reaction has happened?`,
      answerOptions: [
        option("a", "A new gas is produced and the temperature changes.", true),
        option("b", "Water is poured from one beaker into another.", false),
        option("c", "A solid is broken into smaller pieces.", false),
        option("d", "A book is moved to a different shelf.", false),
      ],
      difficulty: difficultyFor(context.ageGroup, context.acceptedCount),
      topics: uniqueTags(topic, "chemistry", "chemical reactions", "matter", context.examProfile.benchmarkFamily),
      explanation: `Gas production and temperature change are strong clues that a new substance formed.`,
      hint: "Look for evidence that the substance changed, not just its shape or position.",
      interactionType: "tap-card",
      interactionData: { ariaLabel: "Choose the observation that shows a chemical reaction." },
      generationMetadata: metadata(context, "science-upper-chemistry", `${topic}-${seed}`),
    };
  }

  return {
    questionText: `${name} is studying forces in the ${place} ${frame}. Why does a heavier object usually need a bigger push to speed up?`,
    answerOptions: [
      option("a", "Greater mass usually requires more force to change motion.", true),
      option("b", "Heavier objects stop obeying gravity.", false),
      option("c", "Heavier objects have no inertia.", false),
      option("d", "A bigger push makes the object lighter.", false),
    ],
    difficulty: difficultyFor(context.ageGroup, context.acceptedCount),
    topics: uniqueTags(topic, "physics", "forces", "motion", context.examProfile.benchmarkFamily),
    explanation: `Objects with more mass resist changes in motion more strongly, so they need more force.`,
    hint: "Think about inertia and how mass affects movement.",
    interactionType: "tap-card",
    interactionData: { ariaLabel: "Choose the best explanation about force and mass." },
    generationMetadata: metadata(context, "science-upper-physics", `${topic}-${seed}`),
  };
}

// ── Match-pairs templates ─────────────────────────────────────────────────────

function scienceMatchPairsQuestion(context: GeneratorContext): DraftQuestion {
  const seed = localSeed(context);
  const variant = mixSeed(seed, 71) % 4;

  const VARIANTS = [
    {
      questionText: "Match each diet type to what that animal eats.",
      pairs: [
        { left: "Carnivore", right: "Eats only meat", leftEmoji: "🦁", rightEmoji: "🥩" },
        { left: "Herbivore", right: "Eats only plants", leftEmoji: "🐘", rightEmoji: "🌿" },
        { left: "Omnivore",  right: "Eats plants and meat", leftEmoji: "🐻", rightEmoji: "🍖" },
      ],
      topics: ["animals", "diet", "classification", "biology"],
      explanation: "Carnivores eat meat, herbivores eat plants, and omnivores eat both.",
      hint: "Think about what each animal's teeth are built for.",
    },
    {
      questionText: "Match each animal group to one of its features.",
      pairs: [
        { left: "Mammal",   right: "Feeds babies milk", leftEmoji: "🐬", rightEmoji: "🍼" },
        { left: "Reptile",  right: "Has scales, cold-blooded", leftEmoji: "🦎", rightEmoji: "❄️" },
        { left: "Bird",     right: "Has feathers and wings", leftEmoji: "🦅", rightEmoji: "🪶" },
      ],
      topics: ["animals", "classification", "biology"],
      explanation: "Animals are classified by shared features like fur, scales, or feathers.",
      hint: "Think about what is unique to each group.",
    },
    {
      questionText: "Match each change of state to what happens to the particles.",
      pairs: [
        { left: "Evaporation", right: "Liquid turns to gas", leftEmoji: "🌊", rightEmoji: "💨" },
        { left: "Condensation", right: "Gas turns to liquid", leftEmoji: "☁️", rightEmoji: "💧" },
        { left: "Freezing", right: "Liquid turns to solid", leftEmoji: "🥤", rightEmoji: "🧊" },
      ],
      topics: ["states of matter", "water cycle", "chemistry"],
      explanation: "States of matter change when energy is added or removed.",
      hint: "Think about heating and cooling water.",
    },
    {
      questionText: "Match each part of a plant to its job.",
      pairs: [
        { left: "Roots",   right: "Absorb water from soil", leftEmoji: "🌱", rightEmoji: "💧" },
        { left: "Leaves",  right: "Make food using sunlight", leftEmoji: "🍃", rightEmoji: "☀️" },
        { left: "Flowers", right: "Attract insects for pollination", leftEmoji: "🌸", rightEmoji: "🐝" },
      ],
      topics: ["plants", "biology", "photosynthesis"],
      explanation: "Each part of a plant has a specific role in helping it survive and reproduce.",
      hint: "Think about what each part looks like and where it is on the plant.",
    },
  ];

  const v = VARIANTS[variant];
  const correctText = "All matched correctly";

  return {
    questionText: v.questionText,
    answerOptions: [
      option("a", correctText, true),
      option("b", "Carnivore eats plants", false),
      option("c", "Herbivore eats meat", false),
    ],
    difficulty: difficultyFor(context.ageGroup, context.acceptedCount),
    topics: uniqueTags(...v.topics, context.examProfile.benchmarkFamily),
    explanation: v.explanation,
    hint: v.hint,
    generationMetadata: {
      ...metadata(context, "science-match-pairs", `variant-${variant}-${seed}`),
      visualMode: "match-pairs",
      interactionType: "tap-card",
      interactionData: {
        type: "match-pairs",
        pairs: v.pairs,
        instruction: v.questionText,
      },
    },
  };
}

function mathsMatchPairsQuestion(context: GeneratorContext): DraftQuestion {
  const seed = localSeed(context);
  const variant = mixSeed(seed, 83) % 3;

  const VARIANTS = [
    {
      questionText: "Match each shape to the number of sides it has.",
      pairs: [
        { left: "Triangle", right: "3 sides", leftEmoji: "🔺", rightEmoji: "3️⃣" },
        { left: "Square",   right: "4 equal sides", leftEmoji: "🟥", rightEmoji: "4️⃣" },
        { left: "Hexagon",  right: "6 sides", leftEmoji: "⬡", rightEmoji: "6️⃣" },
      ],
      topics: ["shapes", "geometry", "sides"],
      explanation: "The prefix of a shape's name often tells you how many sides it has: tri=3, quad=4, hex=6.",
      hint: "Count the corners — a shape has as many corners as sides.",
    },
    {
      questionText: "Match each maths word to its meaning.",
      pairs: [
        { left: "Perimeter", right: "Distance around a shape", leftEmoji: "📐", rightEmoji: "↔️" },
        { left: "Area",      right: "Space inside a shape", leftEmoji: "🏠", rightEmoji: "📦" },
        { left: "Volume",    right: "Space inside a 3D object", leftEmoji: "🧊", rightEmoji: "📐" },
      ],
      topics: ["measurement", "geometry", "perimeter", "area"],
      explanation: "Perimeter goes around the outside, area fills the inside, volume fills 3D space.",
      hint: "Think about fencing a garden (perimeter) vs tiling the floor (area).",
    },
    {
      questionText: "Match each operation to what it does.",
      pairs: [
        { left: "Addition",       right: "Puts groups together", leftEmoji: "➕", rightEmoji: "🤝" },
        { left: "Subtraction",    right: "Takes away an amount", leftEmoji: "➖", rightEmoji: "👋" },
        { left: "Multiplication", right: "Repeated addition of equal groups", leftEmoji: "✖️", rightEmoji: "🔁" },
      ],
      topics: ["operations", "number", "arithmetic"],
      explanation: "The four operations — add, subtract, multiply, divide — are the building blocks of maths.",
      hint: "Think about what happens to the total in each case.",
    },
  ];

  const v = VARIANTS[variant];

  return {
    questionText: v.questionText,
    answerOptions: [
      option("a", "All matched correctly", true),
      option("b", "Triangle has 4 sides", false),
      option("c", "Square has 3 sides", false),
    ],
    difficulty: difficultyFor(context.ageGroup, context.acceptedCount),
    topics: uniqueTags(...v.topics, context.examProfile.benchmarkFamily),
    explanation: v.explanation,
    hint: v.hint,
    generationMetadata: {
      ...metadata(context, "maths-match-pairs", `variant-${variant}-${seed}`),
      visualMode: "match-pairs",
      interactionType: "tap-card",
      interactionData: {
        type: "match-pairs",
        pairs: v.pairs,
        instruction: v.questionText,
      },
    },
  };
}

function englishMatchPairsQuestion(context: GeneratorContext): DraftQuestion {
  const seed = localSeed(context);
  const variant = mixSeed(seed, 97) % 3;

  const VARIANTS = [
    {
      questionText: "Match each word type to an example.",
      pairs: [
        { left: "Noun",      right: "Dog", leftEmoji: "🏷️", rightEmoji: "🐕" },
        { left: "Verb",      right: "Run", leftEmoji: "🏃", rightEmoji: "👟" },
        { left: "Adjective", right: "Big", leftEmoji: "🎨", rightEmoji: "🐘" },
      ],
      topics: ["grammar", "nouns", "verbs", "adjectives"],
      explanation: "Nouns name things, verbs show action, adjectives describe nouns.",
      hint: "Can you do it (verb)? Does it name something (noun)? Does it describe something (adjective)?",
    },
    {
      questionText: "Match each punctuation mark to its job.",
      pairs: [
        { left: "Full stop (.)",    right: "Ends a sentence", leftEmoji: "⏺️", rightEmoji: "🔚" },
        { left: "Question mark (?)", right: "Ends a question", leftEmoji: "❓", rightEmoji: "🤔" },
        { left: "Comma (,)",        right: "Separates items in a list", leftEmoji: "〽️", rightEmoji: "📋" },
      ],
      topics: ["punctuation", "grammar", "writing"],
      explanation: "Punctuation marks tell readers how to read — where to pause, stop, or ask.",
      hint: "Think about where you put each mark in a sentence.",
    },
    {
      questionText: "Match each prefix to its meaning.",
      pairs: [
        { left: "un–",  right: "Not (unkind)", leftEmoji: "🚫", rightEmoji: "😟" },
        { left: "re–",  right: "Again (rewrite)", leftEmoji: "🔁", rightEmoji: "✏️" },
        { left: "mis–", right: "Wrongly (mistake)", leftEmoji: "❌", rightEmoji: "🤦" },
      ],
      topics: ["vocabulary", "word structure", "prefixes"],
      explanation: "Prefixes added to the start of a word change its meaning.",
      hint: "Try adding the prefix to a word you know.",
    },
  ];

  const v = VARIANTS[variant];

  return {
    questionText: v.questionText,
    answerOptions: [
      option("a", "All matched correctly", true),
      option("b", "Verb is a naming word", false),
      option("c", "Noun shows an action", false),
    ],
    difficulty: difficultyFor(context.ageGroup, context.acceptedCount),
    topics: uniqueTags(...v.topics, context.examProfile.benchmarkFamily),
    explanation: v.explanation,
    hint: v.hint,
    generationMetadata: {
      ...metadata(context, "english-match-pairs", `variant-${variant}-${seed}`),
      visualMode: "match-pairs",
      interactionType: "tap-card",
      interactionData: {
        type: "match-pairs",
        pairs: v.pairs,
        instruction: v.questionText,
      },
    },
  };
}

function getTemplateGenerators(subject: Subject, ageGroup: AgeGroup, country: Country): TemplateGenerator[] {
  if (subject === "maths") {
    if (isEarlyYears(ageGroup)) return [visualShapeQuestion, countingQuestion, numeracyReasoningQuestion];
    if (country === "UK" && ageGroup === "year4") return [timesTableQuestion, numeracyReasoningQuestion, numeracyReasoningQuestion];
    return [upperYearsMathsQuestion, numeracyReasoningQuestion, timesTableQuestion, mathsMatchPairsQuestion, upperYearsMathsQuestion];
  }

  if (subject === "english") {
    if (country === "UK" && ageGroup === "year1") return [phonicsQuestion, sightWordQuestion, rhymingQuestion, sentenceOrderQuestion, grammarQuestion];
    if (ageGroup === "foundation") return [phonicsQuestion, sightWordQuestion, rhymingQuestion, sentenceOrderQuestion];
    if (isEarlyYears(ageGroup)) return [phonicsQuestion, sightWordQuestion, rhymingQuestion, sentenceOrderQuestion, grammarQuestion];
    return [upperYearsEnglishQuestion, readingComprehensionQuestion, grammarQuestion, englishMatchPairsQuestion, vocabularyQuestion];
  }

  if (isEarlyYears(ageGroup)) return [habitatQuestion, materialsQuestion, scienceReasoningQuestion, weatherQuestion];
  return [upperYearsScienceQuestion, scienceReasoningQuestion, scienceMatchPairsQuestion, materialsQuestion, upperYearsScienceQuestion];
}

function isQuestionSensible(question: Question, ageGroup: AgeGroup): boolean {
  if (!question.questionText.trim()) return false;
  if (/undefined|null/i.test(question.questionText)) return false;
  if (question.answerOptions.length < 2) return false;
  if (question.answerOptions.filter((answer) => answer.isCorrect).length !== 1) return false;
  if (new Set(question.answerOptions.map((answer) => answer.text.trim().toLowerCase())).size !== question.answerOptions.length) return false;
  if (isEarlyYears(ageGroup) && question.questionText.length > 180) return false;
  if (!isEarlyYears(ageGroup) && question.questionText.length < 12) return false;
  return !question.answerOptions.some((answer) => !answer.text.trim());
}

function normaliseQuestionText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function fingerprintQuestion(question: Question): string {
  const answers = question.answerOptions
    .map((answer) => `${answer.text.toLowerCase().trim()}::${answer.isCorrect ? "1" : "0"}`)
    .join("|");

  return `${normaliseQuestionText(question.questionText)}::${answers}`;
}

export function generateQuestionBank(options: GenerateQuestionBankOptions): Question[] {
  const { ageGroup, subject, count, country = "AU" } = options;
  const topics = getTopicsForGrade(ageGroup, subject, country);
  const examProfile = getExamProfile(country, ageGroup, subject);
  const generators = getTemplateGenerators(subject, ageGroup, country);
  const questions: Question[] = [];
  const seenFingerprints = new Set<string>();
  let seed = 0;
  let attempts = 0;
  let duplicateCount = 0;
  let invalidCount = 0;

  while (questions.length < count && attempts < count * 150) {
    const context: GeneratorContext = { ageGroup, country, examProfile, seed, acceptedCount: questions.length, subject, topics };
    const draft = generators[seed % generators.length](context);
    const question = createQuestion(context, draft);
    const fingerprint = fingerprintQuestion(question);

    const sensible = isQuestionSensible(question, ageGroup);

    if (!seenFingerprints.has(fingerprint) && sensible) {
      seenFingerprints.add(fingerprint);
      questions.push(question);
    } else if (seenFingerprints.has(fingerprint)) {
      duplicateCount += 1;
    } else {
      invalidCount += 1;
    }

    seed += 1;
    attempts += 1;
  }

  if (questions.length !== count) {
    throw new Error(`Unable to generate ${count} high-quality unique questions for ${country} ${subject} ${ageGroup}. Generated ${questions.length}. Duplicates: ${duplicateCount}. Invalid: ${invalidCount}.`);
  }

  return questions;
}

export function generateQuestionBankMatrix(countPerSubjectPerClass: number, country: Country = "AU"): Question[] {
  const questions: Question[] = [];
  for (const ageGroup of AGE_GROUPS) {
    for (const subject of SUBJECTS) {
      const generated = generateQuestionBank({ ageGroup, subject, count: countPerSubjectPerClass, country });
      for (const question of generated) {
        questions.push(question);
      }
    }
  }
  return questions;
}

export function generateQuestionBankUniverse(countPerSubjectPerClass: number, countries: Country[] = ALL_COUNTRIES): Question[] {
  const questions: Question[] = [];
  for (const country of countries) {
    const generated = generateQuestionBankMatrix(countPerSubjectPerClass, country);
    for (const question of generated) {
      questions.push(question);
    }
  }
  return questions;
}

export function summarizeQuestionBank(questions: Question[]): Record<string, number> {
  return questions.reduce<Record<string, number>>((summary, question) => {
    summary[question.pk] = (summary[question.pk] ?? 0) + 1;
    return summary;
  }, {});
}
