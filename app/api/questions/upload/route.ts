/**
 * Upload custom questions (e.g., from GPT/ChatGPT) to DynamoDB
 *
 * POST /api/questions/upload
 * Body: { questions: Question[], secret: string }
 *
 * Question format:
 * {
 *   questionText: string,
 *   answerOptions: [{ id, text, emoji?, isCorrect }],
 *   difficulty: 1-10,
 *   topics: string[],
 *   explanation: string,
 *   subject: "maths" | "english",
 *   yearLevel: "prep" | "year3",
 *   hint?: string
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { putItem, TABLES } from "@/lib/dynamodb";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const answerOptionSchema = z.object({
  id: z.string().optional(),
  text: z.string(),
  emoji: z.string().optional(),
  imageUrl: z.string().optional(),
  isCorrect: z.boolean(),
});

const questionSchema = z.object({
  questionText: z.string().min(1),
  answerOptions: z.array(answerOptionSchema).min(2).max(4),
  difficulty: z.number().min(1).max(10),
  topics: z.array(z.string()),
  explanation: z.string(),
  subject: z.enum(["maths", "english"]),
  yearLevel: z.enum(["prep", "year3"]),
  hint: z.string().optional(),
});

const uploadSchema = z.object({
  questions: z.array(questionSchema),
  secret: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { questions, secret } = uploadSchema.parse(body);

    // Allow either authenticated session or secret key (for bulk imports)
    if (!session?.user && secret !== process.env.NEXTAUTH_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let uploaded = 0;
    const errors: string[] = [];

    for (const q of questions) {
      try {
        // Ensure each option has an id
        const answerOptions = q.answerOptions.map((opt, idx) => ({
          ...opt,
          id: opt.id || `opt-${idx}`,
        }));

        const fullQuestion = {
          pk: `${q.subject}#${q.yearLevel}`,
          questionId: uuidv4(),
          ...q,
          answerOptions,
          cached: false,
          createdAt: new Date().toISOString(),
        };

        await putItem(TABLES.QUESTIONS, fullQuestion);
        uploaded++;
      } catch (err) {
        errors.push(`Failed to upload: "${q.questionText.slice(0, 50)}..."`);
      }
    }

    return NextResponse.json({
      success: true,
      uploaded,
      failed: errors.length,
      errors: errors.slice(0, 5),
      message: `Successfully uploaded ${uploaded} of ${questions.length} questions`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to upload questions" }, { status: 500 });
  }
}
