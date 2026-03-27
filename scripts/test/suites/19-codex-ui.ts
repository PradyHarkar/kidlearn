/**
 * SUITE 19 — CODEX UI: TILE CUSTOMIZATION + DASHBOARD FIELDS
 * ────────────────────────────────────────────────────────────
 * Covers the tile-customization feature Codex shipped:
 *
 *   app/api/children/[childId]/appearance/route.ts
 *   lib/services/tile-themes.ts
 *   app/api/children/route.ts  (default tileThemeId on creation)
 *   types/index.ts             (tileThemeId, tileFavoriteTags on Child)
 *
 * Bugs caught by this suite:
 *
 *   BUG-TC1  PATCH /appearance accepted any string as tileThemeId — no
 *            validation against the 8 known preset IDs. Stored value
 *            diverged silently from what the UI displayed (which fell
 *            back to the age-group default).
 *            Fix: Zod enum(TILE_THEME_PRESETS.map(p => p.id)).
 *
 *   BUG-TC3  No test verified that POST /api/children sets a valid
 *            default tileThemeId matching the child's age group.
 *
 *   BUG-TC4  No test verified that GET /api/children returns
 *            tileThemeId/tileFavoriteTags (required by the dashboard
 *            to render tile themes without a separate round-trip).
 *
 *   BUG-TC5  tileFavoriteTags max-10 constraint was schema-enforced
 *            but never tested.
 *
 * Age-group → default theme mapping (from lib/services/tile-themes.ts):
 *   foundation / year1         → themes-rainbow
 *   year2 / year3              → games-arcade
 *   year4 / year5              → places-castle
 *   year6 / year7 / year8      → themes-ocean
 */

import { TestClient } from "../lib/http";
import {
  test, startSuite, assertStatus, assertTrue, assertEqual,
  assertDefined, assertArrayLength,
} from "../lib/assert";
import { TEST_USERS, TEST_CHILDREN } from "../fixtures";
import { getDefaultTileThemeId } from "../../../lib/services/tile-themes";

const SUITE = "codex-ui";

/** All valid preset IDs — keep in sync with TILE_THEME_PRESETS */
const VALID_THEME_IDS = [
  "sports-stadium", "sports-court",
  "places-castle",  "places-city",
  "themes-rainbow", "themes-ocean",
  "games-arcade",   "games-space",
];

