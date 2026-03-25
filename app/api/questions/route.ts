import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getItem, queryItems, TABLES } from "@/lib/dynamodb";
import { Subject, AgeGroup, Question } from "@/types";
import { shouldResetDifficulty } from "@/lib/adaptive";
import { getGradeConfig, getTopicsForGrade } from "@/lib/curriculum";
import { resolveChildAgeGroup, toLegacyYearLevel } from "@/lib/learner";
import type { Country } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const subject = searchParams.get("subject") as Subject;
    const childId = searchParams.get("childId");
    const userId = session.user.id;

    if (!subject || !childId) {
      return NextResponse.json({ error: "subject and childId required" }, { status: 400 });
    }

    const child = await getItem(TABLES.CHILDREN, { userId, childId });
    if (!child) return NextResponse.json({ error: "Child not found" }, { status: 404 });

    // Check if difficulty should reset due to inactivity
    let currentDifficulty = subject === "maths"
      ? child.currentDifficultyMaths
      : subject === "science"
      ? (child.currentDifficultyScience || 1)
      : child.currentDifficultyEnglish;

    if (child.lastActiveDate && shouldResetDifficulty(child.lastActiveDate)) {
      currentDifficulty = 1;
    }

    // Use ageGroup (new) with fallback to yearLevel (legacy)
    const ageGroup: AgeGroup = resolveChildAgeGroup(child as { ageGroup?: AgeGroup; yearLevel: AgeGroup | "prep" });
    const pk = `${subject}#${ageGroup}`;

    // Get questions from DynamoDB filtered by difficulty
    const allQuestions = await queryItems(
      TABLES.QUESTIONS,
      "pk = :pk",
      { ":pk": pk },
      undefined,
      undefined,
      undefined,
      200
    );

    let filtered = (allQuestions as Question[]).filter(
      (q) => Math.abs(q.difficulty - currentDifficulty) <= 1
    );

    // Fallback: widen to ±3, then all
    if (filtered.length < 5) {
      filtered = (allQuestions as Question[]).filter(
        (q) => Math.abs(q.difficulty - currentDifficulty) <= 3
      );
    }
    if (filtered.length === 0) {
      filtered = allQuestions as Question[];
    }

    const shuffled = filtered.sort(() => Math.random() - 0.5).slice(0, 10);

    // Return curriculum context for the client (used by learn page to show topics)
    const country = (child.country as Country) ?? "AU";
    const gradeConfig = child.grade ? getGradeConfig(country, child.grade as string) : null;

    return NextResponse.json({
      questions: shuffled,
      difficulty: currentDifficulty,
      yearLevel: toLegacyYearLevel(ageGroup),
      totalAvailable: allQuestions.length,
      curriculumContext: gradeConfig
        ? {
            country,
            curriculumName: gradeConfig.curriculumName,
            gradeDisplayName: gradeConfig.displayName,
            ageGroup,
            suggestedTopics: getTopicsForGrade(ageGroup, subject, country),
          }
        : null,
    });
  } catch (error) {
    console.error("Get questions error:", error);
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
  }
}
