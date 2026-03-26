import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { actorCanAccessChild, getActorSession } from "@/lib/actor-session";
import { getItem, updateItem, TABLES } from "@/lib/dynamodb";
import type { Child } from "@/types";

const schema = z.object({
  topicPreferences: z.array(z.string().min(1)).max(50),
});

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ childId: string }> }
) {
  try {
    const actor = await getActorSession();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { childId } = await context.params;
    if (!actorCanAccessChild(actor, childId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const child = await getItem(TABLES.CHILDREN, { userId: actor.userId, childId });
    if (!child) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    const typedChild = child as Child;
    return NextResponse.json({ topicPreferences: typedChild.topicPreferences || [] });
  } catch (error) {
    console.error("Get topic preferences error:", error);
    return NextResponse.json({ error: "Failed to load preferences" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ childId: string }> }
) {
  try {
    const actor = await getActorSession();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { childId } = await context.params;
    if (!actorCanAccessChild(actor, childId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = schema.parse(await req.json());
    const child = await getItem(TABLES.CHILDREN, { userId: actor.userId, childId });
    if (!child) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    await updateItem(
      TABLES.CHILDREN,
      { userId: actor.userId, childId },
      "SET topicPreferences = :topicPreferences",
      { ":topicPreferences": body.topicPreferences }
    );

    return NextResponse.json({ success: true, topicPreferences: body.topicPreferences });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Update topic preferences error:", error);
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}