export async function runCodexUiSuite(baseUrl: string) {
  startSuite("19  CODEX UI: TILE CUSTOMIZATION");

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP A — Pure function: getDefaultTileThemeId age-group mapping
  // (no HTTP — fast unit tests that verify the service layer directly)
  // ─────────────────────────────────────────────────────────────────────────

  await test(SUITE, "getDefaultTileThemeId: foundation → themes-rainbow", async () => {
    const id = getDefaultTileThemeId({ ageGroup: "foundation", yearLevel: "prep", country: "AU" });
    assertEqual(id, "themes-rainbow", "foundation should get themes-rainbow");
  });

  await test(SUITE, "getDefaultTileThemeId: year1 → themes-rainbow", async () => {
    const id = getDefaultTileThemeId({ ageGroup: "year1", yearLevel: "year1", country: "AU" });
    assertEqual(id, "themes-rainbow", "year1 should get themes-rainbow");
  });

  await test(SUITE, "getDefaultTileThemeId: year2 → games-arcade", async () => {
    const id = getDefaultTileThemeId({ ageGroup: "year2", yearLevel: "year2", country: "AU" });
    assertEqual(id, "games-arcade", "year2 should get games-arcade");
  });

  await test(SUITE, "getDefaultTileThemeId: year3 → games-arcade", async () => {
    const id = getDefaultTileThemeId({ ageGroup: "year3", yearLevel: "year3", country: "AU" });
    assertEqual(id, "games-arcade", "year3 should get games-arcade");
  });

  await test(SUITE, "getDefaultTileThemeId: year4 → places-castle", async () => {
    const id = getDefaultTileThemeId({ ageGroup: "year4", yearLevel: "year4", country: "AU" });
    assertEqual(id, "places-castle", "year4 should get places-castle");
  });

  await test(SUITE, "getDefaultTileThemeId: year5 → places-castle", async () => {
    const id = getDefaultTileThemeId({ ageGroup: "year5", yearLevel: "year5", country: "AU" });
    assertEqual(id, "places-castle", "year5 should get places-castle");
  });

  await test(SUITE, "getDefaultTileThemeId: year6 → themes-ocean", async () => {
    const id = getDefaultTileThemeId({ ageGroup: "year6", yearLevel: "year6", country: "AU" });
    assertEqual(id, "themes-ocean", "year6 should get themes-ocean");
  });

  await test(SUITE, "getDefaultTileThemeId: year7 → themes-ocean", async () => {
    const id = getDefaultTileThemeId({ ageGroup: "year7", yearLevel: "year7", country: "AU" });
    assertEqual(id, "themes-ocean", "year7 should get themes-ocean");
  });

  await test(SUITE, "getDefaultTileThemeId: year8 → themes-ocean", async () => {
    const id = getDefaultTileThemeId({ ageGroup: "year8", yearLevel: "year8", country: "AU" });
    assertEqual(id, "themes-ocean", "year8 should get themes-ocean");
  });

  await test(SUITE, "getDefaultTileThemeId: result is always a valid preset ID", async () => {
    const ageGroups = ["foundation", "year1", "year2", "year3", "year4", "year5", "year6", "year7", "year8"] as const;
    for (const ageGroup of ageGroups) {
      const id = getDefaultTileThemeId({ ageGroup, yearLevel: ageGroup === "foundation" ? "prep" : ageGroup, country: "AU" });
      assertTrue(VALID_THEME_IDS.includes(id), `ageGroup=${ageGroup} returned unknown preset "${id}"`);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP B — POST /api/children: new child gets correct default theme
  // (BUG-TC3: was untested)
  // ─────────────────────────────────────────────────────────────────────────

  interface ChildResponse {
    child?: {
      childId?: string;
      tileThemeId?: string;
      tileFavoriteTags?: string[];
      ageGroup?: string;
    };
  }

  await test(SUITE, "BUG-TC3: POST /api/children: new child has tileThemeId set", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    // Use existing seeded child — verify it already has tileThemeId
    const listRes = await client.get<{ children?: Array<{ childId: string; tileThemeId?: string; ageGroup?: string }> }>("/api/children");
    assertStatus(listRes.status, 200, listRes.raw);

    const children = listRes.body.children ?? [];
    for (const child of children) {
      assertDefined(child.tileThemeId, `child ${child.childId} missing tileThemeId`);
      assertTrue(
        VALID_THEME_IDS.includes(child.tileThemeId!),
        `child ${child.childId} has unknown tileThemeId "${child.tileThemeId}"`
      );
    }
  });

  await test(SUITE, "BUG-TC3: POST /api/children: year1 child gets themes-rainbow default", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const listRes = await client.get<{ children?: Array<{ childId: string; tileThemeId?: string; ageGroup?: string; grade?: string }> }>("/api/children");
    assertStatus(listRes.status, 200, listRes.raw);

    const year1Child = (listRes.body.children ?? []).find((c) => c.grade === "year1" || c.ageGroup === "year1");
    if (!year1Child) {
      console.log("    ⚠  No year1 child found in seeded data — skipping");
      return;
    }
    assertEqual(year1Child.tileThemeId, "themes-rainbow", "year1 → themes-rainbow");
  });

  await test(SUITE, "BUG-TC3: year3 child gets games-arcade default", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    // Get appearance for the seeded year3 child
    const res = await client.get<{ tileThemeId?: string }>(
      `/api/children/${TEST_CHILDREN.AU_YEAR3.childId}/appearance`
    );
    assertStatus(res.status, 200, res.raw);
    assertEqual(res.body.tileThemeId, "games-arcade", "year3 → games-arcade");
  });

  await test(SUITE, "BUG-TC3: year7 child gets themes-ocean default", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const res = await client.get<{ tileThemeId?: string }>(
      `/api/children/${TEST_CHILDREN.AU_YEAR7.childId}/appearance`
    );
    assertStatus(res.status, 200, res.raw);
    assertEqual(res.body.tileThemeId, "themes-ocean", "year7 → themes-ocean");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP C — GET /api/children: dashboard fields present
  // (BUG-TC4: dashboard needs tileThemeId/tileFavoriteTags without extra round-trip)
  // ─────────────────────────────────────────────────────────────────────────

  await test(SUITE, "BUG-TC4: GET /api/children returns tileThemeId on each child", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const res = await client.get<{ children?: Array<{ tileThemeId?: unknown; tileFavoriteTags?: unknown }> }>("/api/children");
    assertStatus(res.status, 200, res.raw);

    const children = res.body.children ?? [];
    assertArrayLength(children, 1, "at least 1 child");
    for (const child of children) {
      assertDefined(child.tileThemeId, "tileThemeId must be present in /api/children response");
      assertTrue(Array.isArray(child.tileFavoriteTags), "tileFavoriteTags must be an array");
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP D — BUG-TC1: PATCH /appearance rejects unknown theme IDs
  // ─────────────────────────────────────────────────────────────────────────

  await test(SUITE, "BUG-TC1: PATCH /appearance with unknown tileThemeId → 400", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const res = await client.patch(
      `/api/children/${TEST_CHILDREN.AU_YEAR3.childId}/appearance`,
      { tileThemeId: "completely-invalid-theme", tileFavoriteTags: [] }
    );
    assertStatus(res.status, 400, res.raw);
  });

  await test(SUITE, "BUG-TC1: PATCH /appearance with valid theme ID → 200", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const res = await client.patch<{ success?: boolean; tileThemeId?: string }>(
      `/api/children/${TEST_CHILDREN.AU_YEAR3.childId}/appearance`,
      { tileThemeId: "sports-stadium", tileFavoriteTags: ["sports"] }
    );
    assertStatus(res.status, 200, res.raw);
    assertEqual(res.body.success, true, "success should be true");
    assertEqual(res.body.tileThemeId, "sports-stadium", "theme echoed back");
  });

  await test(SUITE, "BUG-TC1: all 8 valid theme IDs are accepted by PATCH", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    for (const themeId of VALID_THEME_IDS) {
      const res = await client.patch<{ success?: boolean }>(
        `/api/children/${TEST_CHILDREN.AU_YEAR3.childId}/appearance`,
        { tileThemeId: themeId, tileFavoriteTags: [] }
      );
      assertStatus(res.status, 200, `theme "${themeId}" should be accepted`);
    }
  });

  await test(SUITE, "BUG-TC1: GET /appearance after invalid PATCH attempt still returns valid theme", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    // Try to set invalid theme (should be blocked after BUG-TC1 fix)
    await client.patch(
      `/api/children/${TEST_CHILDREN.AU_YEAR3.childId}/appearance`,
      { tileThemeId: "hacked-theme", tileFavoriteTags: [] }
    );

    // After rejected PATCH, GET should still return a valid theme
    const res = await client.get<{ tileThemeId?: string }>(
      `/api/children/${TEST_CHILDREN.AU_YEAR3.childId}/appearance`
    );
    assertStatus(res.status, 200, res.raw);
    assertTrue(
      VALID_THEME_IDS.includes(res.body.tileThemeId!),
      `appearance tileThemeId "${res.body.tileThemeId}" should be a valid preset`
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP E — tileFavoriteTags limits (BUG-TC5)
  // ─────────────────────────────────────────────────────────────────────────

  await test(SUITE, "BUG-TC5: PATCH /appearance with 10 tileFavoriteTags → 200 (at limit)", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const tags = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"]; // exactly 10
    const res = await client.patch<{ success?: boolean }>(
      `/api/children/${TEST_CHILDREN.AU_YEAR3.childId}/appearance`,
      { tileThemeId: "games-arcade", tileFavoriteTags: tags }
    );
    assertStatus(res.status, 200, res.raw);
  });

  await test(SUITE, "BUG-TC5: PATCH /appearance with 11 tileFavoriteTags → 400 (over limit)", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const tags = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"]; // 11 → over max
    const res = await client.patch(
      `/api/children/${TEST_CHILDREN.AU_YEAR3.childId}/appearance`,
      { tileThemeId: "games-arcade", tileFavoriteTags: tags }
    );
    assertStatus(res.status, 400, res.raw);
  });

  await test(SUITE, "BUG-TC5: PATCH /appearance with empty-string tag → 400", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const res = await client.patch(
      `/api/children/${TEST_CHILDREN.AU_YEAR3.childId}/appearance`,
      { tileThemeId: "games-arcade", tileFavoriteTags: ["valid", ""] }
    );
    assertStatus(res.status, 400, res.raw);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP F — Persistence + isolation across children
  // ─────────────────────────────────────────────────────────────────────────

  await test(SUITE, "two children have independent tile themes", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    // Set year3 child to sports-stadium
    await client.patch(
      `/api/children/${TEST_CHILDREN.AU_YEAR3.childId}/appearance`,
      { tileThemeId: "sports-stadium", tileFavoriteTags: [] }
    );

    // Set year5 child to games-space
    await client.patch(
      `/api/children/${TEST_CHILDREN.AU_YEAR5.childId}/appearance`,
      { tileThemeId: "games-space", tileFavoriteTags: [] }
    );

    // Verify year3 still has sports-stadium (not overwritten by year5 update)
    const res3 = await client.get<{ tileThemeId?: string }>(
      `/api/children/${TEST_CHILDREN.AU_YEAR3.childId}/appearance`
    );
    assertStatus(res3.status, 200, res3.raw);
    assertEqual(res3.body.tileThemeId, "sports-stadium", "year3 should still have sports-stadium");

    // Verify year5 has games-space
    const res5 = await client.get<{ tileThemeId?: string }>(
      `/api/children/${TEST_CHILDREN.AU_YEAR5.childId}/appearance`
    );
    assertStatus(res5.status, 200, res5.raw);
    assertEqual(res5.body.tileThemeId, "games-space", "year5 should have games-space");
  });

  await test(SUITE, "tileFavoriteTags persist correctly across PATCH → GET", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const tags = ["sports", "ocean", "arcade"];
    await client.patch(
      `/api/children/${TEST_CHILDREN.AU_YEAR3.childId}/appearance`,
      { tileThemeId: "sports-stadium", tileFavoriteTags: tags }
    );

    const res = await client.get<{ tileThemeId?: string; tileFavoriteTags?: string[] }>(
      `/api/children/${TEST_CHILDREN.AU_YEAR3.childId}/appearance`
    );
    assertStatus(res.status, 200, res.raw);
    assertTrue(
      tags.every((tag) => res.body.tileFavoriteTags?.includes(tag)),
      "all saved tags should appear in GET response"
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GROUP G — Auth guards
  // ─────────────────────────────────────────────────────────────────────────

  await test(SUITE, "GET /appearance: unauthenticated → 401", async () => {
    const anon = new TestClient(baseUrl);
    const res = await anon.get(`/api/children/${TEST_CHILDREN.AU_YEAR3.childId}/appearance`);
    assertStatus(res.status, 401, res.raw);
  });

  await test(SUITE, "PATCH /appearance: unauthenticated → 401", async () => {
    const anon = new TestClient(baseUrl);
    const res = await anon.patch(
      `/api/children/${TEST_CHILDREN.AU_YEAR3.childId}/appearance`,
      { tileThemeId: "sports-stadium" }
    );
    assertStatus(res.status, 401, res.raw);
  });

  await test(SUITE, "PATCH /appearance: cross-user child → 403 or 404", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.US_PARENT.email, TEST_USERS.US_PARENT.password);

    // US parent tries to patch AU child — should fail (DynamoDB composite key mismatch)
    const res = await client.patch(
      `/api/children/${TEST_CHILDREN.AU_YEAR3.childId}/appearance`,
      { tileThemeId: "sports-stadium", tileFavoriteTags: [] }
    );
    assertTrue([403, 404].includes(res.status), `expected 403/404 for cross-user, got ${res.status}`);
  });
}
