import { getInitialDifficultyForAgeGroup, shouldResetDifficulty } from "@/lib/adaptive";
import { getGradeConfig, getTopicsForGrade } from "@/lib/curriculum";
import { createDdb, getItem, scanItems, TABLES } from "@/lib/dynamodb";
import { resolveChildAgeGroup, toLegacyYearLevel } from "@/lib/learner";
import { getDefaultChildPreferences, getLegacyTileThemeIdFromChildTheme, resolveChildThemeKey } from "@/lib/services/tile-themes";
import type { AgeGroup, Child, ChildJourneyTheme, Country, Question, QuestionIssue, Subject, TopicPreferenceState, YearLevel } from "@/types";
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
  country: Country;
  totalAvailable: number;
  curriculumContext: CurriculumContext | null;
  appearance: ChildJourneyTheme;
}

function getCurrentDifficulty(child: Child, subject: Subject): number {
  const ageGroup = resolveChildAgeGroup(child);
  const baselineDifficulty = getInitialDifficultyForAgeGroup(ageGroup);

  if (child.lastActiveDate && shouldResetDifficulty(child.lastActiveDate)) {
    return baselineDifficulty;
  }

  if ((child.stats?.totalQuestionsAttempted || 0) === 0) {
    return baselineDifficulty;
  }

  const raw = subject === "maths"
    ? child.currentDifficultyMaths
    : subject === "science"
    ? child.currentDifficultyScience
    : child.currentDifficultyEnglish;

  // Guard: if the stored field is missing or out of range, fall back to baseline
  if (!raw || raw < 1 || raw > 10) {
    return baselineDifficulty;
  }

  return raw;
}

export const DEFAULT_QUESTION_SET_SIZE = 20;
const GENERIC_TOPICS = new Set([
  "test",
  "test-topic",
  "general",
  "maths",
  "english",
  "science",
  "benchmark family",
]);

function normalizeQuestionSignature(question: Question) {
  const questionText = question.questionText.trim().toLowerCase().replace(/\s+/g, " ");
  // Sort options before joining so two questions that are identical but have
  // answer options stored in different order are correctly identified as duplicates.
  const answerText = question.answerOptions
    .map((option) => option.text.trim().toLowerCase().replace(/\s+/g, " "))
    .sort()
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

function capitalizeLeadingLetter(text: string): string {
  const leadingWhitespace = text.match(/^\s*/)?.[0] ?? "";
  const body = text.slice(leadingWhitespace.length);
  if (!body) return text.trim();
  return leadingWhitespace + body.charAt(0).toUpperCase() + body.slice(1);
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = Math.imul(state ^ (state >>> 15), 2246822519) >>> 0;
    state ^= state + Math.imul(state ^ (state >>> 7), 3266489917);
    return (state >>> 0) / 0x100000000;
  };
}

