import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getItem, TABLES, updateItem } from "@/lib/dynamodb";

const setPinSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, "PIN must be 4 to 6 digits"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { childId: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { pin } = setPinSchema.parse(body);
    const child = await getItem(TABLES.CHILDREN, { userId: session.user.id, childId: params.childId });
    if (!child) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    const pinHash = await bcrypt.hash(pin, 12);
    const methods = ["pin"] as const;

    await updateItem(
      TABLES.CHILDREN,
      { userId: session.user.id, childId: params.childId },
      "SET childPinHash = :pinHash, pinConfiguredAt = :configuredAt, allowedKidLoginMethods = :methods",
      {
        ":pinHash": pinHash,
        ":configuredAt": new Date().toISOString(),
        ":methods": methods,
      }
    );

    return NextResponse.json({ success: true, allowedKidLoginMethods: methods });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Set child PIN error:", error);
    return NextResponse.json({ error: "Failed to set child PIN" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { childId: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await updateItem(
      TABLES.CHILDREN,
      { userId: session.user.id, childId: params.childId },
      "REMOVE childPinHash, pinConfiguredAt, allowedKidLoginMethods",
      {}
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete child PIN error:", error);
    return NextResponse.json({ error: "Failed to remove child PIN" }, { status: 500 });
  }
}
