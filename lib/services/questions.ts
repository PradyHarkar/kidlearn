import { shouldResetDifficulty } from "@/lib/adaptive";
import { getGradeConfig, getTopicsForGrade } from "@/lib/curriculum";
import { getItem, queryItems, TABLES } from "@/lib/dynamodb";
import { resolveChildAgeGroup, toLegacyYearLevel } from "@/lib/learner";
import type { AgeGroup, Child, Country, Question, Subject, YearLevel } from "@/types";

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
  const baseDifficulty = subject === "maths"
    ? child.currentDifficultyMaths
    : subject === "science"
    ? (child.currentDifficultyScience || 1)
    : child.currentDifficultyEnglish;

  if (child.lastActiveDate && shouldResetDifficulty(child.lastActiveDate)) {
    return 1;
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
  const allQuestions = await queryItems(
    TABLES.QUESTIONS,
    "pk = :pk",
    { ":pk": `${subject}#${ageGroup}` },
    undefined,
    undefined,
    undefined,
    200
  );

  const typedQuestions = allQuestions as Question[];

  return {
    questions: selectQuestionsByDifficulty(typedQuestions, currentDifficulty),
    difficulty: currentDifficulty,
    yearLevel: toLegacyYearLevel(ageGroup),
    ageGroup,
    totalAvailable: typedQuestions.length,
    curriculumContext: buildCurriculumContext(typedChild, ageGroup, subject),
  };
}
