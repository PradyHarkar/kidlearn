import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { redeemShopItem } from "@/lib/services/reward-shop";

const schema = z.object({
  childId: z.string().min(1),
  itemId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = schema.parse(await req.json());
    const purchase = await redeemShopItem(session.user.id, body.childId, body.itemId);
    return NextResponse.json({ success: true, purchase }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to redeem shop item";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
