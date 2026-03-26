/**
 * REPORT QUESTION TEST SUITE
 * ───────────────────────────
 * Tests: POST /api/questions/report — auth gates, validation, shape, subject/topics
 * Endpoint owned by Codex (app/api/questions/report/route.ts) but tested here
 * because report UI was wired in Claude's learn page.
 * Depends on: TEST_USERS seeded (auth), no DynamoDB question-issues table required
 * to be pre-seeded (report creates its own records).
 */

import { TestClient } from "../lib/http";
import { test, startSuite, assertStatus, assertDefined, assertTrue, assertEqual } from "../lib/assert";
import { TEST_USERS } from "../fixtures";

const SUITE = "report-question";

// Minimal valid report body
const VALID_REPORT = {
  questionId: "test-q-report-001",
  subject:    "maths" as const,
  topics:     ["addition", "test"],
  reason:     "Wrong answer marked",
  details:    "The answer A is marked correct but B is the right answer.",
};

export async function runReportQuestionSuite(baseUrl: string) {
  startSuite("07  REPORT QUESTION");

  // ── Availability check: skip entire suite if endpoint not yet deployed ────
  // This endpoint is owned by Codex and may not be on master yet.
  const probe = new TestClient(baseUrl);
  const probeRes = await probe.post("/api/questions/report", {});
  if (probeRes.status === 404) {
    console.log("    ⚠  /api/questions/report not deployed on this target — skipping suite 07");
    console.log("    ℹ  Endpoint is on Codex branch codex/rewards-kid-access, not yet merged to master");
    return;
  }

  // ── Unauthenticated → 401 ────────────────────────────────────────────────
  await test(SUITE, "POST /api/questions/report: unauthenticated → 401", async () => {
    const anon = new TestClient(baseUrl);
    const res = await anon.post("/api/questions/report", VALID_REPORT);
    assertStatus(res.status, 401, res.raw);
  });

  // ── Authenticated parent — minimal fields → 201 ──────────────────────────
  await test(SUITE, "POST /api/questions/report: parent auth, minimal body → 201 + success", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const res = await client.post<{ success?: boolean; issue?: { issueId?: string; status?: string } }>(
      "/api/questions/report",
      { questionId: "test-q-001", reason: "Wrong answer marked" }
    );
    assertStatus(res.status, 201, res.raw);
    const body = res.body as { success?: boolean; issue?: { issueId?: string; status?: string } };
    assertTrue(body.success === true, "success should be true");
    assertDefined(body.issue, "issue object should be present");
    assertDefined(body.issue?.issueId, "issueId should be set");
    assertEqual(body.issue?.status, "reported", "initial status should be 'reported'");
  });

  // ── Full report with all optional fields → 201 ───────────────────────────
  await test(SUITE, "POST /api/questions/report: all fields → 201, fields echoed back", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const res = await client.post<{ success?: boolean; issue?: Record<string, unknown> }>(
      "/api/questions/report",
      VALID_REPORT
    );
    assertStatus(res.status, 201, res.raw);
    const issue = (res.body as { issue?: Record<string, unknown> }).issue ?? {};
    assertEqual(issue.questionId, VALID_REPORT.questionId, "questionId echoed");
    assertEqual(issue.reason,     VALID_REPORT.reason,     "reason echoed");
    assertEqual(issue.subject,    VALID_REPORT.subject,    "subject echoed");
  });

  // ── Missing required field: reason → 400 (Zod) ───────────────────────────
  await test(SUITE, "POST /api/questions/report: missing reason → 400", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const res = await client.post("/api/questions/report", {
      questionId: "test-q-001",
      // reason intentionally omitted
    });
    assertStatus(res.status, 400, res.raw);
  });

  // ── Missing questionId → 400 ─────────────────────────────────────────────
  await test(SUITE, "POST /api/questions/report: missing questionId → 400", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const res = await client.post("/api/questions/report", {
      reason: "Wrong answer marked",
      // questionId intentionally omitted
    });
    assertStatus(res.status, 400, res.raw);
  });

  // ── reason too long (> 200 chars) → 400 ──────────────────────────────────
  await test(SUITE, "POST /api/questions/report: reason > 200 chars → 400", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const res = await client.post("/api/questions/report", {
      questionId: "test-q-001",
      reason: "x".repeat(201),
    });
    assertStatus(res.status, 400, res.raw);
  });

  // ── Invalid subject value → 400 ──────────────────────────────────────────
  await test(SUITE, "POST /api/questions/report: invalid subject → 400", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const res = await client.post("/api/questions/report", {
      questionId: "test-q-001",
      reason: "Wrong answer marked",
      subject: "art",  // not in enum
    });
    assertStatus(res.status, 400, res.raw);
  });

  // ── details too long (> 2000 chars) → 400 ────────────────────────────────
  await test(SUITE, "POST /api/questions/report: details > 2000 chars → 400", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const res = await client.post("/api/questions/report", {
      questionId: "test-q-001",
      reason: "Wrong answer marked",
      details: "x".repeat(2001),
    });
    assertStatus(res.status, 400, res.raw);
  });

  // ── With childId that belongs to user → 201 ──────────────────────────────
  await test(SUITE, "POST /api/questions/report: with own childId → 201", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    // Get any child that belongs to this user
    const childrenRes = await client.get<{ children?: Array<{ childId?: string }> }>("/api/children");
    const children = (childrenRes.body as { children?: Array<{ childId?: string }> }).children ?? [];
    if (!children.length) return; // no children seeded — skip

    const res = await client.post("/api/questions/report", {
      questionId: "test-q-001",
      reason:     "Wrong answer marked",
      childId:    children[0].childId,
    });
    assertStatus(res.status, 201, res.raw);
  });

  // ── Multiple country reporters are consistent ─────────────────────────────
  for (const [countryKey, user] of Object.entries(TEST_USERS) as Array<[string, typeof TEST_USERS.AU_PARENT]>) {
    await test(SUITE, `POST /api/questions/report: ${countryKey} parent → 201`, async () => {
      const client = new TestClient(baseUrl);
      await client.login(user.email, user.password);

      const res = await client.post<{ success?: boolean }>(
        "/api/questions/report",
        { questionId: `test-q-${countryKey.toLowerCase()}`, reason: "Confusing wording" }
      );
      assertStatus(res.status, 201, res.raw);
      assertTrue((res.body as { success?: boolean }).success === true, `${countryKey} report success`);
    });
  }
}
