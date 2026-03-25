import { NextRequest, NextResponse } from "next/server";
import { getChildAchievements } from "@/lib/achievements";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const childId = searchParams.get("childId");

    if (!childId) return NextResponse.json({ error: "childId required" }, { status: 400 });

    const achievements = await getChildAchievements(childId);
    return NextResponse.json({ achievements });
  } catch (error) {
    console.error("Achievements error:", error);
    return NextResponse.json({ error: "Failed to fetch achievements" }, { status: 500 });
  }
}
