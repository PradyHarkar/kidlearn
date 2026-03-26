import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { actorCanAccessChild, getActorSession } from "@/lib/actor-session";
import { createQuestionIssue } from "@/lib/services/question-issues";

const schema = z.object({
  questionId: z.string().min(1),
  childId: z.string().optional(),
  subject: z.enum(["maths", "english", "science"]).optional(),
  topics: z.array(z.string()).optional(),
  reason: z.string().min(1).max(200),
  details: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const actor = await getActorSession();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const input = schema.parse(body);

    if (input.childId && !actorCanAccessChild(actor, input.childId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const issue = await createQuestionIssue({
      ...input,
      childId: actor.kind === "kid" ? actor.childId : input.childId,
      reporterType: actor.reporterType,
      reporterId: actor.reporterId,
      userId: actor.userId,
    });

    return NextResponse.json({ success: true, issue }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Question report error:", error);
    return NextResponse.json({ error: "Failed to report question" }, { status: 500 });
  }
}
