import { NextRequest, NextResponse } from "next/server";
import { getActorSession, actorCanAccessChild } from "@/lib/actor-session";
import { getQuestionsForChild } from "@/lib/services/questions";
import { Subject } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const actor = await getActorSession();
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const subject = searchParams.get("subject") as Subject;
    const childId = searchParams.get("childId");

    if (!subject || !childId) {
      return NextResponse.json({ error: "subject and childId required" }, { status: 400 });
    }

    if (!actorCanAccessChild(actor, childId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await getQuestionsForChild(actor.userId, childId, subject);
    if (!result) return NextResponse.json({ error: "Child not found" }, { status: 404 });

    return NextResponse.json({
      questions: result.questions,
      difficulty: result.difficulty,
      yearLevel: result.yearLevel,
      ageGroup: result.ageGroup,
      totalAvailable: result.totalAvailable,
      curriculumContext: result.curriculumContext,
    });
  } catch (error) {
    console.error("Get questions error:", error);
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
  }
}
