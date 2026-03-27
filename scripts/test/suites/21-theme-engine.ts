/**
 * SUITE 21 — CHILD THEME ENGINE
 * ------------------------------------------------------------
 * Verifies that the child tile theme is now a real journey theme:
 * - theme resolver returns the expected preset families
 * - question API exposes the child appearance payload
 * - learn-session persistence preserves the theme through resume
 */

import { TestClient } from "../lib/http";
import {
  test,
  startSuite,
  assertStatus,
  assertTrue,
  assertDefined,
  assertEqual,
} from "../lib/assert";
import { TEST_USERS, TEST_CHILDREN } from "../fixtures";
import { getThemeJourneyTokens } from "../../../lib/services/tile-themes";

const SUITE = "theme-engine";

export async function runThemeEngineSuite(baseUrl: string) {
  startSuite("21  CHILD THEME ENGINE");

  await test(SUITE, "theme resolver: year3 defaults to fantasy", async () => {
    const tokens = getThemeJourneyTokens(undefined, {
      ageGroup: "year3",
      yearLevel: "year3",
      country: "AU",
    });
    assertEqual(tokens.preset.id, "fantasy", "year3 should default to fantasy");
    assertTrue(tokens.pageGradient.length > 0, "theme tokens must include a page gradient");
  });

  await test(SUITE, "theme resolver: year5 can resolve a sports theme", async () => {
    const tokens = getThemeJourneyTokens("sports-stadium", {
      ageGroup: "year5",
      yearLevel: "year5",
      country: "AU",
    });
    assertEqual(tokens.themeKey, "soccer", "sports theme should resolve to the soccer child theme");
    assertTrue(tokens.primaryButton.length > 0, "primaryButton class should be populated");
  });

  await test(SUITE, "GET /api/questions: theme appearance is aligned with child profile", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const res = await client.get<{
      appearance?: {
        tileThemeId?: string;
        tileFavoriteTags?: string[];
        preferences?: {
          theme?: string;
          avatar?: string;
          buttonStyle?: string;
          cardStyle?: string;
          rewardStyle?: string;
        };
      };
      country?: string;
    }>(`/api/questions?childId=${TEST_CHILDREN.AU_YEAR3.childId}&subject=english`);
    assertStatus(res.status, 200, res.raw);
    assertTrue(
      !!res.body.appearance?.tileThemeId,
      "theme id should be derived for the selected child"
    );
    assertTrue(Array.isArray(res.body.appearance?.tileFavoriteTags), "favorite tags should be returned");
    assertTrue(!!res.body.appearance?.preferences?.theme, "theme preference should be returned");
    assertTrue(typeof res.body.country === "string", "country should be returned");
  });

  await test(SUITE, "POST /api/learn/session: journeyTheme persists through save/load", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const saveRes = await client.post<{
      success?: boolean;
      session?: {
        journeyTheme?: {
          tileThemeId?: string;
          tileFavoriteTags?: string[];
          preferences?: {
            theme?: string;
            avatar?: string;
            buttonStyle?: string;
            cardStyle?: string;
            rewardStyle?: string;
          };
        };
      };
    }>(
      "/api/learn/session",
      {
        childId: TEST_CHILDREN.AU_YEAR3.childId,
        subject: "maths",
        questions: [],
        currentIndex: 0,
        selectedAnswer: null,
        isAnswered: false,
        results: [],
        currentDifficulty: 4,
        ageGroup: "year3",
        journeyTheme: {
          tileThemeId: "games-space",
          tileFavoriteTags: ["games", "arcade"],
          preferences: {
            theme: "space",
            avatar: "🚀",
            buttonStyle: "cartoon",
            cardStyle: "bold",
            rewardStyle: "gems",
          },
        },
        timer: 0,
        coins: 0,
        streak: 0,
        consecutiveCorrect: 0,
        consecutiveWrong: 0,
        showHint: false,
        showExplanation: false,
        mascotMood: "happy",
      }
    );
    assertStatus(saveRes.status, 200, saveRes.raw);
    assertEqual(saveRes.body.success, true, "save should succeed");
    assertEqual(saveRes.body.session?.journeyTheme?.tileThemeId, "games-space", "theme should be saved");
    assertEqual(saveRes.body.session?.journeyTheme?.preferences?.theme, "space", "theme preference should be saved");

    const loadRes = await client.get<{
      session?: {
        journeyTheme?: {
          tileThemeId?: string;
          tileFavoriteTags?: string[];
          preferences?: {
            theme?: string;
            avatar?: string;
            buttonStyle?: string;
            cardStyle?: string;
            rewardStyle?: string;
          };
        };
      };
    }>(
      `/api/learn/session?childId=${TEST_CHILDREN.AU_YEAR3.childId}&subject=maths`
    );
    assertStatus(loadRes.status, 200, loadRes.raw);
    assertDefined(loadRes.body.session, "session should be readable");
    assertEqual(loadRes.body.session?.journeyTheme?.tileThemeId, "games-space", "theme should round-trip");
    assertEqual(loadRes.body.session?.journeyTheme?.preferences?.theme, "space", "theme preference should round-trip");
    assertTrue(
      (loadRes.body.session?.journeyTheme?.tileFavoriteTags ?? []).includes("games"),
      "favorite tags should round-trip"
    );
  });
}