function shuffleWithSeed<T>(values: T[], seedSource: string): T[] {
  const shuffled = [...values];
  const random = seededRandom(hashString(seedSource));

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function prepareQuestionForDelivery(question: Question): Question {
  const answerOptions = shuffleWithSeed(
    question.answerOptions ?? [],
    `${question.questionId}:${question.pk}:${question.questionText}`
  );

  if (answerOptions.length > 1 && answerOptions[0]?.isCorrect) {
    [answerOptions[0], answerOptions[1]] = [answerOptions[1], answerOptions[0]];
  }

  return {
    ...question,
    questionText: capitalizeLeadingLetter(question.questionText),
    answerOptions,
  };
}

function buildAvailableQuestionPool(questions: Question[], blockedQuestionIds: Set<string>) {
  return dedupeQuestionsByContent(
    questions.filter((question) => !blockedQuestionIds.has(question.questionId))
  );
}

function normalizeTopic(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function primaryQuestionTopic(question: Question): string {
  const topics = question.topics ?? [];
  const preferred = topics.find((topic) => {
    const normalized = normalizeTopic(topic);
    return !!normalized && !GENERIC_TOPICS.has(normalized);
  });

  return normalizeTopic(preferred ?? topics[0] ?? question.subject ?? "general");
}

function filterByTopicPreferences(
  questions: Question[],
  subject: Subject,
  preferences: string[] | undefined,
  rules?: Partial<Record<Subject, TopicPreferenceState>>
) {
  const subjectRules = rules?.[subject];
  if (subjectRules) {
    const matching = questions.filter((question) => {
      const normalizedTopics = (question.topics || []).map(normalizeTopic);
      const hasExclude = normalizedTopics.some((topic) => (subjectRules.exclude || []).some((item) => normalizeTopic(item) === topic));
      if (hasExclude) return false;

      if (!(subjectRules.include || []).length) {
        return true;
      }

      return normalizedTopics.some((topic) => (subjectRules.include || []).some((item) => normalizeTopic(item) === topic));
    });

    return matching.length >= DEFAULT_QUESTION_SET_SIZE / 2 ? matching : questions;
  }

  if (!preferences?.length) return questions;

  const preferenceSet = new Set(preferences.map(normalizeTopic));
  const matching = questions.filter((question) =>
    (question.topics || []).some((topic) => preferenceSet.has(normalizeTopic(topic)))
  );

  return matching.length >= DEFAULT_QUESTION_SET_SIZE / 2 ? matching : questions;
}

export function orderQuestionsForSession(
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

  const source = filtered.length >= DEFAULT_QUESTION_SET_SIZE ? filtered : deduped;
  const selected: Question[] = [];
  const difficultyBuckets = new Map<number, Map<string, Question[]>>();

  for (const question of source) {
    const byDifficulty = difficultyBuckets.get(question.difficulty) ?? new Map<string, Question[]>();
    const topic = primaryQuestionTopic(question);
    const byTopic = byDifficulty.get(topic) ?? [];
    byTopic.push(question);
    byDifficulty.set(topic, byTopic);
    difficultyBuckets.set(question.difficulty, byDifficulty);
  }

  for (const difficulty of Array.from(difficultyBuckets.keys()).sort((a, b) => a - b)) {
    const topicBuckets = difficultyBuckets.get(difficulty);
    if (!topicBuckets) continue;

    const topicOrder = Array.from(topicBuckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]) || a[1].length - b[1].length)
      .map(([topic]) => topic);

    let progress = true;
    while (progress && selected.length < DEFAULT_QUESTION_SET_SIZE) {
      progress = false;
      for (const topic of topicOrder) {
        const bucket = topicBuckets.get(topic);
        const next = bucket?.shift();
        if (!next) continue;

        selected.push(next);
        progress = true;
        if (selected.length >= DEFAULT_QUESTION_SET_SIZE) {
          break;
        }
      }
    }
  }

  if (selected.length < DEFAULT_QUESTION_SET_SIZE) {
    for (const question of source) {
      if (selected.length >= DEFAULT_QUESTION_SET_SIZE) {
        break;
      }
      if (!selected.includes(question)) {
        selected.push(question);
      }
    }
  }

  return selected.slice(0, DEFAULT_QUESTION_SET_SIZE);
}

function selectQuestionsByDifficulty(
  questions: Question[],
  targetDifficulty: number,
  blockedQuestionIds: Set<string>
): Question[] {
  return orderQuestionsForSession(questions, targetDifficulty, blockedQuestionIds);
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
  const issues = (await scanItems(TABLES.QUESTION_ISSUES)) as unknown as QuestionIssue[];
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
  // Use country-specific questions first; supplement with generic ones so the
  // pool is never artificially thin just because few country questions exist.
  const typedQuestions = countrySpecificQuestions.length > 0
    ? mergeQuestionSets(countrySpecificQuestions, genericQuestions)
    : mergeQuestionSets(genericQuestions);
  const blockedQuestionIds = await loadReportedQuestionIds();
  const availableQuestions = buildAvailableQuestionPool(typedQuestions, blockedQuestionIds);
  const topicFilteredQuestions = filterByTopicPreferences(
    availableQuestions,
    subject,
    typedChild.topicPreferences,
    typedChild.topicPreferenceRules
  );

  return {
    questions: selectQuestionsByDifficulty(topicFilteredQuestions, currentDifficulty, blockedQuestionIds).map(prepareQuestionForDelivery),
    difficulty: currentDifficulty,
    yearLevel: toLegacyYearLevel(ageGroup),
    ageGroup,
    country: childCountry,
    totalAvailable: availableQuestions.length,
    curriculumContext: buildCurriculumContext(typedChild, ageGroup, subject),
    appearance: {
      tileThemeId: typedChild.tileThemeId || getLegacyTileThemeIdFromChildTheme(resolveChildThemeKey(typedChild.preferences?.theme, typedChild)),
      tileFavoriteTags: typedChild.tileFavoriteTags || [],
      preferences: typedChild.preferences || getDefaultChildPreferences(typedChild),
    },
  };
}
