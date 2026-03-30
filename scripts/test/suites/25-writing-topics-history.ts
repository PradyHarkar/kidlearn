import { test, startSuite, assertEqual, assertTrue, assertStatus, assertDefined } from "../lib/assert";
import { TestClient } from "../lib/http";
import { TEST_CHILDREN, TEST_USERS } from "../fixtures";
import {
  applyTopicPreferenceRules,
  buildDefaultTopicPreferenceRules,
  buildLegacyTopicPreferences,
  buildTopicPreferenceRuleSummary,
  normalizeTopicPreferenceRules,
} from "../../../lib/services/topic-preferences";

const SUITE = "writing-topics-history";

export async function runWritingTopicsHistorySuite(baseUrl: string) {
  startSuite("25  WRITING TOPICS + HISTORY");

  await test(SUITE, "topic preference helpers: defaults are sorted and include/exclude rules work", async () => {
    const child = {
      ageGroup: "year3" as const,
      yearLevel: "year3" as const,
      country: "AU" as const,
    };

    const defaults = buildDefaultTopicPreferenceRules(child);
    const normalized = normalizeTopicPreferenceRules(defaults, child);
    const summary = buildTopicPreferenceRuleSummary(defaults, child);
    const legacy = buildLegacyTopicPreferences(normalized, child);

    assertEqual(normalized.english?.include?.length || 0, 0, "english defaults should start neutral");
    assertTrue((summary.find((item) => item.subject === "english")?.options.length || 0) > 0, "english topic options should be available");
    assertTrue(Array.isArray(legacy), "legacy preference list should be an array");

    const filtered = applyTopicPreferenceRules(
      ["zoo", "spaceship", "castle", "dragon"],
      { include: ["castle", "dragon"], exclude: ["dragon"] }
    );
    assertEqual(filtered.join(","), "castle", "include/exclude filtering should keep only included non-excluded topics");
  });

  await test(SUITE, "GET/PATCH preferences: structured include/exclude save and load", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const patchRes = await client.patch<{
      success?: boolean;
      topicPreferenceRules?: Record<string, { include?: string[]; exclude?: string[] }>;
      topicPreferences?: string[];
    }>(`/api/children/${TEST_CHILDREN.AU_YEAR3.childId}/preferences`, {
      topicPreferencesBySubject: {
        english: { include: ["Grammar", "Narrative"], exclude: ["Poetry"] },
        maths: { include: ["Geometry"], exclude: [] },
        science: { include: [], exclude: ["Weather"] },
      },
    });

    assertStatus(patchRes.status, 200, patchRes.raw);
    assertEqual(patchRes.body.success, true, "patch should succeed");
    assertEqual(patchRes.body.topicPreferenceRules?.english?.include?.join(","), "Grammar,Narrative", "english include list should persist");
    assertEqual(patchRes.body.topicPreferenceRules?.english?.exclude?.join(","), "Poetry", "english exclude list should persist");
    assertEqual(patchRes.body.topicPreferenceRules?.maths?.include?.join(","), "Geometry", "maths include list should persist");
    assertEqual(patchRes.body.topicPreferenceRules?.science?.exclude?.join(","), "Weather", "science exclude list should persist");

    const getRes = await client.get<{
      topicPreferenceRules?: Record<string, { include?: string[]; exclude?: string[] }>;
      topicPreferences?: string[];
    }>(`/api/children/${TEST_CHILDREN.AU_YEAR3.childId}/preferences`);

    assertStatus(getRes.status, 200, getRes.raw);
    assertEqual(getRes.body.topicPreferenceRules?.english?.include?.join(","), "Grammar,Narrative", "saved english include list should reload");
    assertEqual(getRes.body.topicPreferenceRules?.english?.exclude?.join(","), "Poetry", "saved english exclude list should reload");
    assertEqual(getRes.body.topicPreferenceRules?.science?.exclude?.join(","), "Weather", "saved science exclude list should reload");
    assertTrue((getRes.body.topicPreferences?.length || 0) > 0, "legacy topic list should be generated");
  });

  await test(SUITE, "GET /api/history returns answered question text and answers", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const submitRes = await client.post("/api/progress", {
      childId: TEST_CHILDREN.AU_YEAR3.childId,
      subject: "english",
      questions: [
        {
          questionId: "history-q-001",
          correct: true,
          timeSpent: 12,
          difficulty: 6,
          topic: "grammar",
          questionText: "Which sentence is correct?",
          chosenAnswer: "The cat runs fast.",
          correctAnswer: "The cat runs fast.",
        },
        {
          questionId: "history-q-002",
          correct: false,
          timeSpent: 18,
          difficulty: 6,
          topic: "narrative",
          questionText: "Which word best describes the castle?",
          chosenAnswer: "Boring",
          correctAnswer: "Shining",
        },
      ],
    });

    assertStatus(submitRes.status, 200, submitRes.raw);

    const historyRes = await client.get<{
      childId?: string;
      sessions?: Array<{
        sessionId?: string;
        subject?: string;
        date?: string;
        totalTimeSpent?: number;
        questions?: Array<{
          questionId?: string;
          questionText?: string;
          chosenAnswer?: string;
          correctAnswer?: string;
          answeredAt?: string;
          timeSpent?: number;
        }>;
      }>;
    }>(`/api/history?childId=${TEST_CHILDREN.AU_YEAR3.childId}&subject=english&limit=5`);

    assertStatus(historyRes.status, 200, historyRes.raw);
    assertEqual(historyRes.body.childId, TEST_CHILDREN.AU_YEAR3.childId, "history should return the requested child");
    assertTrue((historyRes.body.sessions?.length || 0) > 0, "history should include at least one session");
    const targetSession = historyRes.body.sessions?.find((session) =>
      session.questions?.some((question) => question.questionId === "history-q-001")
    );
    assertDefined(targetSession, "history should include the submitted session");
    assertDefined(targetSession?.date, "session date should be present");
    assertEqual(targetSession?.subject, "english", "session subject should be english");
    assertTrue((targetSession?.questions?.length || 0) >= 2, "session should include saved question answers");
    assertEqual(targetSession?.totalTimeSpent, 30, "session total time should sum per-question timing");

    const firstQuestion = targetSession?.questions?.find((question) => question.questionId === "history-q-001");
    const secondQuestion = targetSession?.questions?.find((question) => question.questionId === "history-q-002");
    assertDefined(firstQuestion, "first history question should be present");
    assertDefined(secondQuestion, "second history question should be present");
    assertEqual(firstQuestion?.questionText, "Which sentence is correct?", "question text should round-trip");
    assertEqual(firstQuestion?.chosenAnswer, "The cat runs fast.", "chosen answer should round-trip");
    assertEqual(secondQuestion?.correctAnswer, "Shining", "correct answer should round-trip");
    assertDefined(firstQuestion?.answeredAt, "first question answeredAt should be present");
    assertDefined(secondQuestion?.answeredAt, "second question answeredAt should be present");
  });
}
