import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { transferRewardPoints } from "@/lib/services/rewards";

const schema = z.object({
  sourceChildId: z.string().min(1),
  targetChildId: z.string().min(1),
  points: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { sourceChildId, targetChildId, points } = schema.parse(body);
    await transferRewardPoints(session.user.id, sourceChildId, targetChildId, points);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to transfer points";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
