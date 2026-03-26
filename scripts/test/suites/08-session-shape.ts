/**
 * SESSION SHAPE TEST SUITE
 * ─────────────────────────
 * Tests: POST /api/progress result shape required by the Results page UI
 *
 * The Results page reads result.childId, result.subject, result.rewardPointsEarned,
 * result.totalQuestions for:
 *   - "Next 20 Questions" routing → /learn?child={childId}&subject={subject}
 *   - Reward points banner → "You earned N pts"
 *   - Points formula check → 1pt per question answered
 *
 * Also verifies 20-question session returns rewardPointsEarned=20 (the core
 * product requirement: "20 questions completed = 20 points earned").
 */

import { TestClient } from "../lib/http";
import { test, startSuite, assertEqual, assertDefined, assertStatus, assertTrue } from "../lib/assert";
import { TEST_USERS } from "../fixtures";

const SUITE = "session-shape";

interface ProgressResult {
  success?: boolean;
  sessionId?: string;
  result?: {
    sessionId?: string;
    childId?: string;
    subject?: string;
    yearLevel?: string;
    totalQuestions?: number;
    correct?: number;
    incorrect?: number;
    accuracy?: number;
    rewardPointsEarned?: number;
    coinsEarned?: number;
    starsEarned?: number;
    difficultyStart?: number;
    difficultyEnd?: number;
    duration?: number;
    yearLevelAdvanced?: boolean;
  };
}

function makeAnswers(correct: number, total: number, difficulty = 4) {
  return Array.from({ length: total }, (_, i) => ({
    questionId: `shape-q-${i + 1}`,
    correct:    i < correct,
    timeSpent:  2000,
    difficulty,
    topic:      "test-topic",
  }));
}

async function freshChild(baseUrl: string) {
  const email = `tsunami.shape.${Date.now()}@kidlearn.test`;
  const client = new TestClient(baseUrl);
  await client.post("/api/register", { email, password: "TestTsunami123!", parentName: "Shape", country: "AU" });
  const login = await client.login(email, "TestTsunami123!");
  if (!login.success) return null;

  const res = await client.post<{ child?: { childId?: string } }>("/api/children", {
    childName: "ShapeChild",
    grade:     "year3",
    avatar:    "🌊",
  });
  const childId = (res.body as { child?: { childId?: string } }).child?.childId;
  return childId ? { client, childId } : null;
}

