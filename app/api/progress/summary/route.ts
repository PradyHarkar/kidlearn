import { NextRequest, NextResponse } from "next/server";
import { getActorSession, actorCanAccessChild } from "@/lib/actor-session";
import { getItem, TABLES } from "@/lib/dynamodb";
import { getProgressSummaryForChild } from "@/lib/services/progress";

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

    const child = await getItem(TABLES.CHILDREN, { userId: actor.userId, childId });
    if (!child) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    const summary = await getProgressSummaryForChild(childId);
    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Get progress summary error:", error);
    return NextResponse.json({ error: "Failed to fetch progress summary" }, { status: 500 });
  }
}
