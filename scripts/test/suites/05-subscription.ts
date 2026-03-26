/**
 * SUBSCRIPTION TEST SUITE
 * ────────────────────────
 * Tests: subscription status, checkout session creation (or graceful error),
 * portal endpoint, trial detection.
 * NOTE: Full Stripe checkout can't be end-to-end tested without real Stripe keys
 * and a browser — these tests verify the API endpoints behave correctly
 * and that error messages are meaningful rather than opaque 500s.
 */

import { TestClient } from "../lib/http";
import { test, startSuite, assertDefined, assertStatus, assertTrue, assertEqual } from "../lib/assert";
import { TEST_USERS } from "../fixtures";

const SUITE = "subscription";

export async function runSubscriptionSuite(baseUrl: string) {
  startSuite("05  SUBSCRIPTION");

  // ── Status: returns trial info for newly registered user ──────────────────
  await test(SUITE, "GET /api/subscription/status: trial user → status=trial + daysRemaining", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const res = await client.get<{ status?: string; daysRemaining?: number; trialEndsAt?: string }>("/api/subscription/status");
    assertStatus(res.status, 200, res.raw);
    const body = res.body as { status?: string; daysRemaining?: number };
    assertDefined(body.status, "status");
    // Seeded user is on trial
    assertEqual(body.status, "trial", "subscription status should be trial");
    assertDefined(body.daysRemaining, "daysRemaining");
    assertTrue((body.daysRemaining ?? -1) >= 0, "daysRemaining should be >= 0");
    assertTrue((body.daysRemaining ?? -1) <= 7, "daysRemaining should be <= 7");
  });

  // ── Status: unauthenticated → 401 ────────────────────────────────────────
  await test(SUITE, "GET /api/subscription/status: unauthenticated → 401", async () => {
    const anon = new TestClient(baseUrl);
    const res = await anon.get("/api/subscription/status");
    assertStatus(res.status, 401, res.raw);
  });

  // ── Checkout: unauthenticated → 401 ─────────────────────────────────────
  await test(SUITE, "POST /api/subscription/checkout: unauthenticated → 401", async () => {
    const anon = new TestClient(baseUrl);
    const res = await anon.post("/api/subscription/checkout", { plan: "weekly" });
    assertStatus(res.status, 401, res.raw);
  });

  // ── Checkout: invalid plan → 400 ─────────────────────────────────────────
  await test(SUITE, "POST /api/subscription/checkout: invalid plan → 400", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const res = await client.post("/api/subscription/checkout", { plan: "monthly" });
    assertStatus(res.status, 400, res.raw);
  });

  // ── Checkout: valid plan — either returns url or descriptive error ─────────
  // This tests the Stripe env var issue: if STRIPE_PRICE_* not set, the error
  // should be a clear 500 with "Missing env var STRIPE_PRICE_AU_WEEKLY",
  // not an opaque crash. This test verifies the error message is readable.
  await test(SUITE, "POST /api/subscription/checkout: weekly → url (or clear env-var error, not opaque 500)", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const res = await client.post<{ url?: string; error?: string }>("/api/subscription/checkout", { plan: "weekly" });

    if (res.status === 200) {
      // Happy path: Stripe is configured — we got a checkout URL
      const url = (res.body as { url?: string }).url;
      assertDefined(url, "checkout url");
      assertTrue(typeof url === "string" && url.startsWith("https://"), "url should be a Stripe https URL");
    } else {
      // Error path: Stripe env vars missing — error message should mention Stripe
      const errMsg = (res.body as { error?: string }).error ?? res.raw;
      assertTrue(
        errMsg.toLowerCase().includes("stripe") ||
        errMsg.toLowerCase().includes("price") ||
        errMsg.toLowerCase().includes("secret_key"),
        `error should mention Stripe config, got: "${errMsg.slice(0, 200)}"`
      );
    }
  });

  // ── Portal: no stripeCustomerId → meaningful error (not crash) ────────────
  await test(SUITE, "POST /api/subscription/portal: no Stripe customer → 400 or 500 with message", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const res = await client.post<{ error?: string }>("/api/subscription/portal", {});
    // The seeded user has no stripeCustomerId — should get an error, not a crash
    assertTrue([400, 404, 500].includes(res.status), `expected 4xx/5xx, got ${res.status}`);
    assertDefined((res.body as { error?: string }).error, "error message should be present");
  });

  // ── All country checkout responses are consistent ─────────────────────────
  const countryTests = [
    { user: TEST_USERS.US_PARENT, plan: "annual"  as const },
    { user: TEST_USERS.IN_PARENT, plan: "weekly"  as const },
    { user: TEST_USERS.UK_PARENT, plan: "annual"  as const },
  ];

  for (const { user, plan } of countryTests) {
    await test(SUITE, `POST /api/subscription/checkout: ${user.country} ${plan} → consistent response shape`, async () => {
      const client = new TestClient(baseUrl);
      await client.login(user.email, user.password);
      const res = await client.post<{ url?: string; error?: string }>("/api/subscription/checkout", { plan });

      // Either a url (Stripe configured) or an error (not configured)
      // Both are valid — we just verify the shape is correct
      if (res.status === 200) {
        assertDefined((res.body as { url?: string }).url, `${user.country} checkout url`);
      } else {
        assertDefined((res.body as { error?: string }).error, `${user.country} error message`);
      }
    });
  }
}
