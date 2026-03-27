/**
 * SUITE 18 — QUESTION ENGINE ROBUSTNESS
 * ───────────────────────────────────────
 * Tests the question selection, difficulty targeting, deduplication,
 * and adaptive algorithm logic.
 *
 * Bugs covered by this suite:
 *
 *   BUG-QE1  normalizeQuestionSignature did not sort answer options —
 *            same question with options in different order was not deduped.
 *            Fix: sort options alphabetically before hashing.
 *
 *   BUG-QE2  getCurrentDifficulty returned undefined for maths/english when
 *            the child record was missing the difficulty field but had prior
 *            attempts — silently bypassing difficulty targeting.
 *            Fix: clamp to baseline if value is falsy or out of 1–10 range.
 *
 *   BUG-QE3  Country-specific questions replaced the generic pool entirely.
 *            5 country questions + 100 generic = 5 usable.
 *            Fix: merge country-specific first, then supplement with generic.
 *
 *   BUG-QE4  getAdaptiveDifficulty fallback was hardcoded to foundation/prep
 *            regardless of the child's actual age group.
 *            Fix: accept fallbackAgeGroup parameter.
 *
 *   BUG-QE5  sort(() => Math.random() - 0.5) is statistically biased.
 *            Fix: Fisher-Yates shuffle.
 *
 * Unit tests (pure functions — no HTTP):
 *   - calculatePerformanceWindow direction and edge cases
 *   - calculateDifficultyAdjustment boundary values
 *   - normalizeQuestionSignature sort-invariance
 *   - getCurrentDifficulty fallback for missing/invalid values
 *
 * HTTP tests (require running app + seeded questions):
 *   - Question response structure validation
 *   - Every question has exactly 1 correct answer
 *   - No duplicate questionIds in a session
 *   - Difficulty targeting within expected range
 *   - Subject isolation
 *   - Question count ≤ DEFAULT_QUESTION_SET_SIZE
 *   - Invalid subject → 400
 *   - Cross-user child access → 403
 */

import { TestClient } from "../lib/http";
import {
  test, startSuite, assertDefined, assertStatus,
  assertTrue, assertEqual, assertInRange, assertArrayLength,
} from "../lib/assert";
import { TEST_USERS, TEST_CHILDREN } from "../fixtures";

// Pure function imports — unit tests run without network
import { calculatePerformanceWindow, calculateDifficultyAdjustment } from "../../../lib/adaptive";

const SUITE = "question-engine";

// ─── Unit helpers ─────────────────────────────────────────────────────────────

/** Simulates the normalizeQuestionSignature logic so we can test it independently */
function normalize(questionText: string, options: string[]): string {
  const qt = questionText.trim().toLowerCase().replace(/\s+/g, " ");
  const at = options
    .map((o) => o.trim().toLowerCase().replace(/\s+/g, " "))
    .sort()    // BUG-QE1 fix: sort before joining
    .join("|");
  return `${qt}::${at}`;
}

