import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { redeemReward } from "@/lib/services/rewards";

const schema = z.object({
  targetChildId: z.string().min(1),
  rewardId: z.string().min(1),
  sourceChildIds: z.array(z.string().min(1)).optional().default([]),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { targetChildId, rewardId, sourceChildIds } = schema.parse(body);
    const redemption = await redeemReward(
      session.user.id,
      targetChildId,
      rewardId,
      sourceChildIds
    );

    return NextResponse.json({ success: true, redemption }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to redeem reward";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
