import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { z } from "zod";
import { generateQuestionsWithBedrock } from "@/lib/bedrock";

const schema = z.object({
  subject: z.enum(["maths", "english"]),
  yearLevel: z.enum(["prep", "year3"]),
  topic: z.string(),
  difficulty: z.number().min(1).max(10),
  count: z.number().min(1).max(10).optional().default(5),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const params = schema.parse(body);

    const questions = await generateQuestionsWithBedrock(
      params.subject,
      params.yearLevel,
      params.topic,
      params.difficulty,
      params.count
    );

    return NextResponse.json({ questions });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Bedrock route error:", error);
    return NextResponse.json(
      { error: "Failed to generate questions. Using cached questions instead." },
      { status: 503 }
    );
  }
}
