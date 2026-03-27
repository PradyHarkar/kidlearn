import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { actorCanAccessChild, getActorSession } from "@/lib/actor-session";
import { getItem, updateItem, TABLES } from "@/lib/dynamodb";
import {
  CHILD_THEME_PRESETS,
  getDefaultChildPreferences,
  getLegacyTileThemeIdFromChildTheme,
  resolveChildThemeKey,
} from "@/lib/services/tile-themes";
import type { Child, ChildButtonStyle, ChildCardStyle, ChildRewardStyle, ChildThemeKey } from "@/types";

const VALID_THEME_IDS = CHILD_THEME_PRESETS.map((p) => p.id) as [ChildThemeKey, ...ChildThemeKey[]];

const schema = z.object({
  theme: z.enum(VALID_THEME_IDS).optional(),
  tileThemeId: z.enum(VALID_THEME_IDS).optional(),
  avatar: z.string().min(1).max(32).optional(),
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
    const preferences = typedChild.preferences || getDefaultChildPreferences(typedChild);
    const resolvedTheme = resolveChildThemeKey(preferences.theme, typedChild);
    return NextResponse.json({
      tileThemeId: typedChild.tileThemeId || getLegacyTileThemeIdFromChildTheme(resolvedTheme),
      tileFavoriteTags: typedChild.tileFavoriteTags || [],
      preferences: {
        theme: resolvedTheme,
        avatar: preferences.avatar || typedChild.avatar || "🧒",
        buttonStyle: preferences.buttonStyle || "gradient",
        cardStyle: preferences.cardStyle || "soft",
        rewardStyle: preferences.rewardStyle || "coins",
      },
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

    const current = child as Child;
    const currentPrefs = current.preferences || getDefaultChildPreferences(current);
    const resolvedTheme = resolveChildThemeKey(body.theme || body.tileThemeId || currentPrefs.theme, current);
    const nextPreferences = {
      theme: resolvedTheme,
      avatar: body.avatar || currentPrefs.avatar || current.avatar || "🧒",
      buttonStyle: (body.buttonStyle || currentPrefs.buttonStyle || "gradient") as ChildButtonStyle,
      cardStyle: (body.cardStyle || currentPrefs.cardStyle || "soft") as ChildCardStyle,
      rewardStyle: (body.rewardStyle || currentPrefs.rewardStyle || "coins") as ChildRewardStyle,
    };

    await updateItem(
      TABLES.CHILDREN,
      { userId: actor.userId, childId },
      "SET preferences = :preferences, tileThemeId = :tileThemeId, tileFavoriteTags = :tileFavoriteTags",
      {
        ":preferences": nextPreferences,
        ":tileThemeId": getLegacyTileThemeIdFromChildTheme(resolvedTheme),
        ":tileFavoriteTags": body.tileFavoriteTags || [],
      }
    );

    return NextResponse.json({
      success: true,
      tileThemeId: getLegacyTileThemeIdFromChildTheme(resolvedTheme),
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
