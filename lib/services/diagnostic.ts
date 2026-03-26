import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { getInitialDifficultyForAgeGroup } from "@/lib/adaptive";
import { resolveChildAgeGroup, toLegacyYearLevel } from "@/lib/learner";
import { createDdb, getItem, TABLES, updateItem } from "@/lib/dynamodb";
import type { Child, DiagnosticQuestion, DiagnosticResult, Question } from "@/types";

export const DIAGNOSTIC_QUESTION_COUNT = 5;
const MIN_DIAGNOSTIC_DIFFICULTY = 3;
const MAX_DIAGNOSTIC_DIFFICULTY = 7;

function clampDifficulty(value: number) {
  return Math.max(1, Math.min(10, value));
}

async function loadQuestionsForPartition(pk: string): Promise<Question[]> {
  const ddb = createDdb();
  const questions: Question[] = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const result = await ddb.send(new QueryCommand({
      TableName: TABLES.QUESTIONS,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: { ":pk": pk },
      ExclusiveStartKey: lastEvaluatedKey,
      Limit: 250,
    }));

    questions.push(...(result.Items as Question[] | undefined ?? []));
    lastEvaluatedKey = result.LastEvaluatedKey;

    if (questions.length >= 1000) {
      break;
    }
  } while (lastEvaluatedKey);

  return questions;
}

