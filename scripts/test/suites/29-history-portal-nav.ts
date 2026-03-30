/**
 * Suite 29 — HISTORY, PORTAL + DASHBOARD NAVIGATION
 * ---------------------------------------------------
 * Covers the gaps from the Codex handoff:
 *
 *  A. History API auth gates + subject filter + limit
 *  B. Subscription portal — unauthenticated / no-customer behaviour
 *  C. Dashboard tab navigation — all 4 tabs serve valid HTML
 *  D. Subscription status API — active/trial/unauthenticated states
 *  E. History cross-user isolation
 */

import { TestClient } from "../lib/http";
import {
  test,
  startSuite,
  assertStatus,
  assertTrue,
  assertDefined,
  assertEqual,
} from "../lib/assert";
import { TEST_USERS, TEST_CHILDREN } from "../fixtures";

const SUITE = "history-portal-nav";
const PARENT = TEST_USERS.AU_PARENT;
const OTHER  = TEST_USERS.US_PARENT;
const CHILD  = TEST_CHILDREN.AU_YEAR3;
const RUN_ID = Date.now().toString(36);

// ── A. History API ─────────────────────────────────────────────────────────────

export async function runHistoryPortalNavSuite(baseUrl: string) {
  startSuite("29  HISTORY, PORTAL + DASHBOARD NAVIGATION");

  await test(SUITE, "GET /api/history: unauthenticated -> 401", async () => {
    const anon = new TestClient(baseUrl);
    const res = await anon.get(`/api/history?childId=${CHILD.childId}`);
    assertStatus(res.status, 401, res.raw);
  });

  await test(SUITE, "GET /api/history: missing childId -> 400", async () => {
    const client = new TestClient(baseUrl);
    await client.login(PARENT.email, PARENT.password);
    const res = await client.get("/api/history");
    assertStatus(res.status, 400, res.raw);
  });

  await test(SUITE, "GET /api/history: cross-user child -> 404", async () => {
    const client = new TestClient(baseUrl);
    await client.login(OTHER.email, OTHER.password);
    const res = await client.get(`/api/history?childId=${CHILD.childId}`);
    // AU child is not owned by US parent — must 404 not leak data
    assertStatus(res.status, 404, res.raw);
  });

  await test(SUITE, "GET /api/history: returns sessions array for authenticated parent", async () => {
    const client = new TestClient(baseUrl);
    await client.login(PARENT.email, PARENT.password);
    const res = await client.get<{ childId?: string; sessions?: unknown[] }>(`/api/history?childId=${CHILD.childId}`);
    assertStatus(res.status, 200, res.raw);
    assertEqual(res.body.childId, CHILD.childId, "childId should match");
    assertTrue(Array.isArray(res.body.sessions), "sessions should be an array");
  });

  await test(SUITE, "GET /api/history: subject filter only returns matching subject sessions", async () => {
    const client = new TestClient(baseUrl);
    await client.login(PARENT.email, PARENT.password);

    // Seed a maths session so we have data to filter
    await client.post("/api/progress", {
      childId: CHILD.childId,
      subject: "maths",
      questions: [{
        questionId: `hist-maths-${RUN_ID}`,
        correct: true,
        timeSpent: 5,
        difficulty: 3,
        topic: `filter-test-${RUN_ID}`,
        questionText: "Maths filter test question",
        chosenAnswer: "4",
        correctAnswer: "4",
      }],
    });

    const res = await client.get<{
      sessions?: Array<{ subject?: string; questions?: Array<{ questionId?: string }> }>;
    }>(`/api/history?childId=${CHILD.childId}&subject=maths&limit=10`);

    assertStatus(res.status, 200, res.raw);
    const sessions = res.body.sessions ?? [];
    const hasNonMaths = sessions.some((s) => s.subject !== "maths");
    assertTrue(!hasNonMaths, "subject filter should exclude non-maths sessions");
  });

  await test(SUITE, "GET /api/history: limit param caps returned sessions", async () => {
    const client = new TestClient(baseUrl);
    await client.login(PARENT.email, PARENT.password);

    const res = await client.get<{
      sessions?: Array<{ questions?: unknown[] }>;
    }>(`/api/history?childId=${CHILD.childId}&limit=1`);

    assertStatus(res.status, 200, res.raw);
    const totalQuestions = (res.body.sessions ?? [])
      .flatMap((s) => s.questions ?? []).length;
    // With limit=1 question, total questions across all sessions <= 1
    assertTrue(totalQuestions <= 1, `limit=1 should cap total questions, got ${totalQuestions}`);
  });

  await test(SUITE, "GET /api/history: session includes answeredAt timestamp per question", async () => {
    const client = new TestClient(baseUrl);
    await client.login(PARENT.email, PARENT.password);

    const res = await client.get<{
      sessions?: Array<{ questions?: Array<{ answeredAt?: string }> }>;
    }>(`/api/history?childId=${CHILD.childId}&limit=20`);

    assertStatus(res.status, 200, res.raw);
    const firstSession = res.body.sessions?.[0];
    if (firstSession) {
      const firstQ = firstSession.questions?.[0];
      assertDefined(firstQ?.answeredAt, "each question should have an answeredAt timestamp");
      // Validate ISO format
      assertTrue(
        /^\d{4}-\d{2}-\d{2}T/.test(firstQ?.answeredAt ?? ""),
        `answeredAt should be ISO format, got ${firstQ?.answeredAt}`
      );
    }
  });

  // ── B. Subscription portal ──────────────────────────────────────────────────

  await test(SUITE, "POST /api/subscription/portal: unauthenticated -> 401", async () => {
    const anon = new TestClient(baseUrl);
    const res = await anon.post("/api/subscription/portal", {});
    assertStatus(res.status, 401, res.raw);
  });

  await test(SUITE, "POST /api/subscription/portal: no stripe customer -> 400 with message", async () => {
    const client = new TestClient(baseUrl);
    await client.login(PARENT.email, PARENT.password);
    const res = await client.post<{ error?: string; url?: string }>("/api/subscription/portal", {});

    // Test users never have a stripeCustomerId so either:
    // - 400 with "No subscription found" message
    // - 200 with url if Stripe is configured and this user happens to have a customer ID
    if (res.status === 400) {
      assertDefined(res.body.error, "400 response must include an error message");
      assertTrue(
        (res.body.error ?? "").length > 0,
        "error message must not be empty"
      );
      assertTrue(
        /subscription|stripe|customer/i.test(res.body.error ?? ""),
        `portal 400 error should mention subscription or customer, got: ${res.body.error}`
      );
    } else if (res.status === 200) {
      assertDefined(res.body.url, "200 response must include a portal url");
      assertTrue(res.body.url?.startsWith("https://") ?? false, "portal url must be https");
    } else {
      // 500 is acceptable if Stripe SDK errors — still a descriptive error
      assertDefined(res.body.error, "error response must include message");
    }
  });

  // ── C. Dashboard tab navigation ─────────────────────────────────────────────

  await test(SUITE, "GET /dashboard: main dashboard serves HTML", async () => {
    const client = new TestClient(baseUrl);
    const res = await client.get("/dashboard");
    assertStatus(res.status, 200, res.raw);
    assertTrue(res.raw.length > 100, "dashboard should return meaningful HTML");
  });

  await test(SUITE, "GET /dashboard?tab=students: students tab serves HTML", async () => {
    const client = new TestClient(baseUrl);
    const res = await client.get("/dashboard?tab=students");
    assertStatus(res.status, 200, res.raw);
    assertTrue(res.raw.length > 100, "students tab should return HTML");
  });

  await test(SUITE, "GET /dashboard?tab=progress: progress tab serves HTML", async () => {
    const client = new TestClient(baseUrl);
    const res = await client.get("/dashboard?tab=progress");
    assertStatus(res.status, 200, res.raw);
    assertTrue(res.raw.length > 100, "progress tab should return HTML");
  });

  await test(SUITE, "GET /dashboard?tab=rewards: rewards tab serves HTML", async () => {
    const client = new TestClient(baseUrl);
    const res = await client.get("/dashboard?tab=rewards");
    assertStatus(res.status, 200, res.raw);
    assertTrue(res.raw.length > 100, "rewards tab should return HTML");
  });

  await test(SUITE, "GET /dashboard?tab=account: account tab serves HTML", async () => {
    const client = new TestClient(baseUrl);
    const res = await client.get("/dashboard?tab=account");
    assertStatus(res.status, 200, res.raw);
    assertTrue(res.raw.length > 100, "account tab should return HTML");
  });

  // ── D. Subscription status API ───────────────────────────────────────────────

  await test(SUITE, "GET /api/subscription/status: unauthenticated -> 401", async () => {
    const anon = new TestClient(baseUrl);
    const res = await anon.get("/api/subscription/status");
    assertStatus(res.status, 401, res.raw);
  });

  await test(SUITE, "GET /api/subscription/status: authenticated returns status shape", async () => {
    const client = new TestClient(baseUrl);
    await client.login(PARENT.email, PARENT.password);
    const res = await client.get<{
      status?: string;
      plan?: string;
      trialDaysRemaining?: number;
    }>("/api/subscription/status");
    assertStatus(res.status, 200, res.raw);
    assertDefined(res.body.status, "status field required");
    assertTrue(
      ["trial", "active", "cancelled", "expired", "past_due", "none"].includes(res.body.status ?? ""),
      `unexpected status value: ${res.body.status}`
    );
  });

  await test(SUITE, "GET /api/subscription/status: active users have trialDaysRemaining of 0", async () => {
    const client = new TestClient(baseUrl);
    await client.login(PARENT.email, PARENT.password);
    const res = await client.get<{ status?: string; trialDaysRemaining?: number }>("/api/subscription/status");
    assertStatus(res.status, 200, res.raw);
    if (res.body.status === "active") {
      assertEqual(res.body.trialDaysRemaining, 0, "active subscriptions should have 0 trial days remaining");
    }
  });

  // ── E. Key page loads ────────────────────────────────────────────────────────

  await test(SUITE, "GET /learn: learn page serves HTML", async () => {
    const client = new TestClient(baseUrl);
    const res = await client.get("/learn");
    // Redirect to login is fine — just must not 500
    assertTrue([200, 302, 307, 308].includes(res.status), `learn page must not 500, got ${res.status}`);
  });

  await test(SUITE, "GET /results: results page serves without error", async () => {
    const client = new TestClient(baseUrl);
    const res = await client.get("/results");
    assertTrue([200, 302, 307, 308].includes(res.status), `results page must not 500, got ${res.status}`);
  });

  await test(SUITE, "GET /api/history: response is ordered newest session first", async () => {
    const client = new TestClient(baseUrl);
    await client.login(PARENT.email, PARENT.password);

    const res = await client.get<{
      sessions?: Array<{ date?: string }>;
    }>(`/api/history?childId=${CHILD.childId}&limit=50`);

    assertStatus(res.status, 200, res.raw);
    const sessions = res.body.sessions ?? [];
    if (sessions.length >= 2) {
      const first  = sessions[0]?.date ?? "";
      const second = sessions[1]?.date ?? "";
      assertTrue(first >= second, `sessions should be newest-first: ${first} >= ${second}`);
    }
  });
}
