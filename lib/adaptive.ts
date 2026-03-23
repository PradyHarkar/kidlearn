import { Subject, YearLevel } from "@/types";
import { ddb, TABLES } from "./dynamodb";
import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

export interface PerformanceWindow {
  consecutiveCorrect: number;
  consecutiveWrong: number;
  recentAccuracy: number;
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
  subject: Subject
): Promise<{ difficulty: number; yearLevel: YearLevel }> {
  // Get recent 10 progress records for this subject
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
    return { difficulty: 1, yearLevel: "prep" };
  }

  const recent = records.slice(0, 10);
  const correctCount = recent.filter((r) => r.correct).length;
  const recentAccuracy = (correctCount / recent.length) * 100;

  // Count consecutive correct/wrong
  let consecutiveCorrect = 0;
  let consecutiveWrong = 0;

  for (const record of records) {
    if (record.correct) {
      consecutiveCorrect++;
      consecutiveWrong = 0;
      if (consecutiveCorrect >= 3) break;
    } else {
      consecutiveWrong++;
      consecutiveCorrect = 0;
      if (consecutiveWrong >= 2) break;
    }
  }

  return { difficulty: records[0].difficultyAttempted || 1, yearLevel: records[0].yearLevel || "prep" };
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

export function shouldAdvanceYearLevel(
  accuracy: number,
  currentDifficulty: number,
  currentYearLevel: YearLevel
): boolean {
  return (
    accuracy >= 90 &&
    currentDifficulty >= 8 &&
    currentYearLevel === "prep"
  );
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
  const field = subject === "maths" ? "currentDifficultyMaths" : "currentDifficultyEnglish";
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
