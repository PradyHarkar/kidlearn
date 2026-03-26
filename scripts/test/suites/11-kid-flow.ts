/**
 * KID FLOW TEST SUITE
 * ────────────────────
 * Tests the product rules around kid PIN login, resume metadata,
 * and filtering reported questions out of future question sets.
 */

import { TestClient } from "../lib/http";
import { test, startSuite, assertDefined, assertEqual, assertStatus, assertTrue } from "../lib/assert";

const SUITE = "kid-flow";

async function freshChild(baseUrl: string) {
  const email = `tsunami.kidflow.${Date.now()}@kidlearn.test`;
  const password = "TestTsunami123!";
  const client = new TestClient(baseUrl);
  await client.post("/api/register", { email, password, parentName: "KidFlow", country: "AU" });
  const login = await client.login(email, password);
  if (!login.success) return null;

  const res = await client.post<{ child?: { childId?: string } }>("/api/children", {
    childName: "KidFlowChild",
    grade: "year5",
    avatar: "🧪",
  });

  const childId = (res.body as { child?: { childId?: string } }).child?.childId;
  return childId ? { client, childId, email, password } : null;
}

export async function runKidFlowSuite(baseUrl: string) {
  startSuite("11  KID FLOW");

  await test(SUITE, "POST /api/children/:childId/pin ignores biometrics and returns pin-only login", async () => {
    const ctx = await freshChild(baseUrl);
    if (!ctx) return;

    const res = await ctx.client.post<{ success?: boolean; allowedKidLoginMethods?: string[] }>(
      `/api/children/${ctx.childId}/pin`,
      { pin: "123456", allowFaceLogin: true, allowVoiceLogin: true }
    );
    assertStatus(res.status, 200, res.raw);
    assertTrue(res.body.success === true, "pin save should succeed");
    assertEqual((res.body.allowedKidLoginMethods || []).join(","), "pin", "kid login should be PIN-only");
  });

  await test(SUITE, "POST /api/progress updates lastSubject and resume metadata", async () => {
    const ctx = await freshChild(baseUrl);
    if (!ctx) return;

    await ctx.client.post(`/api/children/${ctx.childId}/pin`, { pin: "123456" });

    const submit = await ctx.client.post("/api/progress", {
      childId: ctx.childId,
      subject: "maths",
      questions: [
        { questionId: "kid-flow-q-1", correct: true, timeSpent: 4, difficulty: 6, topic: "fractions" },
      ],
    });
    assertStatus(submit.status, 200, submit.raw);

    const profile = await ctx.client.get<{ child?: { lastSubject?: string; lastSessionCompletedAt?: string } }>(
      `/api/kids/profile?childId=${ctx.childId}`
    );
    assertStatus(profile.status, 200, profile.raw);
    assertEqual((profile.body.child || {}).lastSubject, "maths", "lastSubject should reflect last completed session");
    assertDefined((profile.body.child || {}).lastSessionCompletedAt, "lastSessionCompletedAt should be set");
  });

  await test(SUITE, "POST /api/learn/session persists device-agnostic resume state", async () => {
    const ctx = await freshChild(baseUrl);
    if (!ctx) return;

    const save = await ctx.client.post("/api/learn/session", {
      childId: ctx.childId,
      subject: "maths",
      questions: [{ pk: "maths#year5#AU", questionId: "learn-resume-q-1", questionText: "1 + 1?", answerOptions: [], difficulty: 6, topics: ["addition"], explanation: "2", subject: "maths", yearLevel: "year5", createdAt: new Date().toISOString() }],
      currentIndex: 1,
      selectedAnswer: "a",
      isAnswered: true,
      results: [{ questionId: "learn-resume-q-1", correct: true, timeSpent: 5, difficulty: 6, topic: "addition" }],
      currentDifficulty: 6,
      ageGroup: "year5",
      timer: 12,
      coins: 22,
      streak: 1,
      consecutiveCorrect: 1,
      consecutiveWrong: 0,
      showHint: false,
      showExplanation: true,
      mascotMood: "happy",
      mascotMessage: "Nice work",
    });
    assertStatus(save.status, 200, save.raw);

    const otherDevice = new TestClient(baseUrl);
    const login = await otherDevice.login(ctx.email, ctx.password);
    assertTrue(login.success, login.error ?? "second-device login failed");

    const resume = await otherDevice.get<{ session?: { currentIndex?: number; timer?: number; subject?: string } }>(
      `/api/learn/session?childId=${ctx.childId}&subject=maths`
    );
    assertStatus(resume.status, 200, resume.raw);
    assertEqual(resume.body.session?.currentIndex, 1, "resume index should persist across devices");
    assertEqual(resume.body.session?.timer, 12, "resume timer should persist across devices");
    assertEqual(resume.body.session?.subject, "maths", "resume subject should persist across devices");
  });

  await test(SUITE, "POST /api/questions/report removes the question from future sets", async () => {
    const ctx = await freshChild(baseUrl);
    if (!ctx) return;

    const before = await ctx.client.get<{ questions?: Array<{ questionId?: string; topics?: string[] }> }>(
      `/api/questions?subject=maths&childId=${ctx.childId}`
    );
    assertStatus(before.status, 200, before.raw);
    const firstQuestionId = before.body.questions?.[0]?.questionId;
    const firstTopics = before.body.questions?.[0]?.topics || [];
    assertDefined(firstQuestionId, "first question should exist");

    const report = await ctx.client.post("/api/questions/report", {
      questionId: firstQuestionId,
      childId: ctx.childId,
      subject: "maths",
      topics: firstTopics,
      reason: "Wrong answer marked",
    });
    assertStatus(report.status, 201, report.raw);

    const after = await ctx.client.get<{ questions?: Array<{ questionId?: string }> }>(
      `/api/questions?subject=maths&childId=${ctx.childId}`
    );
    assertStatus(after.status, 200, after.raw);
    const afterIds = (after.body.questions || []).map((q) => q.questionId);
    assertTrue(!afterIds.includes(firstQuestionId), "reported question should be filtered out of future sets");
  });
}
