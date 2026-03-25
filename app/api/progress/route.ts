import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { z } from "zod";
import { getProgressForChild, submitProgressForChild } from "@/lib/services/progress";

const sessionResultSchema = z.object({
  childId: z.string(),
  subject: z.enum(["maths", "english", "science"]),
  questions: z.array(
    z.object({
      questionId: z.string(),
      correct: z.boolean(),
      timeSpent: z.number(),
      difficulty: z.number(),
      topic: z.string(),
    })
  ),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;
    const body = await req.json();
    const { childId, subject, questions } = sessionResultSchema.parse(body);

    const result = await submitProgressForChild(userId, childId, subject, questions);
    if (!result) return NextResponse.json({ error: "Child not found" }, { status: 404 });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Progress error:", error);
    return NextResponse.json({ error: "Failed to save progress" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const childId = searchParams.get("childId");

    if (!childId) return NextResponse.json({ error: "childId required" }, { status: 400 });

    const progress = await getProgressForChild(childId);
    return NextResponse.json({ progress });
  } catch (error) {
    console.error("Get progress error:", error);
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }
}
