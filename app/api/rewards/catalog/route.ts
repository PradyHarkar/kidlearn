import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getRewardCatalog } from "@/lib/services/rewards";
import type { Country } from "@/types";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const country = (session.user.country as Country) ?? "AU";
    return NextResponse.json({ rewards: getRewardCatalog(country) });
  } catch (error) {
    console.error("Reward catalog error:", error);
    return NextResponse.json({ error: "Failed to load rewards" }, { status: 500 });
  }
}
