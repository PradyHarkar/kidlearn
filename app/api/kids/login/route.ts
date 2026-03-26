import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { scanItems, TABLES } from "@/lib/dynamodb";
import {
  applyKidSessionCookie,
  childToKidSession,
  createKidSessionToken,
} from "@/lib/kid-session";
import type { Child } from "@/types";

const schema = z.object({
  childId: z.string().min(1),
  pin: z.string().regex(/^\d{4,6}$/),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { childId, pin } = schema.parse(body);

    const matches = await scanItems(
      TABLES.CHILDREN,
      "childId = :childId",
      { ":childId": childId }
    );

    const child = (matches.find((item) => item.childId === childId) || null) as Child | null;
    if (!child?.childPinHash) {
      return NextResponse.json({ error: "PIN login is not configured for this child" }, { status: 404 });
    }

    const valid = await bcrypt.compare(pin, child.childPinHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }

    const kidSession = childToKidSession(child);
    const response = NextResponse.json({
      success: true,
      child: {
        ...kidSession,
        rewardPoints: child.rewardPoints || 0,
      },
    });

    const token = await createKidSessionToken(kidSession);
    applyKidSessionCookie(response, token);
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Kid login error:", error);
    return NextResponse.json({ error: "Failed to log in child" }, { status: 500 });
  }
}
