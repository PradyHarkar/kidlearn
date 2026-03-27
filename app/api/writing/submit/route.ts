import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateStreak } from "@/lib/achievements";
import { actorCanAccessChild, getActorSession } from "@/lib/actor-session";
import { getItem, TABLES, updateItem } from "@/lib/dynamodb";
import { buildWritingDraftComparison, reviewWritingStep, scoreWritingCompletion } from "@/lib/services/writing-feedback";
import { completeWritingSession, getActiveWritingSession } from "@/lib/services/writing-session";
import { getWritingModeBlueprint } from "@/lib/services/writing-curriculum";
import type { Child, WritingMode, WritingStepState } from "@/types";

const stepSchema = z.object({
  stepName: z.enum(["setting", "character", "problem", "action", "ending", "opinion", "reason_1", "example", "reason_2", "conclusion"]),
  label: z.string(),
  content: z.string(),
  feedback: z.array(z.string()),
  words: z.number(),
  penImageDataUrl: z.string().nullable().optional(),
  completedAt: z.string().optional(),
});

const submitSchema = z.object({
  childId: z.string(),
  writingMode: z.enum(["narrative", "persuasive"]),
  steps: z.array(stepSchema),
  originalDraft: z.string().optional(),
  revisedDraft: z.string().optional(),
  finalDraft: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const actor = await getActorSession();
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const input = submitSchema.parse(body);

    if (!actorCanAccessChild(actor, input.childId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const childRecord = await getItem(TABLES.CHILDREN, { userId: actor.userId, childId: input.childId });
    if (!childRecord) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    const child = childRecord as Child;
    const activeSession = await getActiveWritingSession(actor.userId, input.childId, input.writingMode);
    const blueprint = getWritingModeBlueprint(input.writingMode as WritingMode);
    const reviews = input.steps.map((step, index) => reviewWritingStep(input.writingMode, blueprint.steps[index] ?? blueprint.steps[0], step.content));
    const score = scoreWritingCompletion(blueprint, input.steps);
    const finalDraft = input.finalDraft || input.steps.map((step) => `${step.label}\n${step.content.trim()}`).filter(Boolean).join("\n\n");
    const originalDraft = input.originalDraft || input.steps[0]?.content || "";
    const revisedDraft = input.revisedDraft || finalDraft;
    const comparison = buildWritingDraftComparison(originalDraft, revisedDraft);
    const pointsEarned = score.pointsEarned;
    const coinsEarned = Math.max(2, Math.floor(pointsEarned / 2));
    const starsEarned = score.starsEarned;
    const now = new Date().toISOString();
    const { newStreak, coins: streakCoins } = updateStreak({
      streakDays: child.streakDays,
      lastActiveDate: child.lastActiveDate,
    });

    const writingSessionsStarted = (child.stats?.writingSessionsStarted || 0) + 1;
    const writingSessionsCompleted = (child.stats?.writingSessionsCompleted || 0) + 1;
    const writingWordsWritten = (child.stats?.writingWordsWritten || 0) + score.totalWords;
    const englishAttempted = (child.stats?.englishAttempted || 0) + input.steps.length;
    const englishCorrect = (child.stats?.englishCorrect || 0) + reviews.filter((review) => review.structureMet).length;
    const englishAccuracy = englishAttempted ? Math.round((englishCorrect / englishAttempted) * 100) : 0;

    await updateItem(
      TABLES.CHILDREN,
      { userId: actor.userId, childId: input.childId },
      "SET totalCoins = :coins, totalStars = :stars, rewardPoints = :points, streakDays = :streak, lastActiveDate = :date, lastSubject = :subject, lastSessionCompletedAt = :date, stats = :stats",
      {
        ":coins": (child.totalCoins || 0) + coinsEarned + streakCoins,
        ":stars": (child.totalStars || 0) + starsEarned,
        ":points": (child.rewardPoints || 0) + pointsEarned,
        ":streak": newStreak,
        ":date": now,
        ":subject": "english",
        ":stats": {
          ...(child.stats || {}),
          englishAttempted,
          englishCorrect,
          englishAccuracy,
          writingSessionsStarted,
          writingSessionsCompleted,
          writingWordsWritten,
        },
      }
    );

    const session = await completeWritingSession(
      {
        sessionId: activeSession?.sessionId || `${input.childId}#${input.writingMode}#${now}`,
        userId: actor.userId,
        childId: input.childId,
        country: child.country,
        ageGroup: child.ageGroup,
        writingMode: input.writingMode,
        steps: input.steps as WritingStepState[],
        currentStepIndex: Math.max(0, input.steps.length - 1),
        isComplete: true,
        originalDraft,
        finalDraft,
        revisedDraft,
        comparison,
        pointsEarned,
        createdAt: now,
        updatedAt: now,
      },
      finalDraft,
      comparison,
      pointsEarned
    );

    return NextResponse.json({
      success: true,
      session,
      result: {
        childId: input.childId,
        writingMode: input.writingMode,
        completedSteps: score.completedSteps,
        totalWords: score.totalWords,
        pointsEarned,
        coinsEarned: coinsEarned + streakCoins,
        starsEarned,
        comparison,
        feedback: reviews,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Writing submit error:", error);
    return NextResponse.json({ error: "Failed to submit writing" }, { status: 500 });
  }
}
