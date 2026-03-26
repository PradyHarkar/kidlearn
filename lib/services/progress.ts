import { v4 as uuidv4 } from "uuid";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import {
  calculateCoinsEarned,
  calculateDifficultyAdjustment,
  calculatePerformanceWindow,
  calculateStarsEarned,
  nextYearLevel,
  shouldAdvanceYearLevel,
  updateChildDifficulty,
} from "@/lib/adaptive";
import { checkAndGrantAchievements, updateStreak } from "@/lib/achievements";
import { createDdb, getItem, putItem, queryItems, TABLES, updateItem } from "@/lib/dynamodb";
import type { Child, ProgressSessionSummary, ProgressSummary, Subject, YearLevel } from "@/types";

export interface SessionQuestionInput {
  questionId: string;
  correct: boolean;
  timeSpent: number;
  difficulty: number;
  topic: string;
}

export interface ProgressSubmissionResult {
  success: true;
  sessionId: string;
  result: {
    sessionId: string;
    childId: string;
    subject: Subject;
    yearLevel: YearLevel;
    totalQuestions: number;
    correct: number;
    incorrect: number;
    skipped: number;
    accuracy: number;
    rewardPointsEarned: number;
    coinsEarned: number;
    starsEarned: number;
    newAchievements: Awaited<ReturnType<typeof checkAndGrantAchievements>>;
    difficultyStart: number;
    difficultyEnd: number;
    duration: number;
    yearLevelAdvanced: boolean;
  };
}

function getSubjectDifficulty(child: Child, subject: Subject): number {
  return subject === "maths"
    ? child.currentDifficultyMaths
    : subject === "science"
    ? (child.currentDifficultyScience || 1)
    : child.currentDifficultyEnglish;
}

async function saveProgressRecords(
  child: Child,
  childId: string,
  subject: Subject,
  sessionId: string,
  now: string,
  questions: SessionQuestionInput[]
) {
  for (const question of questions) {
    await putItem(TABLES.PROGRESS, {
      childId,
      sessionKey: `${now.split("T")[0]}#${now}#${question.questionId}`,
      sessionId,
      questionId: question.questionId,
      subject,
      correct: question.correct,
      timeSpent: question.timeSpent,
      difficultyAttempted: question.difficulty,
      topic: question.topic,
      yearLevel: child.yearLevel,
      createdAt: now,
    });
  }
}

export async function submitProgressForChild(
  userId: string,
  childId: string,
  subject: Subject,
  questions: SessionQuestionInput[]
): Promise<ProgressSubmissionResult | null> {
  const childRecord = await getItem(TABLES.CHILDREN, { userId, childId });
  if (!childRecord) {
    return null;
  }

  const child = childRecord as Child;
  const sessionId = uuidv4();
  const now = new Date().toISOString();

  await saveProgressRecords(child, childId, subject, sessionId, now, questions);

  const correct = questions.filter((question) => question.correct).length;
  const accuracy = (correct / questions.length) * 100;
  const performance = calculatePerformanceWindow(
    [...questions].reverse().map((question) => ({ correct: question.correct }))
  );

  const currentDifficulty = getSubjectDifficulty(child, subject);
  const newDifficulty = calculateDifficultyAdjustment(
    currentDifficulty,
    performance.consecutiveCorrect,
    performance.consecutiveWrong
  );

  let newYearLevel: YearLevel | undefined;
  if (shouldAdvanceYearLevel(accuracy, newDifficulty, child.yearLevel as YearLevel)) {
    newYearLevel = nextYearLevel(child.yearLevel as YearLevel);
  }

  await updateChildDifficulty(userId, childId, subject, newDifficulty, newYearLevel);

  const coinsEarned = calculateCoinsEarned(correct, questions.length, currentDifficulty);
  const rewardPointsEarned = questions.length;
  const starsEarned = calculateStarsEarned(accuracy);
  const totalCoins = (child.totalCoins || 0) + coinsEarned;
  const totalStars = (child.totalStars || 0) + starsEarned;
  const totalRewardPoints = (child.rewardPoints || 0) + rewardPointsEarned;
  const totalAttempted = (child.stats?.totalQuestionsAttempted || 0) + questions.length;
  const totalCorrectAll = (child.stats?.totalCorrect || 0) + correct;
  const { newStreak, coins: streakCoins } = updateStreak({
    streakDays: child.streakDays,
    lastActiveDate: child.lastActiveDate,
  });

  await updateItem(
    TABLES.CHILDREN,
    { userId, childId },
    "SET totalCoins = :coins, totalStars = :stars, rewardPoints = :rewardPoints, streakDays = :streak, lastActiveDate = :date, lastSubject = :subject, lastSessionCompletedAt = :date, stats = :stats",
    {
      ":coins": totalCoins + streakCoins,
      ":stars": totalStars,
      ":rewardPoints": totalRewardPoints,
      ":streak": newStreak,
      ":date": now,
      ":subject": subject,
      ":stats": {
        totalQuestionsAttempted: totalAttempted,
        totalCorrect: totalCorrectAll,
        mathsAccuracy: subject === "maths" ? accuracy : (child.stats?.mathsAccuracy || 0),
        englishAccuracy: subject === "english" ? accuracy : (child.stats?.englishAccuracy || 0),
        scienceAccuracy: subject === "science" ? accuracy : (child.stats?.scienceAccuracy || 0),
        favoriteTopics: child.stats?.favoriteTopics || [],
      },
    }
  );

  const newAchievements = await checkAndGrantAchievements(childId, { ...child, streakDays: newStreak }, {
    totalQuestions: totalAttempted,
    totalCorrect: totalCorrectAll,
    currentStreak: newStreak,
    mathsAccuracy: subject === "maths" ? accuracy : (child.stats?.mathsAccuracy || 0),
    englishAccuracy: subject === "english" ? accuracy : (child.stats?.englishAccuracy || 0),
    scienceAccuracy: subject === "science" ? accuracy : (child.stats?.scienceAccuracy || 0),
    perfectSessions: accuracy === 100 ? 1 : 0,
  });

  return {
    success: true,
    sessionId,
    result: {
      sessionId,
      childId,
      subject,
      yearLevel: newYearLevel || child.yearLevel,
      totalQuestions: questions.length,
      correct,
      incorrect: questions.length - correct,
      skipped: 0,
      accuracy,
      rewardPointsEarned,
      coinsEarned: coinsEarned + streakCoins,
      starsEarned,
      newAchievements,
      difficultyStart: currentDifficulty,
      difficultyEnd: newDifficulty,
      duration: questions.reduce((sum, question) => sum + question.timeSpent, 0),
      yearLevelAdvanced: !!newYearLevel,
    },
  };
}

