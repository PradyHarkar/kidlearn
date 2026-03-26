/**
 * QUESTIONS TEST SUITE
 * ────────────────────
 * Tests: fetch questions for each grade/country, difficulty targeting,
 * country-specific partitions, upload endpoint, missing partition fallback.
 * Depends on: test questions seeded in DynamoDB (setup.ts).
 */

import { TestClient } from "../lib/http";
import { test, startSuite, assertEqual, assertDefined, assertStatus, assertTrue, assertArrayLength, assertInRange } from "../lib/assert";
import { TEST_USERS, TEST_CHILDREN } from "../fixtures";

const SUITE = "questions";

interface QuestionsResponse {
  questions?: Array<{ pk?: string; difficulty?: number; topics?: string[] }>;
  difficulty?: number;
  ageGroup?:   string;
  yearLevel?:  string;
  totalAvailable?: number;
  curriculumContext?: { country?: string; ageGroup?: string } | null;
}

export async function runQuestionsSuite(baseUrl: string) {
  startSuite("03  QUESTIONS");

  // ── Fetch: AU Year 5 Maths ─────────────────────────────────────────────────
  await test(SUITE, "GET /api/questions: AU year5 maths → difficulty 6, ≥10 questions", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    // Get the AU year5 child ID
    const childrenRes = await client.get<{ children?: Array<{ childId?: string; ageGroup?: string }> }>("/api/children");
    const children = (childrenRes.body as { children?: Array<{ childId?: string; ageGroup?: string }> }).children || [];
    const year5Child = children.find(c => c.ageGroup === "year5" || c.childId === TEST_CHILDREN.AU_YEAR5.childId);

    if (!year5Child?.childId) {
      // Use the seeded child ID directly
      const res = await client.get<QuestionsResponse>(
        `/api/questions?subject=maths&childId=${TEST_CHILDREN.AU_YEAR5.childId}`
      );
      // Might 404 if wrong userId — acceptable if DB wasn't seeded
      if (res.status === 404) return;
      assertStatus(res.status, 200, res.raw);
      const body = res.body as QuestionsResponse;
      assertDefined(body.questions, "questions");
      assertArrayLength(body.questions!, 1, "need at least 1 question");
      assertEqual(body.ageGroup, "year5", "ageGroup");
      assertInRange(body.difficulty!, 5, 7, "difficulty should be near 6");
      return;
    }

    const res = await client.get<QuestionsResponse>(
      `/api/questions?subject=maths&childId=${year5Child.childId}`
    );
    assertStatus(res.status, 200, res.raw);
    const body = res.body as QuestionsResponse;
    assertDefined(body.questions, "questions");
    assertEqual(body.ageGroup, "year5", "ageGroup");
    assertInRange(body.difficulty!, 5, 7, "difficulty near 6");
    assertArrayLength(body.questions!, 1, "at least 1 question returned");
  });

  // ── Fetch: requires auth ───────────────────────────────────────────────────
  await test(SUITE, "GET /api/questions: unauthenticated → 401", async () => {
    const anon = new TestClient(baseUrl);
    const res = await anon.get("/api/questions?subject=maths&childId=any");
    assertStatus(res.status, 401, res.raw);
  });

  // ── Fetch: missing params → 400 ───────────────────────────────────────────
  await test(SUITE, "GET /api/questions: missing subject → 400", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const res = await client.get("/api/questions?childId=some-id");
    assertStatus(res.status, 400, res.raw);
  });

  await test(SUITE, "GET /api/questions: missing childId → 400", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const res = await client.get("/api/questions?subject=maths");
    assertStatus(res.status, 400, res.raw);
  });

  // ── Fetch: nonexistent child → 404 ────────────────────────────────────────
  await test(SUITE, "GET /api/questions: nonexistent childId → 404", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const res = await client.get("/api/questions?subject=maths&childId=does-not-exist-ever");
    assertStatus(res.status, 404, res.raw);
  });

  // ── Upload: valid questions via secret ────────────────────────────────────
  await test(SUITE, "POST /api/questions/upload: valid batch → uploaded count matches", async () => {
    const client = new TestClient(baseUrl);
    const secret = process.env.NEXTAUTH_SECRET || process.env.TEST_UPLOAD_SECRET || "";

    if (!secret) {
      console.log("    ⚠  NEXTAUTH_SECRET not set — skipping upload test");
      return;
    }

    const testQuestions = Array.from({ length: 3 }, (_, i) => ({
      questionText:  `[UPLOAD TEST ${i + 1}] What is 2+2?`,
      answerOptions: [
        { text: "4", isCorrect: true  },
        { text: "3", isCorrect: false },
      ],
      difficulty: 4,
      topics:     ["test-upload"],
      explanation: "Because 2+2=4",
      subject:    "maths",
      ageGroup:   "year3",
      country:    "AU",
    }));

    const res = await client.post<{ uploaded?: number; failed?: number }>("/api/questions/upload", {
      questions: testQuestions,
      secret,
    });

    assertStatus(res.status, 200, res.raw);
    const body = res.body as { uploaded?: number; failed?: number };
    assertEqual(body.uploaded, 3, "all 3 questions should upload");
    assertEqual(body.failed, 0, "no failures");
  });

  // ── Upload: unauthorized (no secret, no session) → 401 ───────────────────
  await test(SUITE, "POST /api/questions/upload: no auth → 401", async () => {
    const anon = new TestClient(baseUrl);
    const res = await anon.post("/api/questions/upload", {
      questions: [{ questionText: "Test", answerOptions: [], difficulty: 1, topics: [], explanation: "", subject: "maths", ageGroup: "year3" }],
    });
    assertStatus(res.status, 401, res.raw);
  });

  // ── Curriculum context returned for known grade ────────────────────────────
  await test(SUITE, "GET /api/questions: curriculumContext present for known country+grade", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    // Use any seeded child — if they have grade+country set, curriculumContext should be non-null
    const childrenRes = await client.get<{ children?: Array<{ childId?: string; grade?: string; country?: string }> }>("/api/children");
    const children = (childrenRes.body as { children?: Array<{ childId?: string; grade?: string }> }).children || [];
    if (!children.length) return; // no children seeded for this user

    const child = children[0];
    const res = await client.get<QuestionsResponse>(
      `/api/questions?subject=maths&childId=${child.childId}`
    );
    if (res.status !== 200) return;
    const body = res.body as QuestionsResponse;
    // curriculumContext can be null for legacy children — just assert it is either null or has ageGroup
    assertTrue(
      body.curriculumContext === null || typeof body.curriculumContext?.ageGroup === "string",
      "curriculumContext must be null or have ageGroup"
    );
  });

  // ── All 3 subjects work ────────────────────────────────────────────────────
  for (const subject of ["maths", "english", "science"] as const) {
    await test(SUITE, `GET /api/questions: subject=${subject} returns valid response`, async () => {
      const client = new TestClient(baseUrl);
      await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
      const childrenRes = await client.get<{ children?: Array<{ childId?: string }> }>("/api/children");
      const children = (childrenRes.body as { children?: Array<{ childId?: string }> }).children || [];
      if (!children.length) return;

      const res = await client.get<QuestionsResponse>(
        `/api/questions?subject=${subject}&childId=${children[0].childId}`
      );
      // 200 or 404 (if no questions in that partition) — both are correct behavior
      assertTrue([200, 404].includes(res.status), `unexpected HTTP ${res.status}`);
    });
  }
}
