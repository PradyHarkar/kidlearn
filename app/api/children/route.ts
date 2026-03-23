import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { queryItems, putItem, TABLES } from "@/lib/dynamodb";

const childSchema = z.object({
  childName: z.string().min(1).max(50),
  yearLevel: z.enum(["prep", "year3"]),
  avatar: z.string(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as { id: string }).id;
    const children = await queryItems(
      TABLES.CHILDREN,
      "userId = :userId",
      { ":userId": userId }
    );

    return NextResponse.json({ children });
  } catch (error) {
    console.error("Get children error:", error);
    return NextResponse.json({ error: "Failed to fetch children" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as { id: string }).id;

    // Check child limit (max 3)
    const existing = await queryItems(TABLES.CHILDREN, "userId = :userId", { ":userId": userId });
    if (existing.length >= 3) {
      return NextResponse.json({ error: "Maximum 3 children per account" }, { status: 400 });
    }

    const body = await req.json();
    const { childName, yearLevel, avatar } = childSchema.parse(body);

    const childId = uuidv4();
    const child = {
      userId,
      childId,
      childName,
      yearLevel,
      avatar,
      currentDifficultyMaths: 1,
      currentDifficultyEnglish: 1,
      streakDays: 0,
      lastActiveDate: new Date().toISOString(),
      totalCoins: 0,
      totalStars: 0,
      stats: {
        totalQuestionsAttempted: 0,
        totalCorrect: 0,
        mathsAccuracy: 0,
        englishAccuracy: 0,
        favoriteTopics: [],
      },
      createdAt: new Date().toISOString(),
    };

    await putItem(TABLES.CHILDREN, child);
    return NextResponse.json({ child }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Create child error:", error);
    return NextResponse.json({ error: "Failed to create child profile" }, { status: 500 });
  }
}
