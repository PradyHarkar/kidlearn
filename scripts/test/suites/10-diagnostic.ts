/**
 * DIAGNOSTIC TEST SUITE
 * Verifies 5-question maths diagnostic selection and calibrated difficulty write-back.
 */

import { TestClient } from "../lib/http";
import {
  test,
  startSuite,
  assertStatus,
  assertDefined,
  assertEqual,
  assertArrayLength,
  assertTrue,
} from "../lib/assert";
import { TEST_CHILDREN, TEST_USERS } from "../fixtures";

const SUITE = "diagnostic";

interface DiagnosticGetResponse {
  diagnosticComplete?: boolean;
  childId?: string;
  baselineDifficulty?: number;
  calibratedDifficulty?: number;
  nextUrl?: string;
  questions?: Array<{
    questionId?: string;
    difficulty?: number;
    answerOptions?: Array<{ id?: string }>;
  }>;
}

interface DiagnosticSubmitResponse {
  success?: boolean;
  error?: string;
  result?: {
    childId?: string;
    subject?: string;
    totalQuestions?: number;
    correctAnswers?: number;
    baselineDifficulty?: number;
    calibratedDifficulty?: number;
    difficultyDelta?: number;
    diagnosticComplete?: boolean;
    nextUrl?: string;
  };
}

export async function runDiagnosticSuite(baseUrl: string) {
  startSuite("10  DIAGNOSTIC");

  await test(SUITE, "GET /api/diagnostic: unauthenticated -> 401", async () => {
    const anon = new TestClient(baseUrl);
    const res = await anon.get(`/api/diagnostic?childId=${TEST_CHILDREN.US_GRADE5.childId}`);
    assertStatus(res.status, 401, res.raw);
  });

  await test(SUITE, "GET /api/diagnostic: missing childId -> 400", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.US_PARENT.email, TEST_USERS.US_PARENT.password);
    const res = await client.get("/api/diagnostic");
    assertStatus(res.status, 400, res.raw);
  });

  await test(SUITE, "GET /api/diagnostic: US grade5 child -> 5 maths questions + baseline difficulty", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.US_PARENT.email, TEST_USERS.US_PARENT.password);

    const res = await client.get<DiagnosticGetResponse>(`/api/diagnostic?childId=${TEST_CHILDREN.US_GRADE5.childId}`);
    assertStatus(res.status, 200, res.raw);
    const body = res.body as DiagnosticGetResponse;
    assertTrue(body.diagnosticComplete === false, "diagnostic should not be complete before submission");
    assertEqual(body.childId, TEST_CHILDREN.US_GRADE5.childId, "childId");
    assertEqual(body.baselineDifficulty, 6, "baseline difficulty for year5");
    assertDefined(body.nextUrl, "nextUrl should be present");
    assertDefined(body.questions, "questions should be present");
    assertArrayLength(body.questions!, 5, "diagnostic must return 5 questions");
  });

  await test(SUITE, "POST /api/diagnostic/submit: all correct -> calibrated maths difficulty increases", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.US_PARENT.email, TEST_USERS.US_PARENT.password);

    const diagnosticRes = await client.get<DiagnosticGetResponse>(`/api/diagnostic?childId=${TEST_CHILDREN.US_GRADE5.childId}`);
    if (diagnosticRes.status !== 200) {
      throw new Error(`Expected diagnostic GET 200, got ${diagnosticRes.status}: ${diagnosticRes.raw}`);
    }

    const questions = (diagnosticRes.body as DiagnosticGetResponse).questions || [];
    const answers = questions.map((question) => ({
      questionId: question.questionId!,
      answerId: question.answerOptions?.[0]?.id || "a",
    }));

    const res = await client.post<DiagnosticSubmitResponse>("/api/diagnostic/submit", {
      childId: TEST_CHILDREN.US_GRADE5.childId,
      answers,
    });

    assertStatus(res.status, 200, res.raw);
    const body = res.body as DiagnosticSubmitResponse;
    assertTrue(body.success === true, "success should be true");
    assertEqual(body.result?.subject, "maths", "subject");
    assertEqual(body.result?.totalQuestions, 5, "total diagnostic questions");
    assertEqual(body.result?.correctAnswers, 5, "all 5 should score correct");
    assertEqual(body.result?.baselineDifficulty, 6, "baseline difficulty");
    assertEqual(body.result?.difficultyDelta, 3, "difficulty delta");
    assertEqual(body.result?.calibratedDifficulty, 9, "calibrated maths difficulty");
    assertTrue(body.result?.diagnosticComplete === true, "diagnostic should now be complete");

    const childrenRes = await client.get<{ children?: Array<{ childId?: string; currentDifficultyMaths?: number; diagnosticComplete?: boolean }> }>("/api/children");
    assertStatus(childrenRes.status, 200, childrenRes.raw);
    const updatedChild = (childrenRes.body.children || []).find((child) => child.childId === TEST_CHILDREN.US_GRADE5.childId);
    assertDefined(updatedChild, "updated child must be visible");
    assertEqual(updatedChild?.currentDifficultyMaths, 9, "child maths difficulty should be updated");
    assertTrue(updatedChild?.diagnosticComplete === true, "diagnosticComplete should be true on child");
  });

  await test(SUITE, "POST /api/diagnostic/submit: repeat submit after completion -> 409", async () => {
    const client = new TestClient(baseUrl);
    await client.login(TEST_USERS.US_PARENT.email, TEST_USERS.US_PARENT.password);

    const res = await client.post<DiagnosticSubmitResponse>("/api/diagnostic/submit", {
      childId: TEST_CHILDREN.US_GRADE5.childId,
      answers: Array.from({ length: 5 }, (_, index) => ({
        questionId: `repeat-${index}`,
        answerId: "a",
      })),
    });

    assertStatus(res.status, 409, res.raw);
    const body = res.body as DiagnosticSubmitResponse;
    assertEqual(body.error, "Diagnostic already completed", "repeat submission should be rejected");
    assertDefined(body.result, "existing result should be returned");
  });
}
