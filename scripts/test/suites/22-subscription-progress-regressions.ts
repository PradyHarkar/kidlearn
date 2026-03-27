/**
 * SUITE 22 — SUBSCRIPTION + PROGRESS REGRESSIONS
 * ------------------------------------------------
 * Focuses on the two defects the user reported:
 * - subscription checkout should fail with a descriptive message when config
 *   is missing, or return a valid Stripe URL when configured
 * - progress scoring must remain per-subject, and untouched subjects must
 *   render as "Not started"
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
import { getSubjectProgressDisplay } from "../../../lib/services/child-progress-display";

const SUITE = "subscription-progress-regressions";

function makeAnswers(correct: number, total: number, difficulty = 4, topic = "regression-topic") {
  return Array.from({ length: total }, (_, index) => ({
    questionId: `regression-${topic}-${index + 1}`,
    correct: index < correct,
    timeSpent: 3000,
    difficulty,
    topic,
  }));
}

export async function runSubscriptionProgressRegressionSuite(baseUrl: string) {
  startSuite("22  SUBSCRIPTION + PROGRESS REGRESSIONS");

  await test(SUITE, "getSubjectProgressDisplay: zero attempts -> Not started", async () => {
    const display = getSubjectProgressDisplay(
      {
        currentDifficultyMaths: 4,
        currentDifficultyEnglish: 4,
        currentDifficultyScience: 4,
        stats: {
          totalQuestionsAttempted: 0,
          totalCorrect: 0,
          mathsAttempted: 0,
          englishAttempted: 0,
          scienceAttempted: 0,
          mathsCorrect: 0,
          englishCorrect: 0,
          scienceCorrect: 0,
          mathsAccuracy: 0,
          englishAccuracy: 0,
          scienceAccuracy: 0,
          favoriteTopics: [],
        },
      },
      "english"
    );

    assertEqual(display.label, "Not started", "untouched subject should show Not started");
    assertEqual(display.progressPercent, 0, "untouched subject progress should be 0%");
  });

  await test(SUITE, "getSubjectProgressDisplay: practiced subject -> Lv N", async () => {
    const display = getSubjectProgressDisplay(
      {
        currentDifficultyMaths: 6,
        currentDifficultyEnglish: 4,
        currentDifficultyScience: 4,
        stats: {
          totalQuestionsAttempted: 10,
          totalCorrect: 4,
          mathsAttempted: 10,
          englishAttempted: 0,
          scienceAttempted: 0,
          mathsCorrect: 4,
          englishCorrect: 0,
          scienceCorrect: 0,
          mathsAccuracy: 40,
          englishAccuracy: 0,
          scienceAccuracy: 0,
          favoriteTopics: [],
        },
      },
      "maths"
    );

    assertEqual(display.label, "Lv 6", "practiced subject should show level");
    assertTrue(display.progressPercent > 0, "practiced subject should render a visible progress bar");
  });

  await test(SUITE, "POST /api/progress: one-subject session only updates that subject", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const childId = TEST_CHILDREN.AU_YEAR3.childId;
    const beforeRes = await client.get<{ children?: Array<{
      childId?: string;
      stats?: {
        mathsAttempted?: number;
        englishAttempted?: number;
        scienceAttempted?: number;
        mathsAccuracy?: number;
        englishAccuracy?: number;
        scienceAccuracy?: number;
      };
    }> }>("/api/children");
    assertStatus(beforeRes.status, 200, beforeRes.raw);
    const beforeChild = (beforeRes.body.children ?? []).find((item) => item.childId === childId);
    assertDefined(beforeChild, "target child should be present before submission");
    const beforeMathsAttempted = beforeChild?.stats?.mathsAttempted ?? 0;
    const beforeEnglishAttempted = beforeChild?.stats?.englishAttempted ?? 0;
    const beforeScienceAttempted = beforeChild?.stats?.scienceAttempted ?? 0;

    const progressRes = await client.post("/api/progress", {
      childId,
      subject: "maths",
      questions: makeAnswers(4, 10, 4, "maths-only"),
    });
    assertStatus(progressRes.status, 200, progressRes.raw);

    const childrenRes = await client.get<{
      children?: Array<{
        childId?: string;
        currentDifficultyMaths?: number;
        currentDifficultyEnglish?: number;
        currentDifficultyScience?: number;
        stats?: {
          mathsAttempted?: number;
          englishAttempted?: number;
          scienceAttempted?: number;
          mathsAccuracy?: number;
          englishAccuracy?: number;
          scienceAccuracy?: number;
        };
      }>;
    }>("/api/children");
    assertStatus(childrenRes.status, 200, childrenRes.raw);

    const child = (childrenRes.body.children ?? []).find((item) => item.childId === childId);
    assertDefined(child, "fresh child should be returned by /api/children");
    assertEqual((child?.stats?.mathsAttempted ?? 0) - beforeMathsAttempted, 10, "maths attempts should increase by the session size");
    assertEqual(child?.stats?.englishAttempted, beforeEnglishAttempted, "english should remain untouched");
    assertEqual(child?.stats?.scienceAttempted, beforeScienceAttempted, "science should remain untouched");
    assertTrue((child?.stats?.mathsAccuracy ?? 0) >= 0 && (child?.stats?.mathsAccuracy ?? 0) <= 100, "maths accuracy should remain valid");
    assertEqual(child?.stats?.englishAccuracy, beforeChild?.stats?.englishAccuracy ?? 0, "english accuracy should remain unchanged");
    assertEqual(child?.stats?.scienceAccuracy, beforeChild?.stats?.scienceAccuracy ?? 0, "science accuracy should remain unchanged");

    const untouchedSubject = (beforeEnglishAttempted === 0 ? "english" : beforeScienceAttempted === 0 ? "science" : null);
    if (untouchedSubject) {
      const untouchedDisplay = getSubjectProgressDisplay(
        {
          currentDifficultyMaths: child?.currentDifficultyMaths ?? 1,
          currentDifficultyEnglish: child?.currentDifficultyEnglish ?? 1,
          currentDifficultyScience: child?.currentDifficultyScience ?? 1,
          stats: {
            totalQuestionsAttempted: 10,
            totalCorrect: 4,
            mathsAttempted: child?.stats?.mathsAttempted ?? 0,
            englishAttempted: child?.stats?.englishAttempted ?? 0,
            scienceAttempted: child?.stats?.scienceAttempted ?? 0,
            mathsCorrect: 0,
            englishCorrect: 0,
            scienceCorrect: 0,
            mathsAccuracy: child?.stats?.mathsAccuracy ?? 0,
            englishAccuracy: child?.stats?.englishAccuracy ?? 0,
            scienceAccuracy: child?.stats?.scienceAccuracy ?? 0,
            favoriteTopics: [],
          },
        },
        untouchedSubject
      );
      assertEqual(untouchedDisplay.label, "Not started", "untouched subject should stay Not started");
    }
  });

  await test(SUITE, "POST /api/subscription/checkout: weekly returns url or descriptive error", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const res = await client.post<{ url?: string; error?: string }>("/api/subscription/checkout", { plan: "weekly" });

    if (res.status === 200) {
      assertDefined(res.body.url, "checkout url");
      assertTrue(res.body.url?.startsWith("https://") ?? false, "checkout url should be https");
      return;
    }

    const error = res.body.error || "";
    assertTrue(error.length > 0, "checkout failure should explain the reason");
    assertTrue(
      /stripe|price|secret|config/i.test(error),
      `checkout error should mention Stripe config or price setup, got: ${error}`
    );
  });

  await test(SUITE, "GET /pricing: pricing page serves subscription CTAs", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const res = await client.get("/pricing");
    assertStatus(res.status, 200, res.raw);
    assertTrue(
      res.raw.includes("Subscribe Weekly") || res.raw.includes("Start Free Trial"),
      "pricing page should render a weekly CTA"
    );
    assertTrue(
      res.raw.includes("Subscribe Annual") || res.raw.includes("Start Free Trial"),
      "pricing page should render an annual CTA"
    );
  });
}