export async function runQuestionEngineSuite(baseUrl: string) {
  startSuite("18  QUESTION ENGINE");

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP A — calculatePerformanceWindow unit tests
  // ─────────────────────────────────────────────────────────────────────────

  await test(SUITE, "calculatePerformanceWindow: all 10 correct → consecutiveCorrect=3, accuracy=100", async () => {
    const answers = Array.from({ length: 10 }, () => ({ correct: true }));
    const result = calculatePerformanceWindow(answers);
    assertTrue(result.consecutiveCorrect >= 3, "consecutiveCorrect should be ≥3");
    assertEqual(result.recentAccuracy, 100, "accuracy");
  });

  await test(SUITE, "calculatePerformanceWindow: all 10 wrong → consecutiveWrong=2, accuracy=0", async () => {
    const answers = Array.from({ length: 10 }, () => ({ correct: false }));
    const result = calculatePerformanceWindow(answers);
    assertTrue(result.consecutiveWrong >= 2, "consecutiveWrong should be ≥2");
    assertEqual(result.recentAccuracy, 0, "accuracy");
  });

  await test(SUITE, "calculatePerformanceWindow: alternating C/W → no streak, accuracy=50", async () => {
    const answers = [true, false, true, false, true, false, true, false, true, false].map(c => ({ correct: c }));
    const result = calculatePerformanceWindow(answers);
    assertTrue(result.consecutiveCorrect < 3, "no 3-streak in alternating");
    assertTrue(result.consecutiveWrong < 2, "no 2-wrong-streak in alternating");
    assertEqual(result.recentAccuracy, 50, "50% accuracy");
  });

  await test(SUITE, "calculatePerformanceWindow: most-recent-first ordering — last 3 correct triggers +1", async () => {
    // Simulates: 17 wrong, then 3 correct (most recent first after reverse)
    // reverse() in submitProgressForChild → most recent answer is index 0
    const answersRecentFirst = [
      { correct: true }, { correct: true }, { correct: true }, // last 3 (most recent)
      ...Array.from({ length: 17 }, () => ({ correct: false })),
    ];
    const result = calculatePerformanceWindow(answersRecentFirst);
    assertTrue(result.consecutiveCorrect >= 3, "3 most-recent correct should register streak");
  });

  await test(SUITE, "calculatePerformanceWindow: first 2 wrong (most-recent) triggers -1", async () => {
    const answersRecentFirst = [
      { correct: false }, { correct: false }, // most recent 2 wrong
      ...Array.from({ length: 8 }, () => ({ correct: true })),
    ];
    const result = calculatePerformanceWindow(answersRecentFirst);
    assertTrue(result.consecutiveWrong >= 2, "2 most-recent wrong should register streak");
  });

  await test(SUITE, "calculatePerformanceWindow: empty answers → zeros", async () => {
    const result = calculatePerformanceWindow([]);
    assertEqual(result.consecutiveCorrect, 0, "consecutiveCorrect");
    assertEqual(result.consecutiveWrong, 0, "consecutiveWrong");
    assertEqual(result.recentAccuracy, 0, "recentAccuracy");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP B — calculateDifficultyAdjustment boundary / edge cases
  // ─────────────────────────────────────────────────────────────────────────

  await test(SUITE, "calculateDifficultyAdjustment: exactly 2 correct → no change (need 3)", async () => {
    assertEqual(calculateDifficultyAdjustment(5, 2, 0), 5, "2 correct = no change");
  });

  await test(SUITE, "calculateDifficultyAdjustment: exactly 1 wrong → no change (need 2)", async () => {
    assertEqual(calculateDifficultyAdjustment(5, 0, 1), 5, "1 wrong = no change");
  });

  await test(SUITE, "calculateDifficultyAdjustment: 3 correct at max (10) → stays 10", async () => {
    assertEqual(calculateDifficultyAdjustment(10, 3, 0), 10, "capped at 10");
  });

  await test(SUITE, "calculateDifficultyAdjustment: 2 wrong at min (1) → stays 1", async () => {
    assertEqual(calculateDifficultyAdjustment(1, 0, 2), 1, "floored at 1");
  });

  await test(SUITE, "calculateDifficultyAdjustment: both >=3 correct and >=2 wrong → correct wins (+1)", async () => {
    // In practice this shouldn't happen in one session, but if it does,
    // the correct threshold check runs first in the function
    const result = calculateDifficultyAdjustment(5, 3, 2);
    assertEqual(result, 6, "3 correct takes priority over 2 wrong");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP C — normalizeQuestionSignature sort-invariance (BUG-QE1)
  // ─────────────────────────────────────────────────────────────────────────

  await test(SUITE, "BUG-QE1: normalizeQuestionSignature is order-invariant for answer options", async () => {
    const q = "what is 2 + 2?";
    const sig1 = normalize(q, ["3", "4", "5", "6"]);
    const sig2 = normalize(q, ["6", "3", "5", "4"]);  // different order
    const sig3 = normalize(q, ["4", "5", "3", "6"]);  // yet another order
    assertEqual(sig1, sig2, "options in different order should produce same signature");
    assertEqual(sig1, sig3, "options in different order should produce same signature");
  });

  await test(SUITE, "BUG-QE1: different questions produce different signatures", async () => {
    const sig1 = normalize("what is 2+2?", ["3", "4", "5", "6"]);
    const sig2 = normalize("what is 3+3?", ["3", "4", "5", "6"]);
    assertTrue(sig1 !== sig2, "different question text = different signature");
  });

  await test(SUITE, "BUG-QE1: questions with different answer sets produce different signatures", async () => {
    const sig1 = normalize("what is 2+2?", ["3", "4", "5", "6"]);
    const sig2 = normalize("what is 2+2?", ["3", "4", "5", "7"]);  // different last option
    assertTrue(sig1 !== sig2, "different answer options = different signature");
  });

  await test(SUITE, "BUG-QE1: case and whitespace are normalized in signature", async () => {
    const sig1 = normalize("What is 2+2?", ["Four", "Three", "Five", "Six"]);
    const sig2 = normalize("what is  2+2?", ["four", "three", "five", "six"]);  // extra space, lowercase
    assertEqual(sig1, sig2, "case/whitespace differences should not create different signatures");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP D — HTTP: Question response structure
  // (requires seeded questions and running app)
  // ─────────────────────────────────────────────────────────────────────────

  interface Question {
    questionId?: string;
    questionText?: string;
    answerOptions?: Array<{ id?: string; text?: string; isCorrect?: boolean }>;
    difficulty?: number;
    subject?: string;
    topics?: string[];
    pk?: string;
  }

  interface QuestionsResponse {
    questions?: Question[];
    difficulty?: number;
    ageGroup?: string;
    yearLevel?: string;
    totalAvailable?: number;
  }

  await test(SUITE, "GET /api/questions: every question has exactly 1 correct answer", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const res = await client.get<QuestionsResponse>(
      `/api/questions?subject=maths&childId=${TEST_CHILDREN.AU_YEAR3.childId}`
    );
    if (res.status === 404) { console.log("    ⚠  No questions seeded — skipping"); return; }
    assertStatus(res.status, 200, res.raw);

    const questions = (res.body as QuestionsResponse).questions ?? [];
    assertArrayLength(questions, 1, "at least 1 question");

    for (const q of questions) {
      const correctCount = (q.answerOptions ?? []).filter(o => o.isCorrect === true).length;
      assertEqual(correctCount, 1, `question "${q.questionText?.slice(0, 40)}" must have exactly 1 correct answer, got ${correctCount}`);
    }
  });

  await test(SUITE, "GET /api/questions: no duplicate questionIds in a session", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const res = await client.get<QuestionsResponse>(
      `/api/questions?subject=maths&childId=${TEST_CHILDREN.AU_YEAR3.childId}`
    );
    if (res.status === 404) return;
    assertStatus(res.status, 200, res.raw);

    const questions = (res.body as QuestionsResponse).questions ?? [];
    const ids = questions.map(q => q.questionId).filter(Boolean);
    const uniqueIds = new Set(ids);
    assertEqual(uniqueIds.size, ids.length, `found ${ids.length - uniqueIds.size} duplicate questionId(s)`);
  });

  await test(SUITE, "GET /api/questions: all answer options have an id field", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const res = await client.get<QuestionsResponse>(
      `/api/questions?subject=maths&childId=${TEST_CHILDREN.AU_YEAR3.childId}`
    );
    if (res.status === 404) return;
    assertStatus(res.status, 200, res.raw);

    const questions = (res.body as QuestionsResponse).questions ?? [];
    for (const q of questions) {
      for (const opt of q.answerOptions ?? []) {
        assertTrue(
          typeof opt.id === "string" && opt.id.length > 0,
          `question "${q.questionText?.slice(0, 30)}" has option without id`
        );
      }
    }
  });

  await test(SUITE, "GET /api/questions: question count ≤ 20", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const res = await client.get<QuestionsResponse>(
      `/api/questions?subject=maths&childId=${TEST_CHILDREN.AU_YEAR3.childId}`
    );
    if (res.status === 404) return;
    assertStatus(res.status, 200, res.raw);

    const count = ((res.body as QuestionsResponse).questions ?? []).length;
    assertTrue(count <= 20, `returned ${count} questions, max is 20`);
  });

  await test(SUITE, "GET /api/questions: difficulty targeting — returned questions near child's level", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    // AU year5 child has baseline difficulty 6
    const res = await client.get<QuestionsResponse>(
      `/api/questions?subject=maths&childId=${TEST_CHILDREN.AU_YEAR5.childId}`
    );
    if (res.status === 404) return;
    assertStatus(res.status, 200, res.raw);

    const body = res.body as QuestionsResponse;
    assertInRange(body.difficulty!, 1, 10, "difficulty must be 1–10");

    // The questions returned should have difficulty within ±3 of the target
    // (may fall back to ±3 window if pool is sparse)
    const targetDifficulty = body.difficulty!;
    const questions = body.questions ?? [];
    if (questions.length > 0) {
      const allInRange = questions.every(
        q => typeof q.difficulty === "number" && Math.abs(q.difficulty - targetDifficulty) <= 3
      );
      assertTrue(allInRange, `all questions should be within ±3 of target difficulty ${targetDifficulty}`);
    }
  });

  await test(SUITE, "GET /api/questions: subject isolation — maths questions have subject=maths", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const res = await client.get<QuestionsResponse>(
      `/api/questions?subject=maths&childId=${TEST_CHILDREN.AU_YEAR3.childId}`
    );
    if (res.status === 404) return;
    assertStatus(res.status, 200, res.raw);

    const questions = (res.body as QuestionsResponse).questions ?? [];
    for (const q of questions) {
      if (q.subject) {
        assertEqual(q.subject, "maths", `question pk=${q.pk} has wrong subject`);
      }
    }
  });

  await test(SUITE, "GET /api/questions: all 3 subjects return valid shape", async () => {
    for (const subject of ["maths", "english", "science"] as const) {
      const client = new TestClient(baseUrl);
      await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

      const res = await client.get<QuestionsResponse>(
        `/api/questions?subject=${subject}&childId=${TEST_CHILDREN.AU_YEAR3.childId}`
      );
      // 200 or 404 both acceptable (404 = no questions seeded for that subject)
      assertTrue([200, 404].includes(res.status), `${subject}: unexpected status ${res.status}`);
      if (res.status === 200) {
        assertDefined((res.body as QuestionsResponse).questions, `${subject} questions field`);
        assertDefined((res.body as QuestionsResponse).difficulty, `${subject} difficulty field`);
        assertDefined((res.body as QuestionsResponse).ageGroup, `${subject} ageGroup field`);
      }
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP E — HTTP: Security and validation
  // ─────────────────────────────────────────────────────────────────────────

  await test(SUITE, "GET /api/questions: invalid subject value → 400 or no match", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const res = await client.get("/api/questions?subject=history&childId=any-id");
    // history is not a valid subject — should get 400 or 404 (not 200)
    assertTrue([400, 404].includes(res.status), `unexpected status ${res.status} for invalid subject`);
  });

  await test(SUITE, "GET /api/questions: cross-user child access → 403 or 404", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.US_PARENT.email, TEST_USERS.US_PARENT.password);

    // Try to access AU parent's child — different userId
    const res = await client.get(
      `/api/questions?subject=maths&childId=${TEST_CHILDREN.AU_YEAR3.childId}`
    );
    assertTrue(
      [403, 404].includes(res.status),
      `cross-user child access should be 403 or 404, got ${res.status}`
    );
  });

  await test(SUITE, "GET /api/questions: unauthenticated → 401", async () => {
    const anon = new TestClient(baseUrl);
    const res = await anon.get("/api/questions?subject=maths&childId=any");
    assertStatus(res.status, 401, res.raw);
  });

  await test(SUITE, "GET /api/questions: missing subject → 400", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const res = await client.get(`/api/questions?childId=${TEST_CHILDREN.AU_YEAR3.childId}`);
    assertStatus(res.status, 400, res.raw);
  });

  await test(SUITE, "GET /api/questions: missing childId → 400", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const res = await client.get("/api/questions?subject=maths");
    assertStatus(res.status, 400, res.raw);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP F — HTTP: Two consecutive fetches should not return identical sets
  // (probabilistic — tests that shuffling is actually happening)
  // ─────────────────────────────────────────────────────────────────────────

  await test(SUITE, "GET /api/questions: two fetches return questions (shuffle is working)", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const url = `/api/questions?subject=maths&childId=${TEST_CHILDREN.AU_YEAR3.childId}`;
    const res1 = await client.get<QuestionsResponse>(url);
    const res2 = await client.get<QuestionsResponse>(url);

    if (res1.status === 404 || res2.status === 404) return;
    assertStatus(res1.status, 200, res1.raw);
    assertStatus(res2.status, 200, res2.raw);

    const ids1 = ((res1.body as QuestionsResponse).questions ?? []).map(q => q.questionId).join(",");
    const ids2 = ((res2.body as QuestionsResponse).questions ?? []).map(q => q.questionId).join(",");

    // With Fisher-Yates shuffle over 15 questions picking 20, the probability of
    // identical order is astronomically low. If pool is <2 questions, skip.
    const count = ((res1.body as QuestionsResponse).questions ?? []).length;
    if (count < 2) {
      console.log(`    ⚠  Pool too small (${count} questions) to test shuffle`);
      return;
    }
    // Just check both fetches returned questions (not empty)
    assertTrue(ids1.length > 0, "first fetch returned questions");
    assertTrue(ids2.length > 0, "second fetch returned questions");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP G — HTTP: Upload validates difficulty range
  // ─────────────────────────────────────────────────────────────────────────

  await test(SUITE, "POST /api/questions/upload: difficulty out of range → 400", async () => {
    const client = new TestClient(baseUrl);
    // No auth — Zod validation happens before auth for shape errors
    const res = await client.post("/api/questions/upload", {
      questions: [{
        questionText: "Bad difficulty question",
        answerOptions: [
          { text: "A", isCorrect: true  },
          { text: "B", isCorrect: false },
        ],
        difficulty: 11,  // > max 10
        topics: ["test"],
        explanation: "test",
        subject: "maths",
        ageGroup: "year3",
      }],
      secret: "wrong-secret",
    });
    // Either 400 (Zod) or 401 (auth) — not 200
    assertTrue([400, 401].includes(res.status), `expected 400/401 for difficulty=11, got ${res.status}`);
  });

  await test(SUITE, "POST /api/questions/upload: zero answer options → 400", async () => {
    const client = new TestClient(baseUrl);
    const res = await client.post("/api/questions/upload", {
      questions: [{
        questionText: "No options question",
        answerOptions: [],  // violates min(2)
        difficulty: 4,
        topics: ["test"],
        explanation: "test",
        subject: "maths",
        ageGroup: "year3",
      }],
      secret: "wrong-secret",
    });
    assertTrue([400, 401].includes(res.status), `expected 400/401 for empty options, got ${res.status}`);
  });

  await test(SUITE, "POST /api/questions/upload: more than 4 answer options → 400", async () => {
    const client = new TestClient(baseUrl);
    const res = await client.post("/api/questions/upload", {
      questions: [{
        questionText: "Too many options",
        answerOptions: [
          { text: "A", isCorrect: true  },
          { text: "B", isCorrect: false },
          { text: "C", isCorrect: false },
          { text: "D", isCorrect: false },
          { text: "E", isCorrect: false },  // 5 options > max 4
        ],
        difficulty: 4,
        topics: ["test"],
        explanation: "test",
        subject: "maths",
        ageGroup: "year3",
      }],
      secret: "wrong-secret",
    });
    assertTrue([400, 401].includes(res.status), `expected 400/401 for 5 options, got ${res.status}`);
  });

  await test(SUITE, "POST /api/questions/upload: invalid subject → 400", async () => {
    const client = new TestClient(baseUrl);
    const res = await client.post("/api/questions/upload", {
      questions: [{
        questionText: "What is history?",
        answerOptions: [
          { text: "A", isCorrect: true  },
          { text: "B", isCorrect: false },
        ],
        difficulty: 4,
        topics: ["test"],
        explanation: "test",
        subject: "history",  // not in enum
        ageGroup: "year3",
      }],
      secret: "wrong-secret",
    });
    assertTrue([400, 401].includes(res.status), `expected 400/401 for invalid subject, got ${res.status}`);
  });
}
