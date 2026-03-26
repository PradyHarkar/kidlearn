import { NextRequest, NextResponse } from "next/server";
import { actorCanAccessChild, getActorSession } from "@/lib/actor-session";
import { getDiagnosticQuestionsForChild } from "@/lib/services/diagnostic";

export async function GET(req: NextRequest) {
  try {
    const actor = await getActorSession();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const childId = searchParams.get("childId");

    if (!childId) {
      return NextResponse.json({ error: "childId required" }, { status: 400 });
    }

    if (!actorCanAccessChild(actor, childId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const diagnostic = await getDiagnosticQuestionsForChild(actor.userId, childId);
    if (!diagnostic) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    if (diagnostic.child.diagnosticComplete) {
      return NextResponse.json({
        diagnosticComplete: true,
        nextUrl: diagnostic.nextUrl,
        baselineDifficulty: diagnostic.baselineDifficulty,
        calibratedDifficulty: diagnostic.child.currentDifficultyMaths,
      });
    }

    return NextResponse.json({
      diagnosticComplete: false,
      childId,
      questions: diagnostic.questions,
      baselineDifficulty: diagnostic.baselineDifficulty,
      nextUrl: diagnostic.nextUrl,
    });
  } catch (error) {
    console.error("Get diagnostic error:", error);
    return NextResponse.json({ error: "Failed to load diagnostic" }, { status: 500 });
  }
}
