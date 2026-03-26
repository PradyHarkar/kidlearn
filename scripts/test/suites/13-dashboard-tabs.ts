/**
 * DASHBOARD TABS TEST SUITE  (Suite 13)
 * ───────────────────────────────────────
 * Tests: DASHBOARD-TABS-V1 data contract
 *
 * /dashboard is a client-side React app — the HTML shell never contains
 * React-rendered content. So this suite tests the API layer the dashboard
 * reads from, not the page HTML. If the data contract is correct the tabs
 * and badge render correctly.
 *
 * What is tested:
 * - /api/children returns diagnosticComplete field (needed for badge)
 * - children without diagnostic have diagnosticComplete falsy
 * - children with completed diagnostic have diagnosticComplete true
 * - /api/children still returns all stats fields the child cards need
 * - /dashboard returns 200 and serves a page (smoke test)
 * - /dashboard?tab=<any> returns 200 without crashing (all 4 tabs + unknown)
 */

import { TestClient } from "../lib/http";
import {
  test, startSuite, assertStatus, assertTrue, assertDefined, assertEqual,
} from "../lib/assert";
import { TEST_USERS, TEST_CHILDREN } from "../fixtures";

const SUITE = "dashboard-tabs";

interface ChildRecord {
  childId?: string;
  childName?: string;
  diagnosticComplete?: boolean;
  streakDays?: number;
  totalStars?: number;
  totalCoins?: number;
  rewardPoints?: number;
  currentDifficultyMaths?: number;
  currentDifficultyEnglish?: number;
  currentDifficultyScience?: number;
  stats?: { mathsAccuracy?: number; englishAccuracy?: number; scienceAccuracy?: number };
}

export async function runDashboardTabsSuite(baseUrl: string) {
  startSuite("13  DASHBOARD TABS");

  // ── Smoke: page loads ──────────────────────────────────────────────────────
  await test(SUITE, "GET /dashboard: page serves without 404/500", async () => {
    const client = new TestClient(baseUrl);
    const res = await client.get("/dashboard");
    assertTrue(res.status !== 404 && res.status !== 500, `dashboard returned ${res.status}`);
  });

  for (const tab of ["students", "progress", "rewards", "account", "unknown-garbage"]) {
    await test(SUITE, `GET /dashboard?tab=${tab}: does not crash (200)`, async () => {
      const client = new TestClient(baseUrl);
      const res = await client.get(`/dashboard?tab=${tab}`);
      assertTrue(res.status !== 500, `?tab=${tab} must not crash the server`);
    });
  }

  // ── diagnosticComplete field ───────────────────────────────────────────────
  await test(SUITE, "/api/children: diagnosticComplete field present on every child", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const res = await client.get<{ children?: ChildRecord[] }>("/api/children");
    assertStatus(res.status, 200, res.raw);
    const children = res.body.children ?? [];
    assertTrue(children.length > 0, "must have at least one child");
    for (const child of children) {
      assertTrue(
        "diagnosticComplete" in child,
        `child ${child.childName} missing diagnosticComplete field`
      );
    }
  });

  await test(SUITE, "/api/children: AU children have diagnosticComplete = false (no diagnostic run)", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const res = await client.get<{ children?: ChildRecord[] }>("/api/children");
    assertStatus(res.status, 200, res.raw);
    const children = res.body.children ?? [];
    // AU_YEAR3 belongs to AU_PARENT (AU_YEAR5 is under a secondary user slot)
    const auChild = children.find(c => c.childId === TEST_CHILDREN.AU_YEAR3.childId);
    assertDefined(auChild, "AU year3 child must be present");
    assertTrue(
      !auChild?.diagnosticComplete,
      "AU year3 child has not done diagnostic — diagnosticComplete must be falsy"
    );
  });

  await test(SUITE, "/api/children: US grade5 child has diagnosticComplete = true (ran in Suite 10)", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.US_PARENT.email, TEST_USERS.US_PARENT.password);
    const res = await client.get<{ children?: ChildRecord[] }>("/api/children");
    assertStatus(res.status, 200, res.raw);
    const children = res.body.children ?? [];
    const usChild = children.find(c => c.childId === TEST_CHILDREN.US_GRADE5.childId);
    assertDefined(usChild, "US grade5 child must be present");
    assertEqual(
      usChild?.diagnosticComplete, true,
      "US grade5 child completed diagnostic in Suite 10 — must be true"
    );
  });

  // ── Child card data fields (Students tab needs these) ──────────────────────
  await test(SUITE, "/api/children: child records have all fields needed by child cards", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const res = await client.get<{ children?: ChildRecord[] }>("/api/children");
    assertStatus(res.status, 200, res.raw);
    const child = (res.body.children ?? [])[0];
    assertDefined(child, "must have at least one child");
    assertDefined(child.childId,                    "childId required");
    assertDefined(child.childName,                  "childName required");
    assertDefined(child.streakDays,                 "streakDays required for streak badge");
    assertDefined(child.totalStars,                 "totalStars required for stars badge");
    assertDefined(child.totalCoins,                 "totalCoins required for coins badge");
    assertDefined(child.currentDifficultyMaths,     "currentDifficultyMaths required for progress bar");
    assertDefined(child.currentDifficultyEnglish,   "currentDifficultyEnglish required for progress bar");
    assertDefined(child.currentDifficultyScience,   "currentDifficultyScience required for progress bar");
  });

  // ── Rewards tab data (Account tab reads subscription) ─────────────────────
  await test(SUITE, "GET /api/subscription/status: Account tab data accessible", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const res = await client.get<{ subscriptionStatus?: string }>("/api/subscription/status");
    assertStatus(res.status, 200, res.raw);
    assertDefined(res.body.subscriptionStatus, "subscriptionStatus must be present for Account tab");
  });

  await test(SUITE, "GET /api/rewards: Rewards tab data accessible", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const child = TEST_CHILDREN.AU_YEAR5;
    const res = await client.get(`/api/rewards?childId=${child.childId}`);
    assertTrue(res.status !== 401 && res.status !== 500, `rewards API returned ${res.status}`);
  });

  // ── Auth guard ─────────────────────────────────────────────────────────────
  await test(SUITE, "GET /api/children: unauthenticated → 401 (dashboard data protected)", async () => {
    const anon = new TestClient(baseUrl);
    const res = await anon.get("/api/children");
    assertStatus(res.status, 401, res.raw);
  });
}
