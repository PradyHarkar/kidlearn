/**
 * SUITE 26 — QUESTION RAMP / QUALITY REGRESSION
 * Verifies two high-impact fixes:
 * 1) generated question text starts with a capital letter
 * 2) session ordering ramps by difficulty and avoids long same-topic streaks
 */

import { test, startSuite, assertTrue, assertEqual } from "../lib/assert";
import { generateQuestionBank } from "../../../lib/content/question-bank";
import { orderQuestionsForSession, prepareQuestionForDelivery } from "../../../lib/services/questions";
import type { AgeGroup, Country, Question, Subject } from "../../../types";

const SUITE = "question-ramp";

function makeQuestion(overrides: Partial<Question> & { questionId: string; difficulty: number; topics: string[]; subject: Subject; yearLevel: Question["yearLevel"]; ageGroup: AgeGroup; country: Country }): Question {
  return {
    pk: `${overrides.subject}#${overrides.ageGroup}#${overrides.country}`,
    questionId: overrides.questionId,
    questionText: overrides.questionText ?? "Question text?",
    answerOptions: overrides.answerOptions ?? [
      { id: "a", text: "One", isCorrect: true },
      { id: "b", text: "Two", isCorrect: false },
    ],
    difficulty: overrides.difficulty,
    topics: overrides.topics,
    explanation: overrides.explanation ?? "Explanation",
    subject: overrides.subject,
    yearLevel: overrides.yearLevel,
    ageGroup: overrides.ageGroup,
    country: overrides.country,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    cached: overrides.cached ?? false,
    ...overrides,
  };
}

export async function runQuestionRampSuite(baseUrl: string) {
  startSuite("26  QUESTION RAMP");

  await test(SUITE, "generateQuestionBank: all generated questions start with a capital letter", async () => {
    const questions = generateQuestionBank({
      ageGroup: "year3",
      subject: "maths",
      count: 24,
      country: "AU",
    });

    assertEqual(questions.length, 24, "expected 24 generated questions");
    for (const question of questions) {
      assertTrue(
        /^[A-Z]/.test(question.questionText),
        `question must start with a capital letter: ${question.questionText.slice(0, 80)}`
      );
    }
  });

  await test(SUITE, "prepareQuestionForDelivery: capitalizes lowercase stems and shuffles the correct option away from A", async () => {
    const question = makeQuestion({
      questionId: "delivery-001",
      subject: "maths",
      yearLevel: "year3",
      ageGroup: "year3",
      country: "AU",
      difficulty: 5,
      topics: ["addition", "number sense"],
      questionText: "during the morning rotation, which option is closest in meaning to ancient?",
      answerOptions: [
        { id: "a", text: "Very old", isCorrect: true },
        { id: "b", text: "Very small", isCorrect: false },
        { id: "c", text: "Very noisy", isCorrect: false },
        { id: "d", text: "Very bright", isCorrect: false },
      ],
    });

    const delivered = prepareQuestionForDelivery(question);
    assertTrue(/^[A-Z]/.test(delivered.questionText), "delivered question should start with a capital letter");
    assertTrue(!(delivered.answerOptions[0]?.isCorrect ?? false), "correct answer should not always stay in option A");
    assertEqual(delivered.answerOptions.length, 4, "answer option count should stay the same");
  });

  await test(SUITE, "orderQuestionsForSession: difficulties are non-decreasing", async () => {
    const questions = Array.from({ length: 24 }, (_, index) =>
      makeQuestion({
        questionId: `q-${index + 1}`,
        subject: "maths",
        yearLevel: "year5",
        ageGroup: "year5",
        country: "AU",
        difficulty: [4, 5, 6, 7, 8, 9][index % 6],
        topics: ["addition", "mental maths", `topic-${index % 3}`],
        questionText: `Question ${index + 1}?`,
      })
    );

    const ordered = orderQuestionsForSession(questions, 6, new Set());
    assertEqual(ordered.length, 20, "session should return 20 questions");

    for (let index = 1; index < ordered.length; index += 1) {
      assertTrue(
        ordered[index].difficulty >= ordered[index - 1].difficulty,
        `difficulty should not go backwards at index ${index}: ${ordered[index - 1].difficulty} -> ${ordered[index].difficulty}`
      );
    }
  });

  await test(SUITE, "orderQuestionsForSession: avoids three identical topics in a row", async () => {
    const questions = [
      ...Array.from({ length: 8 }, (_, index) =>
        makeQuestion({
          questionId: `sub-${index + 1}`,
          subject: "maths",
          yearLevel: "year5",
          ageGroup: "year5",
          country: "AU",
          difficulty: 5 + (index % 3),
          topics: ["subtraction", "number sense"],
          questionText: `Subtraction question ${index + 1}?`,
        })
      ),
      ...Array.from({ length: 8 }, (_, index) =>
        makeQuestion({
          questionId: `add-${index + 1}`,
          subject: "maths",
          yearLevel: "year5",
          ageGroup: "year5",
          country: "AU",
          difficulty: 5 + (index % 3),
          topics: ["addition", "number sense"],
          questionText: `Addition question ${index + 1}?`,
        })
      ),
      ...Array.from({ length: 8 }, (_, index) =>
        makeQuestion({
          questionId: `mul-${index + 1}`,
          subject: "maths",
          yearLevel: "year5",
          ageGroup: "year5",
          country: "AU",
          difficulty: 5 + (index % 3),
          topics: ["multiplication", "number sense"],
          questionText: `Multiplication question ${index + 1}?`,
        })
      ),
    ];

    const ordered = orderQuestionsForSession(questions, 6, new Set());
    const primaryTopics = ordered.map((q) => q.topics[0]);

    for (let index = 2; index < primaryTopics.length; index += 1) {
      assertTrue(
        !(primaryTopics[index] === primaryTopics[index - 1] && primaryTopics[index - 1] === primaryTopics[index - 2]),
        `topic should not repeat 3 times in a row at index ${index}`
      );
    }
  });
}