function mergeQuestionSets(...questionSets: Question[][]): Question[] {
  const seen = new Set<string>();
  const merged: Question[] = [];

  for (const set of questionSets) {
    for (const question of set) {
      const key = question.questionId || `${question.pk}:${question.questionText}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(question);
    }
  }

  return merged;
}

function desiredDiagnosticDifficulties(baselineDifficulty: number): number[] {
  return [
    clampDifficulty(Math.max(MIN_DIAGNOSTIC_DIFFICULTY, baselineDifficulty - 2)),
    clampDifficulty(Math.max(MIN_DIAGNOSTIC_DIFFICULTY, baselineDifficulty - 1)),
    clampDifficulty(Math.max(MIN_DIAGNOSTIC_DIFFICULTY, Math.min(MAX_DIAGNOSTIC_DIFFICULTY, baselineDifficulty))),
    clampDifficulty(Math.min(MAX_DIAGNOSTIC_DIFFICULTY, baselineDifficulty + 1)),
    clampDifficulty(Math.min(MAX_DIAGNOSTIC_DIFFICULTY, baselineDifficulty + 2)),
  ];
}

function selectDiagnosticQuestions(questions: Question[], baselineDifficulty: number): Question[] {
  const preferredPool = questions.filter((question) =>
    question.difficulty >= MIN_DIAGNOSTIC_DIFFICULTY && question.difficulty <= MAX_DIAGNOSTIC_DIFFICULTY
  );
  const pool = preferredPool.length >= DIAGNOSTIC_QUESTION_COUNT ? preferredPool : questions;
  const remaining = [...pool];
  const selected: Question[] = [];

  for (const targetDifficulty of desiredDiagnosticDifficulties(baselineDifficulty)) {
    if (!remaining.length) break;

    remaining.sort((a, b) => {
      const distance = Math.abs(a.difficulty - targetDifficulty) - Math.abs(b.difficulty - targetDifficulty);
      if (distance !== 0) return distance;
      return 0.5 - Math.random();
    });

    const next = remaining.shift();
    if (next) {
      selected.push(next);
    }
  }

  while (selected.length < DIAGNOSTIC_QUESTION_COUNT && remaining.length > 0) {
    const index = Math.floor(Math.random() * remaining.length);
    selected.push(...remaining.splice(index, 1));
  }

  return selected.slice(0, DIAGNOSTIC_QUESTION_COUNT);
}

function toDiagnosticQuestion(question: Question): DiagnosticQuestion {
  return {
    questionId: question.questionId,
    questionText: question.questionText,
    answerOptions: question.answerOptions,
    difficulty: question.difficulty,
    topics: question.topics,
    hint: question.hint,
  };
}

function calculateDifficultyDelta(correctAnswers: number) {
  if (correctAnswers >= 5) return 3;
  if (correctAnswers === 4) return 2;
  if (correctAnswers === 3) return 1;
  if (correctAnswers === 2) return 0;
  return -1;
}

export async function getDiagnosticQuestionsForChild(userId: string, childId: string) {
  const childRecord = await getItem(TABLES.CHILDREN, { userId, childId });
  if (!childRecord) {
    return null;
  }

  const child = childRecord as Child;
  const ageGroup = resolveChildAgeGroup(child);
  const baselineDifficulty = getInitialDifficultyForAgeGroup(ageGroup);
  const country = child.country ?? "AU";
  const countrySpecificQuestions = await loadQuestionsForPartition(`maths#${ageGroup}#${country}`);
  const genericQuestions = await loadQuestionsForPartition(`maths#${ageGroup}`);
  const allQuestions = mergeQuestionSets(countrySpecificQuestions, genericQuestions);

  return {
    child,
    baselineDifficulty,
    nextUrl: `/learn?child=${childId}&subject=maths`,
    questions: selectDiagnosticQuestions(allQuestions, baselineDifficulty).map(toDiagnosticQuestion),
  };
}

export async function submitDiagnosticForChild(params: {
  userId: string;
  childId: string;
  answers: Array<{ questionId: string; answerId: string }>;
}): Promise<DiagnosticResult | null> {
  const diagnostic = await getDiagnosticQuestionsForChild(params.userId, params.childId);
  if (!diagnostic) {
    return null;
  }

  const { child, baselineDifficulty, nextUrl } = diagnostic;
  const ageGroup = resolveChildAgeGroup(child);
  const country = child.country ?? "AU";
  const countrySpecificQuestions = await loadQuestionsForPartition(`maths#${ageGroup}#${country}`);
  const genericQuestions = await loadQuestionsForPartition(`maths#${ageGroup}`);
  const allQuestions = mergeQuestionSets(countrySpecificQuestions, genericQuestions);
  const questionMap = new Map(allQuestions.map((question) => [question.questionId, question]));

  let correctAnswers = 0;

  for (const answer of params.answers) {
    const question = questionMap.get(answer.questionId);
    if (!question) {
      continue;
    }

    const option = question.answerOptions.find((item) => item.id === answer.answerId);
    if (option?.isCorrect) {
      correctAnswers += 1;
    }
  }

  const difficultyDelta = calculateDifficultyDelta(correctAnswers);
  const calibratedDifficulty = clampDifficulty(baselineDifficulty + difficultyDelta);

  await updateItem(
    TABLES.CHILDREN,
    { userId: params.userId, childId: params.childId },
    "SET currentDifficultyMaths = :difficulty, diagnosticComplete = :diagnosticComplete, lastActiveDate = :lastActiveDate",
    {
      ":difficulty": calibratedDifficulty,
      ":diagnosticComplete": true,
      ":lastActiveDate": new Date().toISOString(),
    }
  );

  return {
    childId: params.childId,
    subject: "maths",
    totalQuestions: DIAGNOSTIC_QUESTION_COUNT,
    correctAnswers,
    baselineDifficulty,
    calibratedDifficulty,
    difficultyDelta,
    diagnosticComplete: true,
    nextUrl,
  };
}

export function buildDiagnosticCompletedResult(child: Child): DiagnosticResult {
  const baselineDifficulty = getInitialDifficultyForAgeGroup(resolveChildAgeGroup(child));
  const currentDifficulty = child.currentDifficultyMaths || baselineDifficulty;

  return {
    childId: child.childId,
    subject: "maths",
    totalQuestions: DIAGNOSTIC_QUESTION_COUNT,
    correctAnswers: 0,
    baselineDifficulty,
    calibratedDifficulty: currentDifficulty,
    difficultyDelta: currentDifficulty - baselineDifficulty,
    diagnosticComplete: true,
    nextUrl: `/learn?child=${child.childId}&subject=maths`,
  };
}

export async function getChildForDiagnostic(userId: string, childId: string) {
  const childRecord = await getItem(TABLES.CHILDREN, { userId, childId });
  return (childRecord as Child | null) ?? null;
}

export function getDiagnosticLegacyYearLevel(child: Child) {
  return toLegacyYearLevel(resolveChildAgeGroup(child));
}
