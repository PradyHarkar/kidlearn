import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { actorCanAccessChild, getActorSession } from "@/lib/actor-session";
import {
  clearActiveWritingSession,
  getActiveWritingSession,
  saveActiveWritingSession,
} from "@/lib/services/writing-session";
import type { WritingMode } from "@/types";

const stepSchema = z.object({
  stepName: z.enum(["setting", "character", "problem", "action", "ending", "opinion", "reason_1", "example", "reason_2", "conclusion"]),
  label: z.string(),
  content: z.string(),
  feedback: z.array(z.string()),
  words: z.number(),
  penImageDataUrl: z.string().nullable().optional(),
  completedAt: z.string().optional(),
});

const sessionSchema = z.object({
  sessionId: z.string().optional(),
  childId: z.string(),
  writingMode: z.enum(["narrative", "persuasive"]),
  country: z.enum(["AU", "US", "IN", "UK"]).optional(),
  ageGroup: z.enum(["foundation", "year1", "year2", "year3", "year4", "year5", "year6", "year7", "year8"]).optional(),
  steps: z.array(stepSchema),
  currentStepIndex: z.number().int().min(0),
  isComplete: z.boolean(),
  originalDraft: z.string().optional(),
  finalDraft: z.string().optional(),
  revisedDraft: z.string().optional(),
  comparison: z.object({
    addedWords: z.array(z.string()),
    removedWords: z.array(z.string()),
    changedWords: z.array(z.string()),
    summary: z.string(),
  }).optional(),
  pointsEarned: z.number().optional(),
});

async function parseWritingBody(req: NextRequest) {
  const body = await req.json();
  return sessionSchema.parse(body);
}

export async function GET(req: NextRequest) {
  try {
    const actor = await getActorSession();
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const childId = searchParams.get("childId");
    const writingMode = searchParams.get("mode") as WritingMode | null;

    if (!childId || !writingMode) {
      return NextResponse.json({ error: "childId and mode required" }, { status: 400 });
    }

    if (!actorCanAccessChild(actor, childId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const session = await getActiveWritingSession(actor.userId, childId, writingMode);
    return NextResponse.json({ session });
  } catch (error) {
    console.error("Get writing session error:", error);
    return NextResponse.json({ error: "Failed to fetch writing session" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return PUT(req);
}

export async function PUT(req: NextRequest) {
  try {
    const actor = await getActorSession();
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const input = await parseWritingBody(req);

    if (!actorCanAccessChild(actor, input.childId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const session = await saveActiveWritingSession({
      ...input,
      userId: actor.userId,
    });

    return NextResponse.json({ success: true, session }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Save writing session error:", error);
    return NextResponse.json({ error: "Failed to save writing session" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const actor = await getActorSession();
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const childId = typeof body.childId === "string" ? body.childId : null;
    const writingMode = body.mode as WritingMode | undefined;

    if (!childId || !writingMode) {
      return NextResponse.json({ error: "childId and mode required" }, { status: 400 });
    }

    if (!actorCanAccessChild(actor, childId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await clearActiveWritingSession(actor.userId, childId, writingMode);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete writing session error:", error);
    return NextResponse.json({ error: "Failed to clear writing session" }, { status: 500 });
  }
}
