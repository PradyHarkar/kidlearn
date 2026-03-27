/**
 * SUITE 23 — QUESTION QUALITY AUDIT
 * ─────────────────────────────────────────────────────────────────────────────
 * Regression tests for the question quality audit engine.
 *
 * Covers all 8 audit dimensions with inline bad-question fixtures:
 *   1.  lowercase-start      — question text begins with a lowercase letter
 *   2.  poor-hint            — hint missing, too short, or copies question text
 *   3.  missing-question-mark — text doesn't end with ?/./ !
 *   4.  ambiguous-answer     — correct answer is nearly identical to a wrong option
 *   5.  vocabulary-mismatch  — complex word in an early-years question
 *   6.  confusing-wording    — double negative
 *   7.  near-duplicate       — bank-level: two identical question texts
 *   8.  topic-mismatch       — no meaningful topic tags
 *
 * Also includes one HTTP integration test:
 *   - Report a question → GET /api/questions must exclude that question
 */

import { test, startSuite, assertTrue, assertEqual, assertDefined, assertStatus } from "../lib/assert";
import { auditQuestion, auditQuestionBank } from "../../../lib/services/question-audit";
import type { AuditIssueType } from "../../../lib/services/question-audit";
import { TestClient } from "../lib/http";
import { TEST_USERS, TEST_CHILDREN } from "../fixtures";
import type { Question, AgeGroup } from "../../../types";

const SUITE = "question-quality-audit";

// ── Fixture helpers ───────────────────────────────────────────────────────────

