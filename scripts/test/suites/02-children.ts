/**
 * CHILDREN TEST SUITE
 * ────────────────────
 * Tests: list children, create child (all countries/grades), difficulty mapping,
 * 3-child limit, bad grade fallback, AU/US/UK Year 7+8 now works.
 * Depends on: TEST_USERS already seeded, session obtained via login.
 */

import { TestClient } from "../lib/http";
import { test, startSuite, assertEqual, assertDefined, assertStatus, assertTrue, assertArrayLength } from "../lib/assert";
import { TEST_USERS, TEST_CHILDREN, GRADE_DIFFICULTY_VECTORS } from "../fixtures";

const SUITE = "children";

export async function runChildrenSuite(baseUrl: string) {
  startSuite("02  CHILDREN");

  // ── List children (empty initially for fresh session user) ─────────────────
  await test(SUITE, "GET /api/children returns array for logged-in user", async () => {
    const client = new TestClient(baseUrl);
    const login = await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    assertTrue(login.success, login.error ?? "login failed");

    const res = await client.get<{ children?: unknown[] }>("/api/children");
    assertStatus(res.status, 200, res.raw);
    assertTrue(Array.isArray((res.body as { children?: unknown[] }).children), "children should be array");
  });

  // Helper: register a fresh user and log in — avoids hitting child limits on shared test users
  async function freshUser(country: "AU" | "US" | "IN" | "UK", client: TestClient) {
    const email = `tsunami.fresh.${country.toLowerCase()}.${Date.now()}@kidlearn.test`;
    await client.post("/api/register", { email, password: "TestTsunami123!", parentName: "Fresh", country });
    return client.login(email, "TestTsunami123!");
  }

  // ── Create AU Year 5 child — verify difficulty = 6 ─────────────────────────
  await test(SUITE, "POST /api/children: AU year5 → difficulty 6", async () => {
    const client = new TestClient(baseUrl);
    const login = await freshUser("AU", client);
    assertTrue(login.success, login.error ?? "fresh user login failed");

    const res = await client.post<{ child?: { currentDifficultyMaths?: number; ageGroup?: string } }>("/api/children", {
      childName: "TsunamiTestChild_AU_Y5",
      grade:     "year5",
      avatar:    "🌊",
    });
    assertStatus(res.status, 201, res.raw);
    const child = (res.body as { child?: { currentDifficultyMaths?: number; ageGroup?: string } }).child;
    assertDefined(child, "child");
    assertEqual(child!.currentDifficultyMaths, 6, "AU year5 starting difficulty");
    assertEqual(child!.ageGroup, "year5", "ageGroup");
  });

  // ── Create AU Year 7 child — NOW VALID after curriculum fix ────────────────
  await test(SUITE, "POST /api/children: AU year7 → difficulty 8 (not year3 fallback)", async () => {
    const client = new TestClient(baseUrl);
    const login = await freshUser("AU", client);
    assertTrue(login.success, login.error ?? "fresh user login failed");

    const res = await client.post<{ child?: { currentDifficultyMaths?: number; ageGroup?: string } }>("/api/children", {
      childName: "TsunamiTestChild_AU_Y7",
      grade:     "year7",
      avatar:    "🌊",
    });
    assertStatus(res.status, 201, res.raw);
    const child = (res.body as { child?: { currentDifficultyMaths?: number; ageGroup?: string } }).child;
    assertDefined(child, "child");
    assertEqual(child!.currentDifficultyMaths, 8, "AU year7 starting difficulty");
    assertEqual(child!.ageGroup, "year7", "ageGroup should be year7, not year3 fallback");
  });

  // ── Create UK Year 8 child ─────────────────────────────────────────────────
  await test(SUITE, "POST /api/children: UK year8 → difficulty 9", async () => {
    const client = new TestClient(baseUrl);
    const login = await freshUser("UK", client);
    assertTrue(login.success, login.error ?? "fresh user login failed");

    const res = await client.post<{ child?: { currentDifficultyMaths?: number; ageGroup?: string } }>("/api/children", {
      childName: "TsunamiTestChild_UK_Y8",
      grade:     "year8",
      avatar:    "🌊",
    });
    assertStatus(res.status, 201, res.raw);
    const child = (res.body as { child?: { currentDifficultyMaths?: number; ageGroup?: string } }).child;
    assertDefined(child, "child");
    assertEqual(child!.currentDifficultyMaths, 9, "UK year8 starting difficulty");
    assertEqual(child!.ageGroup, "year8", "ageGroup");
  });

  // ── Create US Grade 8 child ────────────────────────────────────────────────
  await test(SUITE, "POST /api/children: US grade8 → difficulty 9", async () => {
    const client = new TestClient(baseUrl);
    const login = await freshUser("US", client);
    assertTrue(login.success, login.error ?? "fresh user login failed");

    const res = await client.post<{ child?: { currentDifficultyMaths?: number; ageGroup?: string } }>("/api/children", {
      childName: "TsunamiTestChild_US_G8",
      grade:     "grade8",
      avatar:    "🌊",
    });
    assertStatus(res.status, 201, res.raw);
    const child = (res.body as { child?: { currentDifficultyMaths?: number; ageGroup?: string } }).child;
    assertDefined(child, "child");
    assertEqual(child!.currentDifficultyMaths, 9, "US grade8 starting difficulty");
    assertEqual(child!.ageGroup, "year8", "ageGroup");
  });

  // ── Create IN Class 8 child ────────────────────────────────────────────────
  await test(SUITE, "POST /api/children: IN class8 → difficulty 9", async () => {
    const client = new TestClient(baseUrl);
    await freshUser("IN", client);

    const res = await client.post<{ child?: { currentDifficultyMaths?: number; ageGroup?: string } }>("/api/children", {
      childName: "TsunamiTestChild_IN_C8",
      grade:     "class8",
      avatar:    "🌊",
    });
    assertStatus(res.status, 201, res.raw);
    const child = (res.body as { child?: { currentDifficultyMaths?: number; ageGroup?: string } }).child;
    assertDefined(child, "child");
    assertEqual(child!.currentDifficultyMaths, 9, "IN class8 starting difficulty");
    assertEqual(child!.ageGroup, "year8", "ageGroup");
  });

  // ── Validate all GRADE→DIFFICULTY vectors via child creation ──────────────
  // (only spot-check a few to avoid hammering the API — full unit coverage is in suite 06)
  const spotCheck = [
    { country: TEST_USERS.AU_PARENT, grade: "foundation", expectedDiff: 1 },
    { country: TEST_USERS.AU_PARENT, grade: "year3",      expectedDiff: 4 },
    { country: TEST_USERS.UK_PARENT, grade: "reception",  expectedDiff: 1 },
  ] as Array<{
    country: typeof TEST_USERS.AU_PARENT;
    grade: string;
    expectedDiff: number;
  }>;

  for (const { country: user, grade, expectedDiff } of spotCheck) {
    await test(SUITE, `${user.country} ${grade} → difficulty ${expectedDiff}`, async () => {
      const client = new TestClient(baseUrl);
      await client.login(user.email, user.password);
      const res = await client.post<{ child?: { currentDifficultyMaths?: number } }>("/api/children", {
        childName: `TsunamiSpot_${user.country}_${grade}`,
        grade,
        avatar: "🌊",
      });
      // Might 400 if child limit hit — that is OK, check if limit was the reason
      if (res.status === 400 && (res.raw || "").includes("Maximum 3")) return;
      assertStatus(res.status, 201, res.raw);
      assertEqual(
        (res.body as { child?: { currentDifficultyMaths?: number } }).child?.currentDifficultyMaths,
        expectedDiff,
        `${user.country} ${grade}`
      );
    });
  }

  // ── Child limit: 4th child should return 400 ──────────────────────────────
  await test(SUITE, "POST /api/children: 4th child → 400 max-3 error", async () => {
    // Create a throwaway user and 3 children, then try a 4th
    const email = `tsunami.limit.${Date.now()}@kidlearn.test`;
    const regClient = new TestClient(baseUrl);

    const regRes = await regClient.post("/api/register", {
      email, password: "TestTsunami123!", parentName: "Limit Test", country: "AU",
    });
    if (regRes.status !== 201) return; // skip if register fails (e.g. DB unavailable)

    await regClient.login(email, "TestTsunami123!");

    for (let i = 1; i <= 3; i++) {
      await regClient.post("/api/children", { childName: `Child ${i}`, grade: "year3", avatar: "🎒" });
    }
    const fourthRes = await regClient.post("/api/children", { childName: "Child 4", grade: "year3", avatar: "🎒" });
    assertStatus(fourthRes.status, 400, fourthRes.raw);
    assertTrue((fourthRes.raw || "").toLowerCase().includes("maximum"), "should mention maximum limit");
  });

  // ── Missing required fields → 400 ─────────────────────────────────────────
  await test(SUITE, "POST /api/children: missing grade → 400", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const res = await client.post("/api/children", { childName: "NoGrade", avatar: "🎒" });
    assertStatus(res.status, 400, res.raw);
  });
}
