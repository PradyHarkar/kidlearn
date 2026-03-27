/**
 * GET  /api/insights?childId=<id>          — returns cached insight or generates fresh
 * POST /api/insights?childId=<id>          — force-refresh (on-demand by parent)
 *
 * Response shape:
 *   { insight: AIInsight | null }
 *
 * insight is null when the child has no practice data yet.
 */

import { NextRequest, NextResponse } from "next/server";
import { actorCanAccessChild, getActorSession } from "@/lib/actor-session";
import { getOrGenerateInsight } from "@/lib/services/ai-insights";

function getChildId(req: NextRequest): string | null {
  return new URL(req.url).searchParams.get("childId");
}

export async function GET(req: NextRequest) {
  try {
    const actor = await getActorSession();
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const childId = getChildId(req);
    if (!childId) return NextResponse.json({ error: "childId required" }, { status: 400 });

    if (!actorCanAccessChild(actor, childId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const insight = await getOrGenerateInsight(actor.userId, childId, false);
    return NextResponse.json({ insight });
  } catch (error) {
    console.error("GET /api/insights error:", error);
    return NextResponse.json({ error: "Failed to load insight" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getActorSession();
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const childId = getChildId(req);
    if (!childId) return NextResponse.json({ error: "childId required" }, { status: 400 });

    if (!actorCanAccessChild(actor, childId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const insight = await getOrGenerateInsight(actor.userId, childId, true);
    return NextResponse.json({ insight });
  } catch (error) {
    console.error("POST /api/insights error:", error);
    return NextResponse.json({ error: "Failed to generate insight" }, { status: 500 });
  }
}