export async function getProgressForChild(childId: string) {
  return queryItems(
    TABLES.PROGRESS,
    "childId = :childId",
    { ":childId": childId },
    undefined,
    undefined,
    undefined,
    100
  );
}

function summarizeSessions(records: Array<Record<string, unknown>>, subject: Subject): ProgressSessionSummary[] {
  const grouped = new Map<string, Array<Record<string, unknown>>>();

  for (const record of records) {
    if ((record.subject as Subject | undefined) !== subject) continue;
    const sessionId = String(record.sessionId || "");
    if (!sessionId) continue;
    const bucket = grouped.get(sessionId) || [];
    bucket.push(record);
    grouped.set(sessionId, bucket);
  }

  return Array.from(grouped.entries())
    .map(([sessionId, items]) => {
      const total = items.length;
      const correct = items.filter((item) => !!item.correct).length;
      const first = items[0] || {};
      const last = items[items.length - 1] || {};
      const accuracy = total ? Math.round((correct / total) * 100) : 0;
      const topics = Array.from(new Set(items.map((item) => String(item.topic || "")).filter(Boolean)));

      return {
        sessionId,
        subject,
        completedAt: String(last.createdAt || first.createdAt || ""),
        totalQuestions: total,
        correct,
        incorrect: total - correct,
        accuracy,
        difficultyStart: Number(first.difficultyAttempted ?? first.difficulty ?? 1),
        difficultyEnd: Number(last.difficultyAttempted ?? last.difficulty ?? 1),
        topic: topics[0] || "general",
      };
    })
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, 7);
}

export async function getProgressSummaryForChild(childId: string): Promise<ProgressSummary> {
  const records: Array<Record<string, unknown>> = [];
  const ddb = createDdb();
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  while (true) {
    const result = await ddb.send(new QueryCommand({
      TableName: TABLES.PROGRESS,
      KeyConditionExpression: "childId = :childId",
      ExpressionAttributeValues: { ":childId": childId },
      ExclusiveStartKey: lastEvaluatedKey,
      Limit: 300,
    }));

    const page = (result.Items || []) as Array<Record<string, unknown>>;
    records.push(...page);
    lastEvaluatedKey = result.LastEvaluatedKey;

    if (!lastEvaluatedKey) {
      break;
    }
  }

  const sessionsBySubject = {
    maths: summarizeSessions(records, "maths"),
    english: summarizeSessions(records, "english"),
    science: summarizeSessions(records, "science"),
  };

  const accuracyBySubject = (["maths", "english", "science"] as Subject[]).reduce((acc, subject) => {
    const recordsForSubject = records.filter((record) => record.subject === subject);
    const total = recordsForSubject.length;
    const correct = recordsForSubject.filter((record) => !!record.correct).length;
    acc[subject] = total ? Math.round((correct / total) * 100) : 0;
    return acc;
  }, {} as Record<Subject, number>);

  return {
    childId,
    totalSessions: new Set(records.map((record) => record.sessionId as string)).size,
    sessionsBySubject,
    accuracyBySubject,
  };
}
