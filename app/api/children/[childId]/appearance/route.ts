import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { actorCanAccessChild, getActorSession } from "@/lib/actor-session";
import { getItem, updateItem, TABLES } from "@/lib/dynamodb";
import { getDefaultTileThemeId, TILE_THEME_PRESETS } from "@/lib/services/tile-themes";
import type { Child } from "@/types";

const VALID_THEME_IDS = TILE_THEME_PRESETS.map((p) => p.id) as [string, ...string[]];

const schema = z.object({
  tileThemeId: z.enum(VALID_THEME_IDS).optional(),
  tileFavoriteTags: z.array(z.string().min(1).max(32)).max(10).optional().default([]),
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
    return NextResponse.json({
      tileThemeId: typedChild.tileThemeId || getDefaultTileThemeId(typedChild),
      tileFavoriteTags: typedChild.tileFavoriteTags || [],
    });
  } catch (error) {
    console.error("Get tile appearance error:", error);
    return NextResponse.json({ error: "Failed to load appearance" }, { status: 500 });
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
      "SET tileThemeId = :tileThemeId, tileFavoriteTags = :tileFavoriteTags",
      {
        ":tileThemeId": body.tileThemeId || getDefaultTileThemeId(child as Child),
        ":tileFavoriteTags": body.tileFavoriteTags || [],
      }
    );

    return NextResponse.json({
      success: true,
      tileThemeId: body.tileThemeId || getDefaultTileThemeId(child as Child),
      tileFavoriteTags: body.tileFavoriteTags || [],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Update tile appearance error:", error);
    return NextResponse.json({ error: "Failed to update appearance" }, { status: 500 });
  }
}
