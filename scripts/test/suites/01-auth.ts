/**
 * AUTH TEST SUITE
 * ───────────────
 * Tests: register, login, session, bad credentials, duplicate email, logout.
 * Depends on: TEST_USERS.AU_PARENT already seeded in DynamoDB.
 */

import { TestClient } from "../lib/http";
import { test, startSuite, assertEqual, assertDefined, assertStatus, assertTrue } from "../lib/assert";
import { TEST_USERS } from "../fixtures";

const SUITE = "auth";

export async function runAuthSuite(baseUrl: string) {
  const client = new TestClient(baseUrl);
  startSuite("01  AUTH");

  // ── CSRF token endpoint is accessible ─────────────────────────────────────
  await test(SUITE, "GET /api/auth/csrf returns csrfToken", async () => {
    const res = await client.get<{ csrfToken?: string }>("/api/auth/csrf");
    assertStatus(res.status, 200);
    assertDefined((res.body as { csrfToken?: string }).csrfToken, "csrfToken");
  });

  // ── Login with valid AU credentials ───────────────────────────────────────
  await test(SUITE, "Login: valid credentials → session cookie set", async () => {
    const result = await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    assertTrue(result.success, result.error ?? "login failed");
  });

  // ── Session endpoint returns user after login ──────────────────────────────
  await test(SUITE, "GET /api/auth/session returns userId after login", async () => {
    const res = await client.get<{ user?: { id?: string; country?: string } }>("/api/auth/session");
    assertStatus(res.status, 200);
    assertDefined((res.body as { user?: { id?: string } }).user?.id, "user.id");
    assertEqual(
      (res.body as { user?: { country?: string } }).user?.country,
      TEST_USERS.AU_PARENT.country,
      "country"
    );
  });

  // ── Login with wrong password ──────────────────────────────────────────────
  await test(SUITE, "Login: wrong password → no valid session", async () => {
    const badClient = new TestClient(baseUrl);
    const result = await badClient.login(TEST_USERS.AU_PARENT.email, "WrongPassword999!");
    assertTrue(!result.success, "expected login failure");
  });

  // ── Login with non-existent email ─────────────────────────────────────────
  await test(SUITE, "Login: unknown email → no valid session", async () => {
    const badClient = new TestClient(baseUrl);
    const result = await badClient.login("nobody@kidlearn.test", "TestTsunami123!");
    assertTrue(!result.success, "expected login failure for unknown email");
  });

  // ── Register: duplicate email returns 409 ────────────────────────────────
  await test(SUITE, "POST /api/register: duplicate email → 409", async () => {
    const res = await client.post("/api/register", {
      email:      TEST_USERS.AU_PARENT.email,
      password:   "AnotherPass123!",
      parentName: "Another Parent",
      country:    "AU",
    });
    assertStatus(res.status, 409, res.raw);
  });

  // ── Register: invalid email format → 400 ─────────────────────────────────
  await test(SUITE, "POST /api/register: invalid email → 400", async () => {
    const freshClient = new TestClient(baseUrl);
    const res = await freshClient.post("/api/register", {
      email:      "not-an-email",
      password:   "TestTsunami123!",
      parentName: "Test",
      country:    "AU",
    });
    assertStatus(res.status, 400, res.raw);
  });

  // ── Register: short password → 400 ───────────────────────────────────────
  await test(SUITE, "POST /api/register: password too short → 400", async () => {
    const freshClient = new TestClient(baseUrl);
    const res = await freshClient.post("/api/register", {
      email:      "new.short@kidlearn.test",
      password:   "short",
      parentName: "Test",
      country:    "AU",
    });
    assertStatus(res.status, 400, res.raw);
  });

  // ── Register: invalid country → 400 ──────────────────────────────────────
  await test(SUITE, "POST /api/register: invalid country → 400", async () => {
    const freshClient = new TestClient(baseUrl);
    const res = await freshClient.post("/api/register", {
      email:      "new.country@kidlearn.test",
      password:   "TestTsunami123!",
      parentName: "Test",
      country:    "ZZ",  // not a valid country
    });
    assertStatus(res.status, 400, res.raw);
  });

  // ── Protected route: blocked without session ──────────────────────────────
  await test(SUITE, "GET /api/children: unauthenticated → 401", async () => {
    const anonClient = new TestClient(baseUrl);
    const res = await anonClient.get("/api/children");
    assertStatus(res.status, 401, res.raw);
  });

  // ── Health check ──────────────────────────────────────────────────────────
  await test(SUITE, "GET /api/health returns 200", async () => {
    const res = await client.get("/api/health");
    assertStatus(res.status, 200, res.raw);
  });
}
