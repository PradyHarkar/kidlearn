import { getInitialDifficultyForAgeGroup, shouldResetDifficulty } from "@/lib/adaptive";
import { getGradeConfig, getTopicsForGrade } from "@/lib/curriculum";
import { createDdb, getItem, TABLES } from "@/lib/dynamodb";
import { resolveChildAgeGroup, toLegacyYearLevel } from "@/lib/learner";
import type { AgeGroup, Child, Country, Question, Subject, YearLevel } from "@/types";
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

function selectQuestionsByDifficulty(questions: Question[], targetDifficulty: number): Question[] {
  let filtered = questions.filter((q) => Math.abs(q.difficulty - targetDifficulty) <= 1);

  if (filtered.length < 5) {
    filtered = questions.filter((q) => Math.abs(q.difficulty - targetDifficulty) <= 3);
  }

  if (filtered.length === 0) {
    filtered = questions;
  }

  return filtered.sort(() => Math.random() - 0.5).slice(0, 10);
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

    // We do not need to pull the entire partition to serve a 10-question session.
    if (questions.length >= 1500) {
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

  return {
    questions: selectQuestionsByDifficulty(typedQuestions, currentDifficulty),
    difficulty: currentDifficulty,
    yearLevel: toLegacyYearLevel(ageGroup),
    ageGroup,
    totalAvailable: typedQuestions.length,
    curriculumContext: buildCurriculumContext(typedChild, ageGroup, subject),
  };
}
