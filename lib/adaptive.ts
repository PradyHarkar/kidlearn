import { AgeGroup, Subject, YearLevel } from "@/types";
import { ddb, TABLES } from "./dynamodb";
import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { toAgeGroup } from "./learner";

const INITIAL_DIFFICULTY_BY_AGE_GROUP: Record<AgeGroup, number> = {
  foundation: 1,
  year1: 2,
  year2: 3,
  year3: 4,
  year4: 5,
  year5: 6,
  year6: 7,
  year7: 8,
  year8: 9,
};

export interface PerformanceWindow {
  consecutiveCorrect: number;
  consecutiveWrong: number;
  recentAccuracy: number;
}

export function calculatePerformanceWindow(
  answers: Array<{ correct: boolean }>
): PerformanceWindow {
  const recent = answers.slice(0, 10);
  const correctCount = recent.filter((answer) => answer.correct).length;
  const recentAccuracy = recent.length ? (correctCount / recent.length) * 100 : 0;

  let consecutiveCorrect = 0;
  let consecutiveWrong = 0;

  for (const answer of answers) {
    if (answer.correct) {
      consecutiveCorrect++;
      consecutiveWrong = 0;
      if (consecutiveCorrect >= 3) break;
    } else {
      consecutiveWrong++;
      consecutiveCorrect = 0;
      if (consecutiveWrong >= 2) break;
    }
  }

  return {
    consecutiveCorrect,
    consecutiveWrong,
    recentAccuracy,
  };
}

/**
 * Adaptive difficulty algorithm:
 * - 3 consecutive correct → difficulty +1 (max 10)
 * - 2 consecutive wrong → difficulty -1 (min 1)
 * - Can advance to next year level at 90%+ accuracy at difficulty 8+
 * - Reset to baseline after 7 days of inactivity
 */
export async function getAdaptiveDifficulty(
  childId: string,
  subject: Subject,
  fallbackAgeGroup: AgeGroup = "foundation"
): Promise<{ difficulty: number; yearLevel: YearLevel }> {
  // Get recent 20 progress records for this subject (newest first)
  const result = await ddb.send(
    new QueryCommand({
      TableName: TABLES.PROGRESS,
      KeyConditionExpression: "childId = :childId",
      FilterExpression: "#subject = :subject",
      ExpressionAttributeValues: {
        ":childId": childId,
        ":subject": subject,
      },
      ExpressionAttributeNames: { "#subject": "subject" },
      ScanIndexForward: false,
      Limit: 20,
    })
  );

  const records = result.Items || [];

  if (records.length === 0) {
    return {
      difficulty: getInitialDifficultyForAgeGroup(fallbackAgeGroup),
      yearLevel: fallbackAgeGroup === "foundation" ? "prep" : fallbackAgeGroup,
    };
  }

  const performance = calculatePerformanceWindow(
    records.map((record) => ({ correct: !!record.correct }))
  );

  const adjustedDifficulty = calculateDifficultyAdjustment(
    records[0].difficultyAttempted || 1,
    performance.consecutiveCorrect,
    performance.consecutiveWrong
  );

  return { difficulty: adjustedDifficulty, yearLevel: records[0].yearLevel || "prep" };
}

export function getInitialDifficultyForAgeGroup(ageGroup: AgeGroup | YearLevel): number {
  return INITIAL_DIFFICULTY_BY_AGE_GROUP[toAgeGroup(ageGroup)];
}

export function calculateDifficultyAdjustment(
  currentDifficulty: number,
  consecutiveCorrect: number,
  consecutiveWrong: number
): number {
  if (consecutiveCorrect >= 3) {
    return Math.min(10, currentDifficulty + 1);
  }
  if (consecutiveWrong >= 2) {
    return Math.max(1, currentDifficulty - 1);
  }
  return currentDifficulty;
}

const AGE_GROUP_ORDER: AgeGroup[] = [
  "foundation", "year1", "year2", "year3", "year4", "year5", "year6", "year7", "year8",
];

export function shouldAdvanceYearLevel(
  accuracy: number,
  currentDifficulty: number,
  currentYearLevel: YearLevel
): boolean {
  const ageGroup = toAgeGroup(currentYearLevel);
  // Can only advance if not already at the top level
  const currentIndex = AGE_GROUP_ORDER.indexOf(ageGroup);
  return (
    accuracy >= 90 &&
    currentDifficulty >= 8 &&
    currentIndex >= 0 &&
    currentIndex < AGE_GROUP_ORDER.length - 1
  );
}

export function nextYearLevel(currentYearLevel: YearLevel): AgeGroup {
  const ageGroup = toAgeGroup(currentYearLevel);
  const currentIndex = AGE_GROUP_ORDER.indexOf(ageGroup);
  return AGE_GROUP_ORDER[Math.min(currentIndex + 1, AGE_GROUP_ORDER.length - 1)];
}

export function shouldResetDifficulty(lastActiveDate: string): boolean {
  const last = new Date(lastActiveDate);
  const now = new Date();
  const daysDiff = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff >= 7;
}

export async function updateChildDifficulty(
  userId: string,
  childId: string,
  subject: Subject,
  newDifficulty: number,
  newYearLevel?: YearLevel
) {
  const field = subject === "maths"
    ? "currentDifficultyMaths"
    : subject === "science"
    ? "currentDifficultyScience"
    : "currentDifficultyEnglish";
  const updateExpr = newYearLevel
    ? `SET ${field} = :difficulty, yearLevel = :yearLevel, lastActiveDate = :date`
    : `SET ${field} = :difficulty, lastActiveDate = :date`;

  const values: Record<string, unknown> = {
    ":difficulty": newDifficulty,
    ":date": new Date().toISOString(),
  };

  if (newYearLevel) values[":yearLevel"] = newYearLevel;

  await ddb.send(
    new UpdateCommand({
      TableName: TABLES.CHILDREN,
      Key: { userId, childId },
      UpdateExpression: updateExpr,
      ExpressionAttributeValues: values,
    })
  );
}

export function calculateCoinsEarned(correct: number, total: number, difficulty: number): number {
  const base = correct * 10;
  const difficultyBonus = Math.floor(difficulty / 2) * correct * 2;
  const accuracyBonus = correct / total >= 0.9 ? 20 : 0;
  return base + difficultyBonus + accuracyBonus;
}

export function calculateStarsEarned(accuracy: number): number {
  if (accuracy >= 90) return 3;
  if (accuracy >= 70) return 2;
  if (accuracy >= 50) return 1;
  return 0;
}
