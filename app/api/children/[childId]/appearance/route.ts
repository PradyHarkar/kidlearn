import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { actorCanAccessChild, getActorSession } from "@/lib/actor-session";
import { getItem, updateItem, TABLES } from "@/lib/dynamodb";
import {
  getDefaultChildPreferences,
  getLegacyTileThemeIdFromChildTheme,
  getDefaultTileThemeId,
  TILE_THEME_PRESETS,
  resolveChildThemeKey,
} from "@/lib/services/tile-themes";
import type { Child, ChildThemeKey } from "@/types";

const VALID_THEME_IDS = TILE_THEME_PRESETS.map((p) => p.id) as [string, ...string[]];
const VALID_CHILD_THEME_KEYS = ["fantasy", "unicorn", "space", "soccer", "jungle", "ocean"] as const satisfies readonly ChildThemeKey[];

const schema = z.object({
  theme: z.enum(VALID_CHILD_THEME_KEYS).optional(),
  tileThemeId: z.enum(VALID_THEME_IDS).optional(),
  avatar: z.string().min(1).max(16).optional(),
  buttonStyle: z.enum(["gradient", "cartoon"]).optional(),
  cardStyle: z.enum(["soft", "bold"]).optional(),
  rewardStyle: z.enum(["coins", "stars", "gems"]).optional(),
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
    const defaults = getDefaultChildPreferences({
      ageGroup: typedChild.ageGroup || (typedChild.yearLevel === "prep" ? "foundation" : (typedChild.yearLevel as Child["ageGroup"])),
      yearLevel: typedChild.yearLevel,
      country: typedChild.country,
    });
    const preferences = typedChild.preferences ?? {
      theme: resolveChildThemeKey(typedChild.tileThemeId, typedChild),
      avatar: typedChild.avatar || defaults.avatar,
      buttonStyle: defaults.buttonStyle,
      cardStyle: defaults.cardStyle,
      rewardStyle: defaults.rewardStyle,
    };

    return NextResponse.json({
      tileThemeId: typedChild.tileThemeId || getDefaultTileThemeId(typedChild),
      tileFavoriteTags: typedChild.tileFavoriteTags || [],
      preferences,
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

    const typedChild = child as Child;
    const defaults = getDefaultChildPreferences({
      ageGroup: typedChild.ageGroup || (typedChild.yearLevel === "prep" ? "foundation" : (typedChild.yearLevel as Child["ageGroup"])),
      yearLevel: typedChild.yearLevel,
      country: typedChild.country,
    });
    const resolvedTheme = body.theme
      || (body.tileThemeId ? resolveChildThemeKey(body.tileThemeId, typedChild) : resolveChildThemeKey(typedChild.tileThemeId, typedChild));
    const nextPreferences = {
      theme: resolvedTheme,
      avatar: body.avatar || typedChild.avatar || defaults.avatar,
      buttonStyle: body.buttonStyle || typedChild.preferences?.buttonStyle || defaults.buttonStyle,
      cardStyle: body.cardStyle || typedChild.preferences?.cardStyle || defaults.cardStyle,
      rewardStyle: body.rewardStyle || typedChild.preferences?.rewardStyle || defaults.rewardStyle,
    };
    const nextTileThemeId = body.tileThemeId || getLegacyTileThemeIdFromChildTheme(nextPreferences.theme);

    await updateItem(
      TABLES.CHILDREN,
      { userId: actor.userId, childId },
      "SET avatar = :avatar, preferences = :preferences, tileThemeId = :tileThemeId, tileFavoriteTags = :tileFavoriteTags",
      {
        ":avatar": nextPreferences.avatar,
        ":preferences": nextPreferences,
        ":tileThemeId": nextTileThemeId,
        ":tileFavoriteTags": body.tileFavoriteTags || [],
      }
    );

    return NextResponse.json({
      success: true,
      tileThemeId: nextTileThemeId,
      tileFavoriteTags: body.tileFavoriteTags || [],
      preferences: nextPreferences,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Update tile appearance error:", error);
    return NextResponse.json({ error: "Failed to update appearance" }, { status: 500 });
  }
}
