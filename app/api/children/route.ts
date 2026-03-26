import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { queryItems, putItem, TABLES } from "@/lib/dynamodb";
import { getSession } from "@/lib/auth";
import { gradeToAgeGroup } from "@/lib/curriculum";
import { getInitialDifficultyForAgeGroup } from "@/lib/adaptive";
import { toLegacyYearLevel } from "@/lib/learner";
import type { Country } from "@/types";

const childSchema = z.object({
  childName: z.string().min(1).max(50),
  grade: z.string().min(1),   // e.g. "year3", "grade3", "class3", "foundation"
  avatar: z.string(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;
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
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;

    // Check child limit (max 3)
    const existing = await queryItems(TABLES.CHILDREN, "userId = :userId", { ":userId": userId });
    if (existing.length >= 3) {
      return NextResponse.json({ error: "Maximum 3 children per account" }, { status: 400 });
    }

    const body = await req.json();
    const { childName, grade, avatar } = childSchema.parse(body);

    // Resolve country from session (set during registration)
    const country: Country = (session.user.country as Country) ?? "AU";
    const ageGroup = gradeToAgeGroup(country, grade);
    const initialDifficulty = getInitialDifficultyForAgeGroup(ageGroup);

    const childId = uuidv4();
    const child = {
      userId,
      childId,
      childName,
      grade,
      country,
      ageGroup,
      yearLevel: toLegacyYearLevel(ageGroup),  // kept for backwards compat
      avatar,
      currentDifficultyMaths: initialDifficulty,
      currentDifficultyEnglish: initialDifficulty,
      currentDifficultyScience: initialDifficulty,
      streakDays: 0,
      lastActiveDate: new Date().toISOString(),
      totalCoins: 0,
      totalStars: 0,
      stats: {
        totalQuestionsAttempted: 0,
        totalCorrect: 0,
        mathsAccuracy: 0,
        englishAccuracy: 0,
        scienceAccuracy: 0,
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
