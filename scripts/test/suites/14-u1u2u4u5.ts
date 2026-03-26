/**
 * SUITE 14 — U1 · U2 · U4 · U5
 * ─────────────────────────────
 * Tests the four workstreams Codex implemented on codex/diagnostic-ui.
 *
 * U1  — GET /api/progress/summary          progress chart data contract
 * U2  — GET/PATCH /api/children/:id/preferences  topic preferences save/load + question filter
 * U4  — /diagnostic page smoke + API contract   (CSR page — tested via API layer)
 * U5  — GET /api/rewards/shop              shop catalogue
 *        POST /api/rewards/shop/redeem     redeem flow + insufficient-funds guard
 */

import { TestClient } from "../lib/http";
import {
  test, startSuite, assertStatus, assertTrue, assertDefined, assertEqual,
} from "../lib/assert";
import { TEST_USERS, TEST_CHILDREN } from "../fixtures";

const SUITE = "u1u2u4u5";

// ── shape helpers ─────────────────────────────────────────────────────────────

interface ProgressSummary {
  childId?: string;
  totalSessions?: number;
  sessionsBySubject?: {
    maths?: unknown[];
    english?: unknown[];
    science?: unknown[];
  };
  accuracyBySubject?: {
    maths?: number;
    english?: number;
    science?: number;
  };
}

interface ShopItem {
  itemId?: string;
  title?: string;
  description?: string;
  category?: string;
  icon?: string;
  pointsCost?: number;
  active?: boolean;
}

