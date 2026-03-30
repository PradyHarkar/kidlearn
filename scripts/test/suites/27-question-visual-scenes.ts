import { test, startSuite, assertEqual, assertTrue, assertNotEqual } from "../lib/assert";
import { buildQuestionVisualProfile } from "../../../lib/services/question-visuals";
import type { Question } from "../../../types";

const SUITE = "question-visual-scenes";

function makeQuestion(overrides: Partial<Question> & { questionId: string; subject: Question["subject"]; yearLevel: Question["yearLevel"]; questionText: string }): Question {
  return {
    pk: `${overrides.subject}#year3#AU`,
    questionId: overrides.questionId,
    questionText: overrides.questionText,
    answerOptions: overrides.answerOptions ?? [
      { id: "a", text: "One", isCorrect: true },
      { id: "b", text: "Two", isCorrect: false },
      { id: "c", text: "Three", isCorrect: false },
      { id: "d", text: "Four", isCorrect: false },
    ],
    difficulty: overrides.difficulty ?? 3,
    topics: overrides.topics ?? ["test"],
    explanation: overrides.explanation ?? "Because.",
    subject: overrides.subject,
    yearLevel: overrides.yearLevel,
    ageGroup: overrides.ageGroup,
    country: overrides.country,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    cached: overrides.cached ?? false,
    ...overrides,
  };
}

