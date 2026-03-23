import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getItem, queryItems, TABLES } from "@/lib/dynamodb";
import { Subject, YearLevel, Question } from "@/types";
import { shouldResetDifficulty } from "@/lib/adaptive";

const MATHS_TOPICS = {
  prep: ["counting", "addition", "subtraction", "shapes", "patterns"],
  year3: ["addition", "subtraction", "multiplication", "shapes", "time", "measurement", "patterns"],
};

const ENGLISH_TOPICS = {
  prep: ["phonics", "sight-words", "letter-recognition", "simple-words"],
  year3: ["spelling", "grammar", "reading-comprehension", "sentence-building", "vocabulary"],
};

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const subject = searchParams.get("subject") as Subject;
    const childId = searchParams.get("childId");
    const userId = (session.user as { id: string }).id;

    if (!subject || !childId) {
      return NextResponse.json({ error: "subject and childId required" }, { status: 400 });
    }

    // Get child to determine difficulty and year level
    const child = await getItem(TABLES.CHILDREN, { userId, childId });
    if (!child) return NextResponse.json({ error: "Child not found" }, { status: 404 });

    // Check if difficulty should reset due to inactivity
    let currentDifficulty = subject === "maths"
      ? child.currentDifficultyMaths
      : child.currentDifficultyEnglish;

    if (child.lastActiveDate && shouldResetDifficulty(child.lastActiveDate)) {
      currentDifficulty = 1;
    }

    const yearLevel: YearLevel = child.yearLevel;
    const pk = `${subject}#${yearLevel}`;

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

    const filtered = (allQuestions as Question[]).filter(
      (q) => Math.abs(q.difficulty - currentDifficulty) <= 1
    );

    // Shuffle and pick 10
    const shuffled = filtered.sort(() => Math.random() - 0.5).slice(0, 10);

    // If not enough questions, return what we have (frontend should handle gracefully)
    return NextResponse.json({
      questions: shuffled,
      difficulty: currentDifficulty,
      yearLevel,
    });
  } catch (error) {
    console.error("Get questions error:", error);
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
  }
}