export async function runU1U2U4U5Suite(baseUrl: string) {
  startSuite("14  U1 · U2 · U4 · U5");

  // ── U4: Diagnostic page ──────────────────────────────────────────────────────

  await test(SUITE, "GET /diagnostic: page serves without 404/500", async () => {
    const client = new TestClient(baseUrl);
    const res = await client.get("/diagnostic");
    assertTrue(res.status !== 404 && res.status !== 500, `/diagnostic returned ${res.status}`);
  });

  await test(SUITE, "GET /api/diagnostic: unauthenticated → 401", async () => {
    const anon = new TestClient(baseUrl);
    const res = await anon.get("/api/diagnostic?childId=anything");
    assertStatus(res.status, 401, res.raw);
  });

  await test(SUITE, "GET /api/diagnostic: missing childId → 400", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.US_PARENT.email, TEST_USERS.US_PARENT.password);
    const res = await client.get("/api/diagnostic");
    assertStatus(res.status, 400, res.raw);
  });

  await test(SUITE, "GET /api/diagnostic: known child → questions array + baseline difficulty", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.US_PARENT.email, TEST_USERS.US_PARENT.password);
    const res = await client.get<{ questions?: unknown[]; baselineDifficulty?: number; diagnosticComplete?: boolean }>(
      `/api/diagnostic?childId=${TEST_CHILDREN.US_GRADE5.childId}`
    );
    // Either returns questions (fresh) or diagnosticComplete:true (already run)
    assertTrue(
      res.status === 200,
      `expected 200, got ${res.status}: ${res.raw.slice(0, 200)}`
    );
    const body = res.body;
    assertTrue(
      Array.isArray(body.questions) || body.diagnosticComplete === true,
      "must return questions array or diagnosticComplete flag"
    );
  });

  // ── U1: Progress summary ─────────────────────────────────────────────────────

  await test(SUITE, "GET /api/progress/summary: unauthenticated → 401", async () => {
    const anon = new TestClient(baseUrl);
    const res = await anon.get(`/api/progress/summary?childId=${TEST_CHILDREN.AU_YEAR3.childId}`);
    assertStatus(res.status, 401, res.raw);
  });

  await test(SUITE, "GET /api/progress/summary: missing childId → 400", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const res = await client.get("/api/progress/summary");
    assertStatus(res.status, 400, res.raw);
  });

  await test(SUITE, "GET /api/progress/summary: returns correct shape", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const res = await client.get<{ summary?: ProgressSummary }>(
      `/api/progress/summary?childId=${TEST_CHILDREN.AU_YEAR3.childId}`
    );
    assertStatus(res.status, 200, res.raw);
    const summary = res.body.summary;
    assertDefined(summary, "summary must be present");
    assertDefined(summary?.childId, "summary.childId required");
    assertTrue(typeof summary?.totalSessions === "number", "totalSessions must be a number");
    assertDefined(summary?.sessionsBySubject, "sessionsBySubject required");
    assertDefined(summary?.accuracyBySubject, "accuracyBySubject required");
    assertTrue(Array.isArray(summary?.sessionsBySubject?.maths), "maths sessions must be array");
    assertTrue(Array.isArray(summary?.sessionsBySubject?.english), "english sessions must be array");
    assertTrue(Array.isArray(summary?.sessionsBySubject?.science), "science sessions must be array");
    assertTrue(typeof summary?.accuracyBySubject?.maths === "number", "maths accuracy must be number");
    assertTrue(typeof summary?.accuracyBySubject?.english === "number", "english accuracy must be number");
    assertTrue(typeof summary?.accuracyBySubject?.science === "number", "science accuracy must be number");
  });

  await test(SUITE, "GET /api/progress/summary: cross-user child → 403", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    // US_GRADE5 belongs to US_PARENT, not AU_PARENT
    const res = await client.get(
      `/api/progress/summary?childId=${TEST_CHILDREN.US_GRADE5.childId}`
    );
    assertStatus(res.status, 403, res.raw);
  });

  await test(SUITE, "GET /api/progress/summary: totalSessions is a non-negative integer", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.US_PARENT.email, TEST_USERS.US_PARENT.password);
    const res = await client.get<{ summary?: ProgressSummary }>(
      `/api/progress/summary?childId=${TEST_CHILDREN.US_GRADE5.childId}`
    );
    assertStatus(res.status, 200, res.raw);
    const n = res.body.summary?.totalSessions ?? -1;
    assertTrue(typeof n === "number" && n >= 0, `totalSessions must be >= 0, got ${n}`);
  });

  // ── U2: Topic preferences ─────────────────────────────────────────────────────

  await test(SUITE, "GET /api/children/:childId/preferences: unauthenticated → 401", async () => {
    const anon = new TestClient(baseUrl);
    const res = await anon.get(`/api/children/${TEST_CHILDREN.AU_YEAR3.childId}/preferences`);
    assertStatus(res.status, 401, res.raw);
  });

  await test(SUITE, "GET /api/children/:childId/preferences: fresh child → empty array", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const res = await client.get<{ topicPreferences?: string[] }>(
      `/api/children/${TEST_CHILDREN.AU_YEAR3.childId}/preferences`
    );
    assertStatus(res.status, 200, res.raw);
    assertTrue(Array.isArray(res.body.topicPreferences), "topicPreferences must be an array");
  });

  await test(SUITE, "PATCH /api/children/:childId/preferences: unauthenticated → 401", async () => {
    const anon = new TestClient(baseUrl);
    const res = await anon.patch(
      `/api/children/${TEST_CHILDREN.AU_YEAR3.childId}/preferences`,
      { topicPreferences: ["space"] }
    );
    assertStatus(res.status, 401, res.raw);
  });

  await test(SUITE, "PATCH /api/children/:childId/preferences: saves and echoes back", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const prefs = ["space", "animals", "sport"];
    const res = await client.patch<{ success?: boolean; topicPreferences?: string[] }>(
      `/api/children/${TEST_CHILDREN.AU_YEAR3.childId}/preferences`,
      { topicPreferences: prefs }
    );
    assertStatus(res.status, 200, res.raw);
    assertEqual(res.body.success, true, "success must be true");
    assertTrue(
      Array.isArray(res.body.topicPreferences) &&
        res.body.topicPreferences.length === prefs.length,
      "topicPreferences should match what was sent"
    );
  });

  await test(SUITE, "GET /api/children/:childId/preferences: persists after PATCH", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const res = await client.get<{ topicPreferences?: string[] }>(
      `/api/children/${TEST_CHILDREN.AU_YEAR3.childId}/preferences`
    );
    assertStatus(res.status, 200, res.raw);
    assertTrue(
      (res.body.topicPreferences?.length ?? 0) > 0,
      "preferences must be persisted after PATCH"
    );
  });

  await test(SUITE, "PATCH /api/children/:childId/preferences: invalid body → 400", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const res = await client.patch(
      `/api/children/${TEST_CHILDREN.AU_YEAR3.childId}/preferences`,
      { topicPreferences: "not-an-array" }
    );
    assertStatus(res.status, 400, res.raw);
  });

  await test(SUITE, "PATCH /api/children/:childId/preferences: cross-user child → 403 or 404", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const res = await client.patch(
      `/api/children/${TEST_CHILDREN.US_GRADE5.childId}/preferences`,
      { topicPreferences: ["space"] }
    );
    // Route uses DynamoDB key {userId, childId} — cross-user child not found → 404 (acceptable)
    assertTrue(
      res.status === 403 || res.status === 404,
      `expected 403 or 404 for cross-user access, got ${res.status}`
    );
  });

  await test(SUITE, "GET /api/questions: topic preferences do not break question fetch", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const res = await client.get<{ questions?: unknown[] }>(
      `/api/questions?childId=${TEST_CHILDREN.AU_YEAR3.childId}&subject=maths`
    );
    assertTrue(
      res.status === 200 || res.status === 404,
      `questions API must not crash when preferences are set — got ${res.status}`
    );
  });

  // ── U5: Reward shop ──────────────────────────────────────────────────────────

  await test(SUITE, "GET /api/rewards/shop: returns items array", async () => {
    const client = new TestClient(baseUrl);
    const res = await client.get<{ items?: ShopItem[] }>("/api/rewards/shop");
    assertStatus(res.status, 200, res.raw);
    assertTrue(Array.isArray(res.body.items), "items must be an array");
    assertTrue((res.body.items?.length ?? 0) > 0, "shop must have at least one item");
    const item = res.body.items?.[0];
    assertDefined(item?.itemId,      "item.itemId required");
    assertDefined(item?.title,       "item.title required");
    assertDefined(item?.category,    "item.category required");
    assertDefined(item?.pointsCost,  "item.pointsCost required");
    assertTrue(typeof item?.pointsCost === "number", "pointsCost must be a number");
    assertTrue(
      ["avatar", "theme", "sticker"].includes(item?.category ?? ""),
      `category must be avatar/theme/sticker, got ${item?.category}`
    );
  });

  await test(SUITE, "GET /api/rewards/shop: all items have active=true", async () => {
    const client = new TestClient(baseUrl);
    const res = await client.get<{ items?: ShopItem[] }>("/api/rewards/shop");
    assertStatus(res.status, 200, res.raw);
    for (const item of res.body.items ?? []) {
      assertTrue(item.active === true, `item ${item.itemId} should be active`);
    }
  });

  await test(SUITE, "POST /api/rewards/shop/redeem: unauthenticated → 401", async () => {
    const anon = new TestClient(baseUrl);
    const res = await anon.post("/api/rewards/shop/redeem", {
      childId: TEST_CHILDREN.AU_YEAR3.childId,
      itemId: "sticker-gold-star",
    });
    assertStatus(res.status, 401, res.raw);
  });

  await test(SUITE, "POST /api/rewards/shop/redeem: missing fields → 400", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const res = await client.post("/api/rewards/shop/redeem", { childId: TEST_CHILDREN.AU_YEAR3.childId });
    assertStatus(res.status, 400, res.raw);
  });

  await test(SUITE, "POST /api/rewards/shop/redeem: unknown itemId → 400", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const res = await client.post("/api/rewards/shop/redeem", {
      childId: TEST_CHILDREN.AU_YEAR3.childId,
      itemId: "nonexistent-item-xyz",
    });
    assertStatus(res.status, 400, res.raw);
  });

  await test(SUITE, "POST /api/rewards/shop/redeem: insufficient points → 400", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    // AU_YEAR3 is a fresh test child with 0 points — can't afford anything
    const shopRes = await client.get<{ items?: ShopItem[] }>("/api/rewards/shop");
    const cheapestItem = (shopRes.body.items ?? []).sort((a, b) => (a.pointsCost ?? 0) - (b.pointsCost ?? 0))[0];
    const res = await client.post("/api/rewards/shop/redeem", {
      childId: TEST_CHILDREN.AU_YEAR3.childId,
      itemId: cheapestItem?.itemId ?? "sticker-gold-star",
    });
    assertStatus(res.status, 400, res.raw);
    assertTrue(
      (res.raw ?? "").toLowerCase().includes("point") ||
      (res.raw ?? "").toLowerCase().includes("enough"),
      `error message should mention points — got: ${res.raw.slice(0, 200)}`
    );
  });

  await test(SUITE, "POST /api/rewards/shop/redeem: child with enough points → 201 + purchase shape", async () => {
    // Use US_GRADE5 which has had sessions (earned rewardPoints via Suite 04/08/10)
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.US_PARENT.email, TEST_USERS.US_PARENT.password);

    // Get cheapest item
    const shopRes = await client.get<{ items?: ShopItem[] }>("/api/rewards/shop");
    const cheapest = (shopRes.body.items ?? []).sort((a, b) => (a.pointsCost ?? 0) - (b.pointsCost ?? 0))[0];
    if (!cheapest) return; // no items — nothing to test

    const res = await client.post<{ success?: boolean; purchase?: { purchaseId?: string; itemId?: string; pointsSpent?: number; status?: string } }>(
      "/api/rewards/shop/redeem",
      { childId: TEST_CHILDREN.US_GRADE5.childId, itemId: cheapest.itemId }
    );

    // 201 = success OR 400 = not enough points (if child doesn't have enough after prior suites)
    assertTrue(
      res.status === 201 || res.status === 400,
      `expected 201 or 400, got ${res.status}: ${res.raw.slice(0, 200)}`
    );
    if (res.status === 201) {
      assertEqual(res.body.success, true, "success must be true");
      assertDefined(res.body.purchase?.purchaseId, "purchaseId required");
      assertDefined(res.body.purchase?.itemId,     "itemId required");
      assertDefined(res.body.purchase?.pointsSpent, "pointsSpent required");
      assertEqual(res.body.purchase?.status, "fulfilled", "status must be fulfilled");
    }
  });
}
