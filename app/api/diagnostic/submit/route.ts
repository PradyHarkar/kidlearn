import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { actorCanAccessChild, getActorSession } from "@/lib/actor-session";
import { buildDiagnosticCompletedResult, getChildForDiagnostic, submitDiagnosticForChild, DIAGNOSTIC_QUESTION_COUNT } from "@/lib/services/diagnostic";

const schema = z.object({
  childId: z.string().min(1),
  answers: z.array(z.object({
    questionId: z.string().min(1),
    answerId: z.string().min(1),
  })).length(DIAGNOSTIC_QUESTION_COUNT),
});

export async function POST(req: NextRequest) {
  try {
    const actor = await getActorSession();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { childId, answers } = schema.parse(body);

    if (!actorCanAccessChild(actor, childId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const child = await getChildForDiagnostic(actor.userId, childId);
    if (!child) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    if (child.diagnosticComplete) {
      return NextResponse.json({
        error: "Diagnostic already completed",
        result: buildDiagnosticCompletedResult(child),
      }, { status: 409 });
    }

    const result = await submitDiagnosticForChild({
      userId: actor.userId,
      childId,
      answers,
    });

    if (!result) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Submit diagnostic error:", error);
    return NextResponse.json({ error: "Failed to submit diagnostic" }, { status: 500 });
  }
}
