/**
 * SUITE 15 — Tile customization
 * ───────────────────────────────
 * Covers the new appearance API and default theme behavior.
 */

import { TestClient } from "../lib/http";
import { test, startSuite, assertStatus, assertTrue, assertDefined, assertEqual } from "../lib/assert";
import { TEST_USERS, TEST_CHILDREN } from "../fixtures";
import { getDefaultTileThemeId } from "@/lib/services/tile-themes";

const SUITE = "tile-customization";

export async function runTileCustomizationSuite(baseUrl: string) {
  startSuite("15  Tile customization");

  async function loginAuParent(client: TestClient) {
    const login = await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    assertTrue(login.success, login.error ?? "AU parent login failed");
  }

  await test(SUITE, "GET /api/children/:childId/appearance: unauthenticated -> 401", async () => {
    const anon = new TestClient(baseUrl);
    const res = await anon.get(`/api/children/${TEST_CHILDREN.AU_YEAR3.childId}/appearance`);
    assertStatus(res.status, 401, res.raw);
  });

  await test(SUITE, "GET /api/children/:childId/appearance: returns default tile theme + tags", async () => {
    const client = new TestClient(baseUrl);
    await loginAuParent(client);
    const res = await client.get<{ tileThemeId?: string; tileFavoriteTags?: string[] }>(
      `/api/children/${TEST_CHILDREN.AU_YEAR3.childId}/appearance`
    );
    assertStatus(res.status, 200, res.raw);
    assertDefined(res.body.tileThemeId, "tileThemeId required");
    assertTrue(Array.isArray(res.body.tileFavoriteTags), "tileFavoriteTags must be an array");
    assertEqual(
      res.body.tileThemeId,
      getDefaultTileThemeId({
        ageGroup: "year3",
        yearLevel: "year3",
        country: "AU",
      }),
      "appearance endpoint should fall back to the same default theme used by creation"
    );
  });

  await test(SUITE, "PATCH /api/children/:childId/appearance: saves tile theme and favorite tags", async () => {
    const client = new TestClient(baseUrl);
    await loginAuParent(client);
    const res = await client.patch<{ success?: boolean; tileThemeId?: string; tileFavoriteTags?: string[] }>(
      `/api/children/${TEST_CHILDREN.AU_YEAR3.childId}/appearance`,
      {
        tileThemeId: "sports-stadium",
        tileFavoriteTags: ["sports", "games"],
      }
    );
    assertStatus(res.status, 200, res.raw);
    assertEqual(res.body.success, true, "success must be true");
    assertEqual(res.body.tileThemeId, "sports-stadium", "theme should be echoed back");
    assertTrue(
      Array.isArray(res.body.tileFavoriteTags) && res.body.tileFavoriteTags.length === 2,
      "favorite tags should be echoed back"
    );
  });

  await test(SUITE, "GET /api/children/:childId/appearance: persists PATCHed values", async () => {
    const client = new TestClient(baseUrl);
    await loginAuParent(client);
    const res = await client.get<{ tileThemeId?: string; tileFavoriteTags?: string[] }>(
      `/api/children/${TEST_CHILDREN.AU_YEAR3.childId}/appearance`
    );
    assertStatus(res.status, 200, res.raw);
    assertEqual(res.body.tileThemeId, "sports-stadium", "patched theme should persist");
    assertTrue(
      Array.isArray(res.body.tileFavoriteTags) && res.body.tileFavoriteTags.includes("sports"),
      "patched favorite tag should persist"
    );
  });

  await test(SUITE, "PATCH /api/children/:childId/appearance: invalid body -> 400", async () => {
    const client = new TestClient(baseUrl);
    await loginAuParent(client);
    const res = await client.patch(`/api/children/${TEST_CHILDREN.AU_YEAR3.childId}/appearance`, {
      tileThemeId: "",
      tileFavoriteTags: ["", "sports"],
    });
    assertStatus(res.status, 400, res.raw);
  });

  await test(SUITE, "PATCH /api/children/:childId/appearance: cross-user child -> 403 or 404", async () => {
    const client = new TestClient(baseUrl);
    await loginAuParent(client);
    const res = await client.patch(`/api/children/${TEST_CHILDREN.US_GRADE5.childId}/appearance`, {
      tileThemeId: "themes-ocean",
      tileFavoriteTags: ["ocean"],
    });
    assertTrue(res.status === 403 || res.status === 404, `expected 403 or 404, got ${res.status}`);
  });
}
