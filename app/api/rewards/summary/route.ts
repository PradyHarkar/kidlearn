import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getRewardSummary } from "@/lib/services/rewards";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(await getRewardSummary(session.user.id));
  } catch (error) {
    console.error("Reward summary error:", error);
    return NextResponse.json({ error: "Failed to load rewards summary" }, { status: 500 });
  }
}
