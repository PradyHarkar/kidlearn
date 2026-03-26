import { getInitialDifficultyForAgeGroup, shouldResetDifficulty } from "@/lib/adaptive";
import { getGradeConfig, getTopicsForGrade } from "@/lib/curriculum";
import { createDdb, getItem, scanItems, TABLES } from "@/lib/dynamodb";
import { resolveChildAgeGroup, toLegacyYearLevel } from "@/lib/learner";
import type { AgeGroup, Child, Country, Question, QuestionIssue, Subject, YearLevel } from "@/types";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";

interface CurriculumContext {
  country: Country;
  curriculumName: string;
  gradeDisplayName: string;
  ageGroup: AgeGroup;
  suggestedTopics: string[];
}

export interface QuestionsForChildResult {
  questions: Question[];
  difficulty: number;
  yearLevel: YearLevel;
  ageGroup: AgeGroup;
  totalAvailable: number;
  curriculumContext: CurriculumContext | null;
}

function getCurrentDifficulty(child: Child, subject: Subject): number {
  const ageGroup = resolveChildAgeGroup(child);
  const baselineDifficulty = getInitialDifficultyForAgeGroup(ageGroup);
  const baseDifficulty = subject === "maths"
    ? child.currentDifficultyMaths
    : subject === "science"
    ? (child.currentDifficultyScience || 1)
    : child.currentDifficultyEnglish;

  if (child.lastActiveDate && shouldResetDifficulty(child.lastActiveDate)) {
    return baselineDifficulty;
  }

  if ((child.stats?.totalQuestionsAttempted || 0) === 0) {
    return baselineDifficulty;
  }

  return baseDifficulty;
}

export const DEFAULT_QUESTION_SET_SIZE = 20;

function normalizeQuestionSignature(question: Question) {
  const questionText = question.questionText.trim().toLowerCase().replace(/\s+/g, " ");
  const answerText = question.answerOptions
    .map((option) => option.text.trim().toLowerCase().replace(/\s+/g, " "))
    .join("|");
  return `${questionText}::${answerText}`;
}

function dedupeQuestionsByContent(questions: Question[]): Question[] {
  const seen = new Set<string>();
  const deduped: Question[] = [];

  for (const question of questions) {
    const signature = normalizeQuestionSignature(question);
    if (seen.has(signature)) {
      continue;
    }
    seen.add(signature);
    deduped.push(question);
  }

  return deduped;
}

function buildAvailableQuestionPool(questions: Question[], blockedQuestionIds: Set<string>) {
  return dedupeQuestionsByContent(
    questions.filter((question) => !blockedQuestionIds.has(question.questionId))
  );
}

function selectQuestionsByDifficulty(
  questions: Question[],
  targetDifficulty: number,
  blockedQuestionIds: Set<string>
): Question[] {
  const deduped = buildAvailableQuestionPool(questions, blockedQuestionIds);
  let filtered = deduped.filter((q) => Math.abs(q.difficulty - targetDifficulty) <= 1);

  if (filtered.length < 5) {
    filtered = deduped.filter((q) => Math.abs(q.difficulty - targetDifficulty) <= 3);
  }

  if (filtered.length === 0) {
    filtered = deduped;
  }

  return filtered.sort(() => Math.random() - 0.5).slice(0, DEFAULT_QUESTION_SET_SIZE);
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

    // We do not need to pull the entire partition to serve a 20-question session.
    if (questions.length >= 1500) {
      break;
    }
  } while (lastEvaluatedKey);

  return questions;
}

async function loadReportedQuestionIds(): Promise<Set<string>> {
  const issues = (await scanItems(TABLES.QUESTION_ISSUES)) as QuestionIssue[];
  const blocked = new Set<string>();

  for (const issue of issues) {
    if (!issue.questionId) continue;
    if (issue.status === "resolved" || issue.status === "dismissed") continue;
    blocked.add(issue.questionId);
  }

  return blocked;
}

function mergeQuestionSets(...questionSets: Question[][]): Question[] {
  const seen = new Set<string>();
  const merged: Question[] = [];

  for (const set of questionSets) {
    for (const question of set) {
      const key = question.questionId || `${question.pk}:${question.questionText}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push(question);
    }
  }

  return merged;
}

function buildCurriculumContext(child: Child, ageGroup: AgeGroup, subject: Subject): CurriculumContext | null {
  const country = (child.country as Country) ?? "AU";
  const gradeConfig = child.grade ? getGradeConfig(country, child.grade) : null;

  if (!gradeConfig) {
    return null;
  }

  return {
    country,
    curriculumName: gradeConfig.curriculumName,
    gradeDisplayName: gradeConfig.displayName,
    ageGroup,
    suggestedTopics: getTopicsForGrade(ageGroup, subject, country),
  };
}

export async function getQuestionsForChild(userId: string, childId: string, subject: Subject): Promise<QuestionsForChildResult | null> {
  const child = await getItem(TABLES.CHILDREN, { userId, childId });
  if (!child) {
    return null;
  }

  const typedChild = child as Child;
  const currentDifficulty = getCurrentDifficulty(typedChild, subject);
  const ageGroup = resolveChildAgeGroup(typedChild);
  const childCountry = (typedChild.country as Country | undefined) ?? "AU";
  const countrySpecificQuestions = await loadQuestionsForPartition(`${subject}#${ageGroup}#${childCountry}`);
  const genericQuestions = await loadQuestionsForPartition(`${subject}#${ageGroup}`);
  const typedQuestions = countrySpecificQuestions.length > 0
    ? countrySpecificQuestions
    : mergeQuestionSets(genericQuestions);
  const blockedQuestionIds = await loadReportedQuestionIds();
  const availableQuestions = buildAvailableQuestionPool(typedQuestions, blockedQuestionIds);

  return {
    questions: selectQuestionsByDifficulty(typedQuestions, currentDifficulty, blockedQuestionIds),
    difficulty: currentDifficulty,
    yearLevel: toLegacyYearLevel(ageGroup),
    ageGroup,
    totalAvailable: availableQuestions.length,
    curriculumContext: buildCurriculumContext(typedChild, ageGroup, subject),
  };
}
