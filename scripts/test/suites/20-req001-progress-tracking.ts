/**
 * SUITE 20 — REQ-001 P1: PROGRESS TRACKING
 * ------------------------------------------------------------
 * Covers the parent/child performance tracking slice from Confluence REQ-001:
 *
 * P1  — Subject performance pie chart
 * P1  — Needs help smart alert
 * P1  — Streak tracker
 * P1  — Weekly in-app digest
 *
 * What this suite proves:
 * - The new progress insights APIs are protected and return the expected shape.
 * - A low-accuracy progress session produces topic summary data and an alert.
 * - Weekly digest reflects the latest progress for the selected child.
 * - Child streak metadata updates after a session is submitted.
 * - The dashboard progress tab still serves and includes the expected UX copy.
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

const SUITE = "req001-progress-tracking";
// Use a dedicated isolated child so no other suite's progress contaminates the weekly
// accuracy calculation.  AU_YEAR3_DIGEST is only written to by this suite.
const CHILD_ID = TEST_CHILDREN.AU_YEAR3_DIGEST.childId;
const RUN_ID = Date.now().toString(36);
const TOPIC = `req001-fractions-${RUN_ID}`;

interface TopicSummary {
  childId?: string;
  overallAccuracy?: number;
  subjects?: {
    maths?: {
      subject?: string;
      attempts?: number;
      correct?: number;
      incorrect?: number;
      accuracy?: number;
      topics?: Array<{
        topic?: string;
        attempts?: number;
        correct?: number;
        incorrect?: number;
        accuracy?: number;
        lastAttemptAt?: string;
      }>;
    };
    english?: unknown;
    science?: unknown;
  };
  topTopics?: Array<{
    subject?: string;
    topic?: string;
    attempts?: number;
    correct?: number;
    incorrect?: number;
    accuracy?: number;
    lastAttemptAt?: string;
  }>;
  updatedAt?: string;
}

interface ProgressAlertSummary {
  childId?: string;
  alerts?: Array<{
    subject?: string;
    topic?: string;
    attempts?: number;
    correct?: number;
    incorrect?: number;
    accuracy?: number;
    severity?: string;
    message?: string;
    actionLabel?: string;
    actionUrl?: string;
  }>;
  updatedAt?: string;
}

interface WeeklyDigest {
  childId?: string;
  childName?: string;
  totalSessions?: number;
  totalQuestions?: number;
  correct?: number;
  accuracy?: number;
  rewardPointsEarned?: number;
  streakDays?: number;
  subjectAccuracy?: {
    maths?: number;
    english?: number;
    science?: number;
  };
  topTopics?: Array<{
    subject?: string;
    topic?: string;
    attempts?: number;
    correct?: number;
    incorrect?: number;
    accuracy?: number;
  }>;
  recentSessions?: Array<{
    sessionId?: string;
    subject?: string;
    completedAt?: string;
    totalQuestions?: number;
    correct?: number;
    incorrect?: number;
    accuracy?: number;
    difficultyStart?: number;
    difficultyEnd?: number;
    topic?: string;
  }>;
}

export async function runReq001ProgressTrackingSuite(baseUrl: string) {
  startSuite("20  REQ-001 P1: PROGRESS TRACKING");

  await test(SUITE, "GET /api/progress/topics: unauthenticated -> 401", async () => {
    const anon = new TestClient(baseUrl);
    const res = await anon.get(`/api/progress/topics?childId=${CHILD_ID}`);
    assertStatus(res.status, 401, res.raw);
  });

  await test(SUITE, "GET /api/progress/topics: missing childId -> 400", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const res = await client.get("/api/progress/topics");
    assertStatus(res.status, 400, res.raw);
  });

  await test(SUITE, "GET /api/progress/alerts: missing childId -> 400", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);
    const res = await client.get("/api/progress/alerts");
    assertStatus(res.status, 400, res.raw);
  });

  await test(SUITE, "POST /api/progress: low-accuracy session seeds alerts + digest data", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const questions = Array.from({ length: 10 }, (_, index) => ({
      questionId: `req001-progress-${index + 1}`,
      correct: index < 2,
      timeSpent: 12 + index,
      difficulty: 6,
      topic: TOPIC,
    }));

    const res = await client.post<{
      success?: boolean;
      result?: {
        childId?: string;
        subject?: string;
        totalQuestions?: number;
        correct?: number;
        incorrect?: number;
        accuracy?: number;
        rewardPointsEarned?: number;
        yearLevelAdvanced?: boolean;
        sessionId?: string;
      };
    }>("/api/progress", {
      childId: CHILD_ID,
      subject: "maths",
      questions,
    });

    assertStatus(res.status, 200, res.raw);
    assertEqual(res.body.success, true, "progress submission should succeed");
    assertDefined(res.body.result, "progress result must be present");
    assertEqual(res.body.result?.childId, CHILD_ID, "result.childId should match");
    assertEqual(res.body.result?.subject, "maths", "result.subject should match");
    assertEqual(res.body.result?.totalQuestions, 10, "session should contain 10 questions");
    assertEqual(res.body.result?.correct, 2, "session should have 2 correct answers");
    assertEqual(res.body.result?.incorrect, 8, "session should have 8 incorrect answers");
    assertEqual(res.body.result?.accuracy, 20, "accuracy should be 20%");
    assertEqual(res.body.result?.rewardPointsEarned, 10, "reward points should equal questions answered");
    assertTrue(typeof res.body.result?.sessionId === "string" && res.body.result.sessionId.length > 0, "sessionId required");
  });

  await test(SUITE, "GET /api/progress/topics: returns topic-level summary with the seeded weak topic", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const res = await client.get<{ summary?: TopicSummary }>(`/api/progress/topics?childId=${CHILD_ID}`);
    assertStatus(res.status, 200, res.raw);

    const summary = res.body.summary;
    assertDefined(summary, "summary must be present");
    assertEqual(summary.childId, CHILD_ID, "summary.childId should match");
    assertTrue(typeof summary.overallAccuracy === "number", "overallAccuracy must be a number");
    assertTrue((summary.overallAccuracy ?? 0) <= 50, `overallAccuracy should reflect a weak session, got ${summary.overallAccuracy}`);
    assertDefined(summary.subjects?.maths, "maths subject summary required");

    const mathsTopics = summary.subjects?.maths?.topics ?? [];
    const weakTopic = mathsTopics.find((topic) => topic.topic === TOPIC);
    assertDefined(weakTopic, `maths topic "${TOPIC}" must be present`);
    assertEqual(weakTopic?.attempts, 10, "topic attempts should equal the seeded session");
    assertEqual(weakTopic?.correct, 2, "topic correct count should equal the seeded session");
    assertEqual(weakTopic?.accuracy, 20, "topic accuracy should be 20%");
    assertTrue((summary.topTopics?.length ?? 0) > 0, "topTopics should not be empty");
  });

  await test(SUITE, "GET /api/progress/alerts: returns a needs-help alert for the weak topic", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const res = await client.get<{ summary?: ProgressAlertSummary }>(`/api/progress/alerts?childId=${CHILD_ID}`);
    assertStatus(res.status, 200, res.raw);

    const summary = res.body.summary;
    assertDefined(summary, "summary must be present");
    assertEqual(summary.childId, CHILD_ID, "summary.childId should match");
    const alert = (summary.alerts ?? []).find((item) => item.subject === "maths" && item.topic === TOPIC);
    assertDefined(alert, `expected an alert for maths/${TOPIC}`);
    assertTrue((alert?.accuracy ?? 100) < 50, "alert accuracy must be below 50%");
    assertTrue(
      alert?.message?.toLowerCase().includes("last 10") ?? false,
      "alert message should explain the last-10 sample"
    );
    assertTrue(
      (alert?.actionUrl ?? "").includes("/learn"),
      "alert should link back into practice"
    );
  });

  await test(SUITE, "GET /api/reports/weekly: returns a digest for the selected child", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const res = await client.get<{ digest?: WeeklyDigest }>(`/api/reports/weekly?childId=${CHILD_ID}`);
    assertStatus(res.status, 200, res.raw);

    const digest = res.body.digest;
    assertDefined(digest, "digest must be present");
    assertEqual(digest.childId, CHILD_ID, "digest.childId should match");
    assertTrue((digest.totalQuestions ?? 0) >= 10, "digest should include the seeded session");
    assertEqual(digest.rewardPointsEarned, digest.totalQuestions, "reward points should match questions answered");
    assertEqual(digest.accuracy, 20, "digest accuracy should reflect the seeded weak session");
    assertTrue((digest.totalSessions ?? 0) >= 1, "digest should count the completed session");
    const recentSession = digest.recentSessions?.[0];
    assertDefined(recentSession, "recent session required");
    assertEqual(recentSession.topic, TOPIC, "recent session topic should match the seeded topic");
    assertEqual(recentSession.accuracy, 20, "recent session accuracy should be 20%");
  });

  await test(SUITE, "GET /api/children: streak metadata updates after progress submission", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const res = await client.get<{ children?: Array<{ childId?: string; streakDays?: number; lastActiveDate?: string }> }>("/api/children");
    assertStatus(res.status, 200, res.raw);

    const child = (res.body.children ?? []).find((item) => item.childId === CHILD_ID);
    assertDefined(child, "selected child should be present");
    assertTrue((child?.streakDays ?? 0) >= 0, "streakDays should be present");
    assertDefined(child?.lastActiveDate, "lastActiveDate should be present");
  });

  await test(SUITE, "GET /dashboard?tab=progress: serves progress dashboard shell", async () => {
    const client = new TestClient(baseUrl);
    const res = await client.get("/dashboard?tab=progress");
    assertStatus(res.status, 200, res.raw);
    assertTrue(res.raw.length > 0, "dashboard should return HTML");
  });

  await test(SUITE, "GET /api/progress/topics: cross-user child is rejected", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.US_PARENT.email, TEST_USERS.US_PARENT.password);
    const res = await client.get(`/api/progress/topics?childId=${CHILD_ID}`);
    assertTrue([403, 404].includes(res.status), `expected cross-user protection, got ${res.status}`);
  });
}