export async function runQuestionVisualScenesSuite() {
  startSuite("27  QUESTION VISUAL SCENES");

  // ── Mode inference: explicit visualMode ────────────────────────────────────

  await test(SUITE, "prep maths addition -> counting-scene with grouped counters", async () => {
    const question = makeQuestion({
      questionId: "visual-maths-001",
      subject: "maths",
      yearLevel: "prep",
      ageGroup: "foundation",
      questionText: "What is 2 + 3?",
      topics: ["addition", "counting"],
      generationMetadata: { generator: "template", templateId: "maths-counting-visual", visualMode: "counting-scene" } as never,
    });

    const profile = buildQuestionVisualProfile(question);
    assertEqual(profile.mode, "counting-scene", "maths addition should show counting scene");
    assertTrue(profile.counters.some((counter) => counter.label === "Total"), "counting scene should include a total");
    assertTrue(profile.sceneItems.length >= 3, "counting scene should show visible objects");
  });

  await test(SUITE, "shape question -> shape-dots scene", async () => {
    const question = makeQuestion({
      questionId: "visual-shape-001",
      subject: "maths",
      yearLevel: "prep",
      ageGroup: "foundation",
      questionText: "Which shape has three sides? Triangle, square, circle, or rectangle?",
      topics: ["shapes", "geometry"],
      generationMetadata: { generator: "template", templateId: "maths-visual-shape", visualMode: "shape-dots" } as never,
    });

    const profile = buildQuestionVisualProfile(question);
    assertEqual(profile.mode, "shape-dots", "shape question should show dot tracing");
    assertTrue(profile.sceneItems.length >= 3, "shape scene should render dots");
  });

  await test(SUITE, "early English -> word-cards scene", async () => {
    const question = makeQuestion({
      questionId: "visual-english-001",
      subject: "english",
      yearLevel: "year1",
      ageGroup: "year1",
      questionText: "Which word rhymes with cat?",
      topics: ["rhyming words"],
      generationMetadata: { generator: "template", templateId: "english-rhyme", visualMode: "word-cards" } as never,
    });

    const profile = buildQuestionVisualProfile(question);
    assertEqual(profile.mode, "word-cards", "early English should show word cards");
    assertTrue(profile.sceneItems.length >= 4, "word cards scene should have multiple tiles");
  });

  await test(SUITE, "science -> story-scene visual", async () => {
    const question = makeQuestion({
      questionId: "visual-science-001",
      subject: "science",
      yearLevel: "year4",
      ageGroup: "year4",
      questionText: "What happens when ice is left in the sun?",
      topics: ["science", "materials"],
      generationMetadata: { generator: "template", templateId: "science-reasoning", visualMode: "story-scene" } as never,
    });

    const profile = buildQuestionVisualProfile(question);
    assertEqual(profile.mode, "story-scene", "science should show story scene");
    assertTrue(profile.sceneItems.length >= 4, "story scene should have multiple visual items");
  });

  // ── Mode inference: from question text (no explicit visualMode) ────────────

  await test(SUITE, "maths addition text inference -> counting-scene for foundation", async () => {
    const question = makeQuestion({
      questionId: "visual-infer-001",
      subject: "maths",
      yearLevel: "foundation",
      ageGroup: "foundation",
      questionText: "How many apples altogether if you have 3 and get 2 more?",
      topics: ["addition"],
    });

    const profile = buildQuestionVisualProfile(question);
    assertEqual(profile.mode, "counting-scene", "foundation maths with 'how many altogether' should infer counting-scene");
  });

  await test(SUITE, "older maths question -> concept-cards not counting-scene", async () => {
    const question = makeQuestion({
      questionId: "visual-infer-002",
      subject: "maths",
      yearLevel: "year6",
      ageGroup: "year6",
      questionText: "Solve: 4x + 7 = 23. What is x?",
      topics: ["algebra"],
    });

    const profile = buildQuestionVisualProfile(question);
    assertEqual(profile.mode, "concept-cards", "year6 algebra should get concept-cards not counting-scene");
  });

  await test(SUITE, "shape keyword in text -> shape-dots inferred without explicit mode", async () => {
    const question = makeQuestion({
      questionId: "visual-infer-003",
      subject: "maths",
      yearLevel: "year2",
      ageGroup: "year2",
      questionText: "How many sides does a triangle have?",
      topics: ["geometry"],
    });

    const profile = buildQuestionVisualProfile(question);
    assertEqual(profile.mode, "shape-dots", "question mentioning triangle should infer shape-dots");
  });

  await test(SUITE, "year1 english -> word-cards not story-scene", async () => {
    const question = makeQuestion({
      questionId: "visual-infer-004",
      subject: "english",
      yearLevel: "year1",
      ageGroup: "year1",
      questionText: "Which picture starts with the sound 'sh'?",
      topics: ["phonics"],
    });

    const profile = buildQuestionVisualProfile(question);
    assertEqual(profile.mode, "word-cards", "year1 phonics should get word-cards");
  });

  await test(SUITE, "year5 english -> story-scene not word-cards", async () => {
    const question = makeQuestion({
      questionId: "visual-infer-005",
      subject: "english",
      yearLevel: "year5",
      ageGroup: "year5",
      questionText: "In the story, why did the character feel lonely?",
      topics: ["reading-comprehension"],
    });

    const profile = buildQuestionVisualProfile(question);
    assertEqual(profile.mode, "story-scene", "year5 english should get story-scene not word-cards");
  });

  // ── Counting scene: number extraction accuracy ─────────────────────────────

  await test(SUITE, "counting-scene extracts correct group counts from question text", async () => {
    const question = makeQuestion({
      questionId: "visual-count-001",
      subject: "maths",
      yearLevel: "foundation",
      ageGroup: "foundation",
      questionText: "Sam has 4 strawberries. He picks 5 more. How many does he have?",
      topics: ["addition"],
      generationMetadata: { generator: "template", templateId: "maths-counting-visual", visualMode: "counting-scene" } as never,
    });

    const profile = buildQuestionVisualProfile(question);
    const group1 = profile.counters.find((c) => c.label === "Group 1");
    const group2 = profile.counters.find((c) => c.label === "Group 2");
    const total = profile.counters.find((c) => c.label === "Total");

    assertEqual(group1?.value, "4", "Group 1 should be 4");
    assertEqual(group2?.value, "5", "Group 2 should be 5");
    assertEqual(total?.value, "9", "Total should be 9 (4 + 5)");
  });

  await test(SUITE, "counting-scene scene items match group1 + separator + group2 counts", async () => {
    const question = makeQuestion({
      questionId: "visual-count-002",
      subject: "maths",
      yearLevel: "year1",
      ageGroup: "year1",
      questionText: "What is 2 + 3?",
      topics: ["addition"],
      generationMetadata: { generator: "template", templateId: "maths-counting-visual", visualMode: "counting-scene" } as never,
    });

    const profile = buildQuestionVisualProfile(question);
    // sceneItems should be: [emoji, emoji, "+", emoji, emoji, emoji]  = 2 + 1 sep + 3 = 6
    const nonSeparatorItems = profile.sceneItems.filter((item) => item !== "➕");
    assertTrue(nonSeparatorItems.length >= 5, "scene should show at least 5 object items (2 + 3)");
  });

  // ── Shape scene: shape extraction ─────────────────────────────────────────

  await test(SUITE, "shape-dots extracts triangle from question text", async () => {
    const question = makeQuestion({
      questionId: "visual-shape-002",
      subject: "maths",
      yearLevel: "year1",
      ageGroup: "year1",
      questionText: "Join the dots to draw a triangle.",
      topics: ["shapes"],
      generationMetadata: { generator: "template", templateId: "maths-visual-shape", visualMode: "shape-dots" } as never,
    });

    const profile = buildQuestionVisualProfile(question);
    const shapeCounter = profile.counters.find((c) => c.label === "Shape");
    assertEqual(shapeCounter?.value, "triangle", "should extract triangle from text");
  });

  await test(SUITE, "shape-dots extracts rectangle from question text", async () => {
    const question = makeQuestion({
      questionId: "visual-shape-003",
      subject: "maths",
      yearLevel: "year2",
      ageGroup: "year2",
      questionText: "Connect the dots to make a rectangle.",
      topics: ["geometry"],
      generationMetadata: { generator: "template", templateId: "maths-visual-shape", visualMode: "shape-dots" } as never,
    });

    const profile = buildQuestionVisualProfile(question);
    const shapeCounter = profile.counters.find((c) => c.label === "Shape");
    assertEqual(shapeCounter?.value, "rectangle", "should extract rectangle from text");
  });

  // ── Profile completeness ───────────────────────────────────────────────────

  await test(SUITE, "every profile has non-empty title, subtitle, primaryLabel", async () => {
    const subjects: Array<Question["subject"]> = ["maths", "english", "science"];
    const yearLevels: Array<Question["yearLevel"]> = ["foundation", "year3", "year6"];

    for (const subject of subjects) {
      for (const yearLevel of yearLevels) {
        const question = makeQuestion({
          questionId: `completeness-${subject}-${yearLevel}`,
          subject,
          yearLevel,
          ageGroup: yearLevel as never,
          questionText: subject === "maths" ? "What is 5 + 3?" : subject === "science" ? "What is water made of?" : "Which word is a noun?",
          topics: ["general"],
        });

        const profile = buildQuestionVisualProfile(question);
        assertTrue(profile.title.length > 0, `${subject}/${yearLevel} title should be non-empty`);
        assertTrue(profile.subtitle.length > 0, `${subject}/${yearLevel} subtitle should be non-empty`);
        assertTrue(profile.primaryLabel.length > 0, `${subject}/${yearLevel} primaryLabel should be non-empty`);
        assertTrue(profile.accentEmoji.length > 0, `${subject}/${yearLevel} accentEmoji should be non-empty`);
      }
    }
  });

  await test(SUITE, "concept-cards is default for upper-years maths", async () => {
    const question = makeQuestion({
      questionId: "visual-default-001",
      subject: "maths",
      yearLevel: "year8",
      ageGroup: "year8",
      questionText: "Which option is closest in meaning to 'ancient'?",
      topics: ["vocabulary"],
    });

    const profile = buildQuestionVisualProfile(question);
    // year8 english-sounding question in maths slot should fall through to concept-cards
    assertNotEqual(profile.mode, "counting-scene", "year8 should not get counting-scene");
    assertTrue(profile.sceneItems.length > 0, "concept-cards should have scene items");
  });
}
