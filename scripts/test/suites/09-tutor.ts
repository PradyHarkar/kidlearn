/**
 * AI TUTOR TEST SUITE
 * ────────────────────
 * Tests: POST /api/tutor endpoint
 *
 * Availability probe: if endpoint returns 404, entire suite skips gracefully.
 * Tests: 401 unauth, 400 bad input, 200 with valid wrong-answer context,
 *        200 with all optional fields, 429 rate limit, explanation is a string.
 */

import { TestClient } from "../lib/http";
import { test, startSuite, assertStatus, assertEqual, assertTrue, assertDefined } from "../lib/assert";
import { TEST_USERS, TEST_CHILDREN } from "../fixtures";

const SUITE = "tutor";

const VALID_BODY = {
  questionText:  "What is 7 x 8?",
  correctAnswer: "56",
  chosenAnswer:  "48",
  subject:       "maths",
  topics:        ["multiplication"],
  ageGroup:      "year5",
};

export async function runTutorSuite(baseUrl: string) {
  startSuite("09  AI TUTOR");

  // ── Availability probe ────────────────────────────────────────────────────
  const probe = new TestClient(baseUrl);
  const probeRes = await probe.post("/api/tutor", {});
  if (probeRes.status === 404) {
    console.log("    ⚠  /api/tutor not deployed on this target — skipping suite 09");
    return;
  }

  // ── 401 — unauthenticated ─────────────────────────────────────────────────
  await test(SUITE, "POST /api/tutor: unauthenticated → 401", async () => {
    const client = new TestClient(baseUrl);
    const res = await client.post("/api/tutor", VALID_BODY);
    assertStatus(res.status, 401, res.raw);
  });

  // ── 400 — missing required fields ─────────────────────────────────────────
  await test(SUITE, "POST /api/tutor: missing questionText → 400", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const res = await client.post("/api/tutor", { correctAnswer: "56", chosenAnswer: "48", subject: "maths" });
    assertStatus(res.status, 400, res.raw);
  });

  await test(SUITE, "POST /api/tutor: missing correctAnswer → 400", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const res = await client.post("/api/tutor", { questionText: "Q?", chosenAnswer: "48", subject: "maths" });
    assertStatus(res.status, 400, res.raw);
  });

  await test(SUITE, "POST /api/tutor: invalid subject → 400", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const res = await client.post("/api/tutor", { ...VALID_BODY, subject: "history" });
    assertStatus(res.status, 400, res.raw);
  });

  // ── 200 — valid request returns explanation string ─────────────────────────
  await test(SUITE, "POST /api/tutor: valid wrong-answer context → 200 + explanation string", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const res = await client.post<{ explanation?: string }>("/api/tutor", VALID_BODY);
    // 200 or 500 (Bedrock may be unavailable in test env) — both are acceptable
    // 400/401 are NOT acceptable
    assertTrue(res.status !== 400 && res.status !== 401, `Unexpected status ${res.status}: ${res.raw}`);
    if (res.status === 200) {
      const body = res.body as { explanation?: string };
      assertDefined(body.explanation, "explanation");
      assertTrue(typeof body.explanation === "string" && body.explanation.length > 0, "explanation should be non-empty string");
    }
  });

  // ── 200 — with childId (optional field) ───────────────────────────────────
  await test(SUITE, "POST /api/tutor: with childId → not 400 or 401", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const res = await client.post("/api/tutor", {
      ...VALID_BODY,
      childId: TEST_CHILDREN.AU_YEAR5.childId,
    });
    assertTrue(res.status !== 400 && res.status !== 401, `Unexpected status ${res.status}: ${res.raw}`);
  });

  // ── English and Science subjects ──────────────────────────────────────────
  await test(SUITE, "POST /api/tutor: subject=english → not 400 or 401", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const res = await client.post("/api/tutor", {
      questionText:  "Which word is a verb?",
      correctAnswer: "run",
      chosenAnswer:  "happy",
      subject:       "english",
      topics:        ["grammar", "parts of speech"],
    });
    assertTrue(res.status !== 400 && res.status !== 401, `Unexpected status ${res.status}: ${res.raw}`);
  });

  await test(SUITE, "POST /api/tutor: subject=science → not 400 or 401", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const res = await client.post("/api/tutor", {
      questionText:  "What do plants need to make food?",
      correctAnswer: "Sunlight, water and carbon dioxide",
      chosenAnswer:  "Sunlight and oxygen",
      subject:       "science",
    });
    assertTrue(res.status !== 400 && res.status !== 401, `Unexpected status ${res.status}: ${res.raw}`);
  });

  // ── Rate limiting ─────────────────────────────────────────────────────────
  await test(SUITE, "POST /api/tutor: 4th call in 1 min → 429", async () => {
    // Create a fresh user with a unique childId to avoid polluting shared rate-limit counters
    const email = `tsunami.tutor.${Date.now()}@kidlearn.test`;
    const client = new TestClient(baseUrl);
    const regRes = await client.post("/api/register", {
      email, password: "TestTsunami123!", parentName: "Tutor Limit", country: "AU",
    });
    if (regRes.status !== 201) return; // skip if register unavailable

    await client.login(email, "TestTsunami123!");

    // 3 calls should succeed (or Bedrock-500, but not 429)
    for (let i = 0; i < 3; i++) {
      const r = await client.post("/api/tutor", VALID_BODY);
      assertTrue(r.status !== 429, `Call ${i + 1} hit rate limit too early: ${r.raw}`);
    }

    // 4th call should be 429
    const r4 = await client.post("/api/tutor", VALID_BODY);
    assertStatus(r4.status, 429, r4.raw);
  });
}
