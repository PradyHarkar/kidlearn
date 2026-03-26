import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { actorCanAccessChild, getActorSession } from "@/lib/actor-session";
import {
  clearActiveLearningSession,
  getActiveLearningSession,
  saveActiveLearningSession,
} from "@/lib/services/learning-session";

const questionResultSchema = z.object({
  questionId: z.string(),
  correct: z.boolean(),
  timeSpent: z.number(),
  difficulty: z.number(),
  topic: z.string(),
});

const sessionSchema = z.object({
  sessionId: z.string().optional(),
  childId: z.string(),
  subject: z.enum(["maths", "english", "science"]),
  questions: z.array(z.any()),
  currentIndex: z.number().int().min(0),
  selectedAnswer: z.string().nullable(),
  isAnswered: z.boolean(),
  results: z.array(questionResultSchema),
  currentDifficulty: z.number(),
  ageGroup: z.string().optional(),
  timer: z.number(),
  coins: z.number(),
  streak: z.number(),
  consecutiveCorrect: z.number(),
  consecutiveWrong: z.number(),
  showHint: z.boolean(),
  showExplanation: z.boolean(),
  mascotMood: z.enum(["happy", "excited", "thinking", "sad", "celebrating"]),
  mascotMessage: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const actor = await getActorSession();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const childId = searchParams.get("childId");
    const subject = searchParams.get("subject") as "maths" | "english" | "science" | null;

    if (!childId || !subject) {
      return NextResponse.json({ error: "childId and subject required" }, { status: 400 });
    }

    if (!actorCanAccessChild(actor, childId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const session = await getActiveLearningSession(actor.userId, childId, subject);
    return NextResponse.json({ session });
  } catch (error) {
    console.error("Get learn session error:", error);
    return NextResponse.json({ error: "Failed to fetch learn session" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return PUT(req);
}

export async function PUT(req: NextRequest) {
  try {
    const actor = await getActorSession();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const input = sessionSchema.parse(body);

    if (!actorCanAccessChild(actor, input.childId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const session = await saveActiveLearningSession({
      ...input,
      userId: actor.userId,
    });

    return NextResponse.json({ success: true, session }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Save learn session error:", error);
    return NextResponse.json({ error: "Failed to save learn session" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const actor = await getActorSession();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const childId = typeof body.childId === "string" ? body.childId : null;
    const subject = body.subject as "maths" | "english" | "science" | undefined;

    if (!childId || !subject) {
      return NextResponse.json({ error: "childId and subject required" }, { status: 400 });
    }

    if (!actorCanAccessChild(actor, childId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await clearActiveLearningSession(actor.userId, childId, subject);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete learn session error:", error);
    return NextResponse.json({ error: "Failed to clear learn session" }, { status: 500 });
  }
}
