/**
 * SUITE 30 — THEME QUESTION CONTEXT
 * Verifies themed question scenes use the child's world/favorite tags.
 */

import { test, startSuite, assertEqual, assertTrue } from "../lib/assert";
import { buildQuestionVisualProfile } from "../../../lib/services/question-visuals";
import type { Question } from "../../../types";

const SUITE = "theme-question-context";

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

export async function runThemeQuestionContextSuite() {
  startSuite("30  THEME QUESTION CONTEXT");

  await test(SUITE, "soccer theme uses football context in counting scene", async () => {
    const question = makeQuestion({
      questionId: "theme-soccer-001",
      subject: "maths",
      yearLevel: "foundation",
      ageGroup: "foundation",
      questionText: "What is 2 + 3?",
      topics: ["addition", "counting"],
      generationMetadata: { generator: "template", templateId: "maths-counting-visual", visualMode: "counting-scene" } as never,
    });

    const profile = buildQuestionVisualProfile(question, {
      themeKey: "soccer",
      favoriteTags: ["sports", "games"],
    });

    assertEqual(profile.mode, "counting-scene", "counting question should stay as counting-scene");
    assertTrue(profile.title.toLowerCase().includes("football"), "soccer theme should use football wording");
    assertTrue(profile.subtitle.toLowerCase().includes("messi") || profile.subtitle.toLowerCase().includes("ronaldo"), "soccer theme should feel named and familiar");
    assertEqual(profile.accentEmoji, "⚽", "soccer theme should use football emoji");
  });

  await test(SUITE, "space theme uses space context in word cards / concept cards", async () => {
    const question = makeQuestion({
      questionId: "theme-space-001",
      subject: "science",
      yearLevel: "year4",
      ageGroup: "year4",
      questionText: "What happens when ice is left in the sun?",
      topics: ["materials", "energy"],
      generationMetadata: { generator: "template", templateId: "science-reasoning", visualMode: "story-scene" } as never,
    });

    const profile = buildQuestionVisualProfile(question, {
      themeKey: "space",
      favoriteTags: ["space"],
    });

    assertEqual(profile.mode, "story-scene", "science story should stay story-scene");
    assertTrue(profile.title.toLowerCase().includes("space") || profile.subtitle.toLowerCase().includes("rocket"), "space theme should tint the scene");
    assertEqual(profile.accentEmoji, "🚀", "space theme should use rocket emoji");
  });

  await test(SUITE, "favorite tags can steer the visual world even if theme differs", async () => {
    const question = makeQuestion({
      questionId: "theme-tags-001",
      subject: "maths",
      yearLevel: "foundation",
      ageGroup: "foundation",
      questionText: "What is 1 + 1?",
      topics: ["addition", "counting"],
      generationMetadata: { generator: "template", templateId: "maths-counting-visual", visualMode: "counting-scene" } as never,
    });

    const profile = buildQuestionVisualProfile(question, {
      themeKey: "fantasy",
      favoriteTags: ["sports", "arcade"],
    });

    assertEqual(profile.mode, "counting-scene", "counting question should stay counting-scene");
    assertEqual(profile.accentEmoji, "⚽", "sports favorite tag should steer toward football visuals");
    assertTrue(profile.sceneItems.some((item) => item === "⚽"), "scene should include football visuals");
  });
}
