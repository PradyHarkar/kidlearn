import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { z } from "zod";
import { putItem, getItem, updateItem, queryItems, TABLES } from "@/lib/dynamodb";
import { v4 as uuidv4 } from "uuid";
import {
  calculateDifficultyAdjustment,
  shouldAdvanceYearLevel,
  calculateCoinsEarned,
  calculateStarsEarned,
  updateChildDifficulty,
} from "@/lib/adaptive";
import { checkAndGrantAchievements, updateStreak } from "@/lib/achievements";
import { Subject, YearLevel } from "@/types";

const sessionResultSchema = z.object({
  childId: z.string(),
  subject: z.enum(["maths", "english", "science"]),
  questions: z.array(
    z.object({
      questionId: z.string(),
      correct: z.boolean(),
      timeSpent: z.number(),
      difficulty: z.number(),
      topic: z.string(),
    })
  ),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as { id: string }).id;
    const body = await req.json();
    const { childId, subject, questions } = sessionResultSchema.parse(body);

    // Verify child belongs to user
    const child = await getItem(TABLES.CHILDREN, { userId, childId });
    if (!child) return NextResponse.json({ error: "Child not found" }, { status: 404 });

    const sessionId = uuidv4();
    const now = new Date().toISOString();

    // Save individual progress records
    for (const q of questions) {
      await putItem(TABLES.PROGRESS, {
        childId,
        sessionKey: `${now.split("T")[0]}#${now}#${q.questionId}`,
        sessionId,
        questionId: q.questionId,
        subject,
        correct: q.correct,
        timeSpent: q.timeSpent,
        difficultyAttempted: q.difficulty,
        topic: q.topic,
        yearLevel: child.yearLevel,
        createdAt: now,
      });
    }

    // Calculate session stats
    const correct = questions.filter((q) => q.correct).length;
    const accuracy = (correct / questions.length) * 100;

    // Calculate consecutive streaks
    let consecutiveCorrect = 0;
    let consecutiveWrong = 0;
    for (const q of [...questions].reverse()) {
      if (q.correct) {
        consecutiveCorrect++;
        consecutiveWrong = 0;
        if (consecutiveCorrect >= 3) break;
      } else {
        consecutiveWrong++;
        consecutiveCorrect = 0;
        if (consecutiveWrong >= 2) break;
      }
    }

    const currentDifficulty = subject === "maths"
      ? child.currentDifficultyMaths
      : subject === "science"
      ? (child.currentDifficultyScience || 1)
      : child.currentDifficultyEnglish;

    const newDifficulty = calculateDifficultyAdjustment(
      currentDifficulty,
      consecutiveCorrect,
      consecutiveWrong
    );

    // Check for year level advancement
    let newYearLevel: YearLevel | undefined;
    if (shouldAdvanceYearLevel(accuracy, newDifficulty, child.yearLevel as YearLevel)) {
      newYearLevel = "year3";
    }

    // Update difficulty
    await updateChildDifficulty(userId, childId, subject as Subject, newDifficulty, newYearLevel);

    // Calculate rewards
    const coinsEarned = calculateCoinsEarned(correct, questions.length, currentDifficulty);
    const starsEarned = calculateStarsEarned(accuracy);

    // Update child stats and coins
    const totalCoins = (child.totalCoins || 0) + coinsEarned;
    const totalStars = (child.totalStars || 0) + starsEarned;
    const totalAttempted = (child.stats?.totalQuestionsAttempted || 0) + questions.length;
    const totalCorrectAll = (child.stats?.totalCorrect || 0) + correct;

    const { newStreak, coins: streakCoins } = updateStreak(child as { streakDays: number; lastActiveDate: string });

    await updateItem(
      TABLES.CHILDREN,
      { userId, childId },
      "SET totalCoins = :coins, totalStars = :stars, streakDays = :streak, lastActiveDate = :date, stats = :stats",
      {
        ":coins": totalCoins + streakCoins,
        ":stars": totalStars,
        ":streak": newStreak,
        ":date": now,
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

    // Check achievements
    const updatedChild = { ...child, streakDays: newStreak } as Parameters<typeof checkAndGrantAchievements>[1];
    const newAchievements = await checkAndGrantAchievements(childId, updatedChild, {
      totalQuestions: totalAttempted,
      totalCorrect: totalCorrectAll,
      currentStreak: newStreak,
      mathsAccuracy: subject === "maths" ? accuracy : (child.stats?.mathsAccuracy || 0),
      englishAccuracy: subject === "english" ? accuracy : (child.stats?.englishAccuracy || 0),
      scienceAccuracy: subject === "science" ? accuracy : (child.stats?.scienceAccuracy || 0),
      perfectSessions: accuracy === 100 ? 1 : 0,
    });

    return NextResponse.json({
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
        coinsEarned: coinsEarned + streakCoins,
        starsEarned,
        newAchievements,
        difficultyStart: currentDifficulty,
        difficultyEnd: newDifficulty,
        duration: questions.reduce((sum, q) => sum + q.timeSpent, 0),
        yearLevelAdvanced: !!newYearLevel,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Progress error:", error);
    return NextResponse.json({ error: "Failed to save progress" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const childId = searchParams.get("childId");

    if (!childId) return NextResponse.json({ error: "childId required" }, { status: 400 });

    const progress = await queryItems(
      TABLES.PROGRESS,
      "childId = :childId",
      { ":childId": childId },
      undefined,
      undefined,
      undefined,
      100
    );

    return NextResponse.json({ progress });
  } catch (error) {
    console.error("Get progress error:", error);
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }
}