function makeQuestion(overrides: Partial<Question> & { questionId: string }): Question {
  return {
    pk: "english#year8#AU",
    questionText: "Which word is a synonym for 'ancient'?",
    answerOptions: [
      { id: "a", text: "Very old",   isCorrect: true },
      { id: "b", text: "Very small", isCorrect: false },
      { id: "c", text: "Very noisy", isCorrect: false },
      { id: "d", text: "Very bright",isCorrect: false },
    ],
    difficulty: 8,
    topics: ["vocabulary", "synonyms"],
    explanation: "'Ancient' means very old.",
    hint: "Think about how the word would be used in a sentence.",
    subject: "english",
    yearLevel: "year8",
    ageGroup: "year8",
    country: "AU",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── Suite ─────────────────────────────────────────────────────────────────────

export async function runQuestionQualityAuditSuite(baseUrl: string) {
  startSuite("23  QUESTION QUALITY AUDIT");

  // ── 1. Capitalisation ───────────────────────────────────────────────────────

  await test(SUITE, "audit: lowercase-start flagged for question beginning with lowercase", async () => {
    const q = makeQuestion({
      questionId: "audit-bad-cap-001",
      // Exactly what Dhruva sees: classroomContext prefix + lowercase continuation
      questionText: "during the morning rotation, which option is closest in meaning to 'ancient'?",
    });
    const issues = auditQuestion(q, "year8");
    const types = issues.map((i) => i.type);
    assertTrue(types.includes("lowercase-start"), `Expected lowercase-start, got: ${JSON.stringify(types)}`);
  });

  await test(SUITE, "audit: good question with capital start has no lowercase-start issue", async () => {
    const q = makeQuestion({ questionId: "audit-good-cap-001" });
    const issues = auditQuestion(q, "year8");
    assertTrue(!issues.some((i) => i.type === "lowercase-start"), "Should not flag a properly capitalised question");
  });

  // ── 2. Hint quality ─────────────────────────────────────────────────────────

  await test(SUITE, "audit: poor-hint flagged when hint is missing", async () => {
    const q = makeQuestion({ questionId: "audit-bad-hint-001", hint: undefined });
    const issues = auditQuestion(q, "year8");
    assertTrue(issues.some((i) => i.type === "poor-hint"), "Missing hint should be flagged");
  });

  await test(SUITE, "audit: poor-hint flagged when hint is too short", async () => {
    const q = makeQuestion({ questionId: "audit-bad-hint-002", hint: "Try." });
    const issues = auditQuestion(q, "year8");
    assertTrue(issues.some((i) => i.type === "poor-hint"), "4-char hint should be flagged");
  });

  await test(SUITE, "audit: poor-hint flagged when hint copies question text", async () => {
    const text = "Which word is a synonym for 'ancient'?";
    const q = makeQuestion({
      questionId: "audit-bad-hint-003",
      questionText: text,
      hint: text,
    });
    const issues = auditQuestion(q, "year8");
    assertTrue(issues.some((i) => i.type === "poor-hint"), "Hint identical to question text should be flagged");
  });

  await test(SUITE, "audit: good hint (≥10 chars, different from question) is not flagged", async () => {
    const q = makeQuestion({
      questionId: "audit-good-hint-001",
      hint: "Think about how the word would be used in a sentence.",
    });
    const issues = auditQuestion(q, "year8");
    assertTrue(!issues.some((i) => i.type === "poor-hint"), "Good hint should not be flagged");
  });

  // ── 3. Missing question mark ────────────────────────────────────────────────

  await test(SUITE, "audit: missing-question-mark flagged when text ends without punctuation", async () => {
    const q = makeQuestion({
      questionId: "audit-bad-punc-001",
      questionText: "Choose the word that means very old",
    });
    const issues = auditQuestion(q, "year8");
    assertTrue(issues.some((i) => i.type === "missing-question-mark"), "No trailing punctuation should be flagged");
  });

  await test(SUITE, "audit: question ending with '?' is not flagged", async () => {
    const q = makeQuestion({ questionId: "audit-good-punc-001" });
    const issues = auditQuestion(q, "year8");
    assertTrue(!issues.some((i) => i.type === "missing-question-mark"), "Trailing '?' should not be flagged");
  });

  // ── 4. Ambiguous answer ─────────────────────────────────────────────────────

  await test(SUITE, "audit: ambiguous-answer flagged when correct and wrong option are near-identical", async () => {
    // "increased" vs "increases" — edit distance 1 (last char d→s), both ≥5 chars
    const q = makeQuestion({
      questionId: "audit-bad-ambig-001",
      questionText: "The number of students in the class has ___?",
      answerOptions: [
        { id: "a", text: "increased",  isCorrect: true },
        { id: "b", text: "increases",  isCorrect: false },
        { id: "c", text: "decreased",  isCorrect: false },
        { id: "d", text: "remained",   isCorrect: false },
      ],
    });
    const issues = auditQuestion(q, "year8");
    assertTrue(issues.some((i) => i.type === "ambiguous-answer"), `Near-identical correct/wrong pair should be flagged; got: ${JSON.stringify(issues)}`);
  });

  // ── 5. Vocabulary mismatch ──────────────────────────────────────────────────

  await test(SUITE, "audit: vocabulary-mismatch flagged for complex word in foundation question", async () => {
    const q = makeQuestion({
      questionId: "audit-bad-vocab-001",
      questionText: "What is the electromagnetic field around a magnet called?",
      ageGroup: "foundation",
      yearLevel: "foundation",
      pk: "science#foundation#AU",
    });
    const issues = auditQuestion(q, "foundation");
    assertTrue(issues.some((i) => i.type === "vocabulary-mismatch"), "Complex vocab in foundation should be flagged");
  });

  await test(SUITE, "audit: vocabulary-mismatch not flagged for year8", async () => {
    const q = makeQuestion({
      questionId: "audit-good-vocab-001",
      questionText: "What is the electromagnetic field around a magnet called?",
      ageGroup: "year8",
    });
    const issues = auditQuestion(q, "year8");
    assertTrue(!issues.some((i) => i.type === "vocabulary-mismatch"), "Complex vocab for year8 should be fine");
  });

  // ── 6. Confusing wording ────────────────────────────────────────────────────

  await test(SUITE, "audit: confusing-wording flagged for double negative", async () => {
    const q = makeQuestion({
      questionId: "audit-bad-wording-001",
      questionText: "Which animal does not have a spine, not including insects?",
    });
    const issues = auditQuestion(q, "year5");
    assertTrue(issues.some((i) => i.type === "confusing-wording"), "Double negative should be flagged");
  });

  await test(SUITE, "audit: single 'not' is fine — no confusing-wording flag", async () => {
    const q = makeQuestion({
      questionId: "audit-good-wording-001",
      questionText: "Which of these is not a mammal?",
    });
    const issues = auditQuestion(q, "year5");
    assertTrue(!issues.some((i) => i.type === "confusing-wording"), "Single 'not' should be fine");
  });

  // ── 7. Near-duplicate (bank-level) ──────────────────────────────────────────

  await test(SUITE, "auditQuestionBank: near-duplicate flagged when two questions have identical text", async () => {
    const q1 = makeQuestion({ questionId: "audit-dup-001" });
    const q2 = makeQuestion({
      questionId: "audit-dup-002",
      questionText: q1.questionText,  // intentionally identical
    });
    const report = auditQuestionBank([q1, q2], "year8");
    assertTrue(report.results.some((r) => r.issues.some((i) => i.type === "near-duplicate")), "Duplicate text should be flagged in bank audit");
    assertEqual(report.byIssueType["near-duplicate"] ?? 0, 1, "Exactly one near-duplicate flag expected");
  });

  await test(SUITE, "auditQuestionBank: unique questions have no near-duplicate flag", async () => {
    const q1 = makeQuestion({ questionId: "audit-unique-001" });
    const q2 = makeQuestion({ questionId: "audit-unique-002", questionText: "What is the antonym of 'ancient'?" });
    const report = auditQuestionBank([q1, q2], "year8");
    assertEqual(report.byIssueType["near-duplicate"] ?? 0, 0, "No near-duplicates expected for distinct questions");
  });

  // ── 8. Topic mismatch ───────────────────────────────────────────────────────

  await test(SUITE, "audit: topic-mismatch flagged when all topics are generic", async () => {
    const q = makeQuestion({
      questionId: "audit-bad-topic-001",
      topics: ["english", "general"],
    });
    const issues = auditQuestion(q, "year8");
    assertTrue(issues.some((i) => i.type === "topic-mismatch"), "All-generic topics should be flagged");
  });

  await test(SUITE, "audit: topic-mismatch flagged for empty topics", async () => {
    const q = makeQuestion({ questionId: "audit-bad-topic-002", topics: [] });
    const issues = auditQuestion(q, "year8");
    assertTrue(issues.some((i) => i.type === "topic-mismatch"), "Empty topics should be flagged");
  });

  await test(SUITE, "audit: meaningful topics are not flagged", async () => {
    const q = makeQuestion({
      questionId: "audit-good-topic-001",
      topics: ["vocabulary", "synonyms", "upper-years-english"],
    });
    const issues = auditQuestion(q, "year8");
    assertTrue(!issues.some((i) => i.type === "topic-mismatch"), "Meaningful topics should not be flagged");
  });

  // ── Bank summary ─────────────────────────────────────────────────────────────

  await test(SUITE, "auditQuestionBank: all-good bank returns passed = total", async () => {
    const questions = [
      makeQuestion({ questionId: "audit-bank-good-001" }),
      makeQuestion({ questionId: "audit-bank-good-002", questionText: "What is the antonym of 'ancient'?" }),
    ];
    const report = auditQuestionBank(questions, "year8");
    assertEqual(report.total, 2, "total should be 2");
    assertEqual(report.failed, 0, "failed should be 0 for clean questions");
  });

  await test(SUITE, "auditQuestionBank: bad bank reports correct failed count", async () => {
    const questions = [
      makeQuestion({ questionId: "audit-bank-bad-001", questionText: "which word means old?" }), // lowercase + no cap
      makeQuestion({ questionId: "audit-bank-bad-002", hint: "" }),
      makeQuestion({ questionId: "audit-bank-bad-003" }),  // clean
    ];
    const report = auditQuestionBank(questions, "year8");
    assertTrue(report.failed >= 1, `expected at least 1 failed question, got ${report.failed}`);
    assertTrue((report.byIssueType["lowercase-start"] ?? 0) >= 1, "Expected at least one lowercase-start flag");
  });

  // ── HTTP: reported question excluded from /api/questions ────────────────────

  await test(SUITE, "HTTP: reported question is excluded from subsequent GET /api/questions", async () => {
    const client = new TestClient(baseUrl);
    const loginResult = await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    if (!loginResult.success) {
      console.log("    ⚠  Login failed (server not running or user not seeded) — skipping HTTP blocking test");
      return;
    }

    // Use a known seeded test question ID that belongs to year5 AU
    const targetQuestionId = "tt-q-maths-year5-AU-001";

    // Report it
    const reportRes = await client.post<{ success?: boolean }>(
      "/api/questions/report",
      {
        questionId: targetQuestionId,
        reason: "Question quality audit: test blocking integration",
        subject: "maths",
      }
    );
    // If endpoint not deployed, skip gracefully
    if (reportRes.status === 404) {
      console.log("    ⚠  /api/questions/report not deployed — skipping blocking integration test");
      return;
    }
    assertStatus(reportRes.status, 201, reportRes.raw);
    assertTrue((reportRes.body as { success?: boolean }).success === true, "report should succeed");

    // Fetch questions for AU_YEAR5 child (difficulty 6, maths)
    const questionsRes = await client.get<{ questions?: Array<{ questionId?: string }> }>(
      `/api/questions?childId=${TEST_CHILDREN.AU_YEAR5.childId}&subject=maths`
    );
    assertStatus(questionsRes.status, 200, questionsRes.raw);

    const returnedIds = (questionsRes.body.questions ?? []).map((q) => q.questionId);
    assertTrue(
      !returnedIds.includes(targetQuestionId),
      `Reported question ${targetQuestionId} should be excluded from question pool, but was returned`
    );
  });
}
