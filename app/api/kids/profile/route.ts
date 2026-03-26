import { NextRequest, NextResponse } from "next/server";
import { scanItems, TABLES } from "@/lib/dynamodb";
import type { Child } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const childId = searchParams.get("childId");
    if (!childId) {
      return NextResponse.json({ error: "childId required" }, { status: 400 });
    }

    const matches = await scanItems(
      TABLES.CHILDREN,
      "childId = :childId",
      { ":childId": childId }
    );

    const child = (matches.find((item) => item.childId === childId) || null) as Child | null;
    if (!child?.childPinHash) {
      return NextResponse.json({ error: "Child PIN login is not configured" }, { status: 404 });
    }

    return NextResponse.json({
      child: {
        childId: child.childId,
        childName: child.childName,
        avatar: child.avatar,
        grade: child.grade,
        yearLevel: child.yearLevel,
        allowedKidLoginMethods: child.allowedKidLoginMethods || ["pin"],
        rewardPoints: child.rewardPoints || 0,
        rewardPointsRedeemed: child.rewardPointsRedeemed || 0,
      },
    });
  } catch (error) {
    console.error("Kid profile lookup error:", error);
    return NextResponse.json({ error: "Failed to load child profile" }, { status: 500 });
  }
}
