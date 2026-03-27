import { TestClient } from "../lib/http";
import { test, startSuite, assertStatus, assertTrue, assertDefined, assertEqual } from "../lib/assert";
import { TEST_USERS, TEST_CHILDREN } from "../fixtures";
import { getWritingCurriculum } from "../../../lib/services/writing-curriculum";

const SUITE = "writing-studio";

export async function runWritingStudioSuite(baseUrl: string) {
  startSuite("24  ENGLISH WRITING STUDIO");

  await test(SUITE, "writing curriculum: AU Year 3 is enabled and others stay limited", async () => {
    const auYear3 = getWritingCurriculum({
      country: "AU",
      ageGroup: "year3",
      yearLevel: "year3",
    });
    const auYear5 = getWritingCurriculum({
      country: "AU",
      ageGroup: "year5",
      yearLevel: "year5",
    });

    assertTrue(auYear3.enabled, "AU Year 3 should be enabled for the MVP");
    assertTrue(!auYear5.enabled, "Other year levels should remain gated for MVP");
    assertEqual(auYear3.availableModes.length, 2, "Year 3 should expose two writing modes");
  });

  await test(SUITE, "POST /api/writing/session round-trips a draft with pen data", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const saveRes = await client.post<{
      success?: boolean;
      session?: {
        sessionId?: string;
        writingMode?: string;
        currentStepIndex?: number;
        steps?: Array<{ label?: string; content?: string; penImageDataUrl?: string | null }>;
      };
    }>("/api/writing/session", {
      childId: TEST_CHILDREN.AU_YEAR3_DIGEST.childId,
      writingMode: "narrative",
      country: "AU",
      ageGroup: "year3",
      steps: [
        {
          stepName: "setting",
          label: "Setting",
          content: "The castle glowed at sunrise.",
          feedback: ["Great start!"],
          words: 5,
          penImageDataUrl: "data:image/png;base64,abc",
        },
      ],
      currentStepIndex: 0,
      isComplete: false,
      originalDraft: "The castle glowed at sunrise.",
      finalDraft: "The castle glowed at sunrise.",
      revisedDraft: "The castle glowed at sunrise.",
    });
    assertStatus(saveRes.status, 200, saveRes.raw);
    assertEqual(saveRes.body.success, true, "save should succeed");
    assertDefined(saveRes.body.session?.sessionId, "session id should be returned");
    assertEqual(saveRes.body.session?.writingMode, "narrative", "writing mode should persist");
    assertEqual(saveRes.body.session?.currentStepIndex, 0, "current step should persist");

    const loadRes = await client.get<{
      session?: {
        writingMode?: string;
        currentStepIndex?: number;
        steps?: Array<{ label?: string; content?: string; penImageDataUrl?: string | null }>;
      } | null;
    }>(`/api/writing/session?childId=${TEST_CHILDREN.AU_YEAR3_DIGEST.childId}&mode=narrative`);
    assertStatus(loadRes.status, 200, loadRes.raw);
    assertDefined(loadRes.body.session, "saved session should be readable");
    assertEqual(loadRes.body.session?.writingMode, "narrative", "round-tripped mode should match");
    assertEqual(loadRes.body.session?.steps?.[0]?.content, "The castle glowed at sunrise.", "step content should round-trip");
    assertEqual(loadRes.body.session?.steps?.[0]?.penImageDataUrl, "data:image/png;base64,abc", "pen data should round-trip");
  });

  await test(SUITE, "POST /api/writing/submit awards points and closes the draft", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.AU_PARENT.email, TEST_USERS.AU_PARENT.password);

    const before = await client.get<{
      children?: Array<{
        childId?: string;
        rewardPoints?: number;
        stats?: {
          writingSessionsCompleted?: number;
          writingWordsWritten?: number;
        };
      }>;
    }>("/api/children");
    assertStatus(before.status, 200, before.raw);
    const beforeChild = (before.body.children || []).find((child) => child.childId === TEST_CHILDREN.AU_YEAR3_DIGEST.childId);
    const beforePoints = beforeChild?.rewardPoints || 0;
    const beforeCompleted = beforeChild?.stats?.writingSessionsCompleted || 0;

    const submitRes = await client.post<{
      success?: boolean;
      result?: {
        pointsEarned?: number;
        totalWords?: number;
        comparison?: { summary?: string };
      };
    }>("/api/writing/submit", {
      childId: TEST_CHILDREN.AU_YEAR3_DIGEST.childId,
      writingMode: "narrative",
      steps: [
        {
          stepName: "setting",
          label: "Setting",
          content: "The castle glowed at sunrise.",
          feedback: ["Great start!"],
          words: 5,
        },
        {
          stepName: "character",
          label: "Character",
          content: "A brave child walked inside with a golden key.",
          feedback: ["Nice detail!"],
          words: 9,
        },
        {
          stepName: "problem",
          label: "Problem",
          content: "The door was locked by a clever puzzle.",
          feedback: ["Try adding more detail."],
          words: 8,
        },
        {
          stepName: "action",
          label: "Action",
          content: "Next, the child solved it carefully.",
          feedback: ["Great sequencing!"],
          words: 6,
        },
        {
          stepName: "ending",
          label: "Ending",
          content: "The castle opened and everyone cheered.",
          feedback: ["Nice ending!"],
          words: 6,
        },
      ],
      originalDraft: "The castle glowed at sunrise.",
      revisedDraft: "The castle glowed at sunrise. A brave child walked inside with a golden key.",
      finalDraft: "The castle glowed at sunrise. A brave child walked inside with a golden key.",
    });
    assertStatus(submitRes.status, 200, submitRes.raw);
    assertEqual(submitRes.body.success, true, "submit should succeed");
    assertTrue((submitRes.body.result?.pointsEarned || 0) > 0, "writing should award points");
    assertTrue((submitRes.body.result?.totalWords || 0) > 0, "writing should report words");
    assertTrue(!!submitRes.body.result?.comparison?.summary, "comparison summary should exist");

    const after = await client.get<{
      children?: Array<{
        childId?: string;
        rewardPoints?: number;
        stats?: {
          writingSessionsCompleted?: number;
          writingWordsWritten?: number;
        };
      }>;
    }>("/api/children");
    assertStatus(after.status, 200, after.raw);
    const afterChild = (after.body.children || []).find((child) => child.childId === TEST_CHILDREN.AU_YEAR3_DIGEST.childId);
    assertTrue((afterChild?.rewardPoints || 0) > beforePoints, "reward points should increase after writing completion");
    assertTrue((afterChild?.stats?.writingSessionsCompleted || 0) > beforeCompleted, "writing completion counter should increase");

    const resumeRes = await client.get<{ session?: unknown }>(`/api/writing/session?childId=${TEST_CHILDREN.AU_YEAR3_DIGEST.childId}&mode=narrative`);
    assertStatus(resumeRes.status, 200, resumeRes.raw);
    assertEqual(resumeRes.body.session ?? null, null, "completed writing draft should not stay active");
  });
}