export async function runSessionShapeSuite(baseUrl: string) {
  startSuite("08  SESSION SHAPE (results page contract)");

  // ── Result contains childId ──────────────────────────────────────────────
  await test(SUITE, "POST /api/progress result.childId is present (needed for Next 20 routing)", async () => {
    const ctx = await freshChild(baseUrl);
    if (!ctx) { console.log("    ⚠  Could not create child, skipping"); return; }

    const res = await ctx.client.post<ProgressResult>("/api/progress", {
      childId: ctx.childId,
      subject: "maths",
      questions: makeAnswers(5, 10),
    });
    assertStatus(res.status, 200, res.raw);
    const r = (res.body as ProgressResult).result;
    assertDefined(r, "result");
    assertDefined(r!.childId, "result.childId (needed by results page for Next 20 routing)");
    assertEqual(r!.childId, ctx.childId, "childId matches submitted childId");
  });

  // ── Result contains subject ──────────────────────────────────────────────
  await test(SUITE, "POST /api/progress result.subject is present (needed for Next 20 routing)", async () => {
    const ctx = await freshChild(baseUrl);
    if (!ctx) return;

    const res = await ctx.client.post<ProgressResult>("/api/progress", {
      childId: ctx.childId,
      subject: "maths",
      questions: makeAnswers(5, 10),
    });
    assertStatus(res.status, 200, res.raw);
    const r = (res.body as ProgressResult).result;
    assertDefined(r!.subject, "result.subject (needed by results page for Next 20 routing)");
    assertEqual(r!.subject, "maths", "subject matches submitted subject");
  });

  // ── rewardPointsEarned = totalQuestions (1pt per question) ───────────────
  await test(SUITE, "POST /api/progress: rewardPointsEarned === totalQuestions (1pt per Q)", async () => {
    const ctx = await freshChild(baseUrl);
    if (!ctx) return;

    const questionCount = 10;
    const res = await ctx.client.post<ProgressResult>("/api/progress", {
      childId: ctx.childId,
      subject: "maths",
      questions: makeAnswers(7, questionCount),
    });
    assertStatus(res.status, 200, res.raw);
    const r = (res.body as ProgressResult).result!;
    assertDefined(r.rewardPointsEarned, "rewardPointsEarned should be in result");
    assertEqual(r.totalQuestions, questionCount, "totalQuestions matches submitted count");
    assertEqual(r.rewardPointsEarned, questionCount, "rewardPointsEarned = totalQuestions (1pt per Q)");
  });

  // ── 20-question session → rewardPointsEarned = 20 ────────────────────────
  await test(SUITE, "POST /api/progress: 20-question session → rewardPointsEarned = 20", async () => {
    const ctx = await freshChild(baseUrl);
    if (!ctx) return;

    const res = await ctx.client.post<ProgressResult>("/api/progress", {
      childId: ctx.childId,
      subject: "maths",
      questions: makeAnswers(14, 20, 4),   // 14/20 correct (70%)
    });
    assertStatus(res.status, 200, res.raw);
    const r = (res.body as ProgressResult).result!;
    assertEqual(r.totalQuestions, 20, "20 questions submitted");
    assertEqual(r.rewardPointsEarned, 20, "20-question session = 20 reward points");
  });

  // ── All subjects return rewardPointsEarned ────────────────────────────────
  for (const subject of ["maths", "english", "science"] as const) {
    await test(SUITE, `POST /api/progress: subject=${subject} → rewardPointsEarned present`, async () => {
      const ctx = await freshChild(baseUrl);
      if (!ctx) return;

      const res = await ctx.client.post<ProgressResult>("/api/progress", {
        childId: ctx.childId,
        subject,
        questions: makeAnswers(5, 5),
      });
      assertStatus(res.status, 200, res.raw);
      assertDefined((res.body as ProgressResult).result?.rewardPointsEarned, `${subject} rewardPointsEarned`);
    });
  }

  // ── Result shape completeness: all fields needed by UI ───────────────────
  await test(SUITE, "POST /api/progress result has all fields required by results page", async () => {
    const ctx = await freshChild(baseUrl);
    if (!ctx) return;

    const res = await ctx.client.post<ProgressResult>("/api/progress", {
      childId: ctx.childId,
      subject: "maths",
      questions: makeAnswers(8, 10, 5),
    });
    assertStatus(res.status, 200, res.raw);
    const r = (res.body as ProgressResult).result!;

    // Fields the results page directly reads
    assertDefined(r.childId,            "childId");
    assertDefined(r.subject,            "subject");
    assertDefined(r.totalQuestions,     "totalQuestions");
    assertDefined(r.correct,            "correct");
    assertDefined(r.incorrect,          "incorrect");
    assertDefined(r.accuracy,           "accuracy");
    assertDefined(r.rewardPointsEarned, "rewardPointsEarned");
    assertDefined(r.coinsEarned,        "coinsEarned");
    assertDefined(r.starsEarned,        "starsEarned");
    assertDefined(r.difficultyStart,    "difficultyStart");
    assertDefined(r.difficultyEnd,      "difficultyEnd");
    assertDefined(r.duration,           "duration");
    assertTrue(typeof r.yearLevelAdvanced === "boolean", "yearLevelAdvanced is boolean");
    assertDefined(r.yearLevel,          "yearLevel");
  });

  // ── correct + incorrect = totalQuestions (no orphan answers) ─────────────
  await test(SUITE, "POST /api/progress: correct + incorrect = totalQuestions", async () => {
    const ctx = await freshChild(baseUrl);
    if (!ctx) return;

    const total = 10, correctCount = 7;
    const res = await ctx.client.post<ProgressResult>("/api/progress", {
      childId: ctx.childId,
      subject: "maths",
      questions: makeAnswers(correctCount, total),
    });
    assertStatus(res.status, 200, res.raw);
    const r = (res.body as ProgressResult).result!;
    assertEqual(
      (r.correct ?? 0) + (r.incorrect ?? 0),
      total,
      `correct(${r.correct}) + incorrect(${r.incorrect}) should = ${total}`
    );
    assertEqual(r.correct, correctCount, "correct count");
    assertEqual(r.incorrect, total - correctCount, "incorrect count");
  });
}
