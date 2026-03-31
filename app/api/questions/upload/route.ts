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
import { getAuthOptions, getNextAuthSecret } from "@/lib/auth-options";
import { putItem, TABLES } from "@/lib/dynamodb";
import { toAgeGroup, toLegacyYearLevel } from "@/lib/learner";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const ageGroupSchema = z.enum([
  "foundation",
  "year1",
  "year2",
  "year3",
  "year4",
  "year5",
  "year6",
  "year7",
  "year8",
]);

const countrySchema = z.enum(["AU", "US", "IN", "UK"]);

const answerOptionSchema = z.object({
  id: z.string().optional(),
  text: z.string(),
  emoji: z.string().optional(),
  imageUrl: z.string().optional(),
  visualDescription: z.string().optional(),
  imageAlt: z.string().optional(),
  isCorrect: z.boolean(),
});

const questionSchema = z.object({
  questionText: z.string().min(1),
  answerOptions: z.array(answerOptionSchema).length(4),
  difficulty: z.number().min(1).max(10),
  topics: z.array(z.string()),
  explanation: z.string(),
  subject: z.enum(["maths", "english", "science"]),
  yearLevel: z.enum(["prep", "foundation", "year1", "year2", "year3", "year4", "year5", "year6", "year7", "year8"]).optional(),
  ageGroup: ageGroupSchema.optional(),
  country: countrySchema.optional(),
  grade: z.string().optional(),
  hint: z.string().optional(),
  ttsText: z.string().optional(),
  interactionType: z.string().optional(),
  interactionData: z.record(z.string(), z.unknown()).optional(),
  generationMetadata: z.object({
    generator: z.enum(["seed", "bedrock", "template", "manual-import"]),
    templateId: z.string().optional(),
    variantKey: z.string().optional(),
    visualStyle: z.enum(["playful", "illustrated", "standard"]).optional(),
    targetAgeBand: z.enum(["early-years", "primary", "middle-school"]).optional(),
    benchmarkFamily: z.string().optional(),
    examStyle: z.string().optional(),
    qualityVersion: z.string().optional(),
  }).optional(),
});

const uploadSchema = z.object({
  questions: z.array(questionSchema),
  secret: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(await getAuthOptions());
    const body = await req.json();
    const { questions, secret } = uploadSchema.parse(body);

    // Allow either authenticated session or secret key (for bulk imports)
    const nextAuthSecret = await getNextAuthSecret();
    if (!session?.user && secret !== nextAuthSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let uploaded = 0;
    const errors: string[] = [];

    for (const q of questions) {
      try {
        const ageGroup = q.ageGroup ?? (q.yearLevel ? toAgeGroup(q.yearLevel) : null);
        if (!ageGroup) {
          errors.push(`Missing ageGroup/yearLevel for: "${q.questionText.slice(0, 50)}..."`);
          continue;
        }

        // Ensure each option has an id
        const answerOptions = q.answerOptions.map((opt, idx) => ({
          ...opt,
          id: opt.id || `opt-${idx}`,
        }));

        const fullQuestion = {
          pk: q.country ? `${q.subject}#${ageGroup}#${q.country}` : `${q.subject}#${ageGroup}`,
          questionId: uuidv4(),
          ...q,
          ageGroup,
          yearLevel: toLegacyYearLevel(ageGroup),
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
