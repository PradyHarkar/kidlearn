import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActorSession } from "@/lib/actor-session";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.BEDROCK_REGION || "us-east-1",
  ...(process.env.AWS_ACCESS_KEY_ID && {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  }),
});

const MODEL_ID = process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-5-sonnet-20241022-v2:0";

// In-memory rate limit: max 3 calls per child per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 3) return false;
  entry.count++;
  return true;
}

const schema = z.object({
  questionText:  z.string().min(1).max(500),
  correctAnswer: z.string().min(1).max(300),
  chosenAnswer:  z.string().min(1).max(300),
  subject:       z.enum(["maths", "english", "science"]),
  topics:        z.array(z.string()).optional(),
  childId:       z.string().optional(),
  ageGroup:      z.string().optional(),  // e.g. "year5" — used to tune explanation level
});

export async function POST(req: NextRequest) {
  try {
    const actor = await getActorSession();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const input = schema.parse(body);

    // Rate limit per child (or per user if no childId)
    const rateLimitKey = `${actor.userId}:${input.childId || "none"}`;
    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { error: "Too many explanation requests. Please wait a moment!" },
        { status: 429 }
      );
    }

    const ageLabel = ageGroupToLabel(input.ageGroup);
    const topicContext = input.topics?.length ? ` (topic: ${input.topics[0]})` : "";

    const prompt = `You are a friendly, encouraging tutor for a ${ageLabel} student.

The student answered a ${input.subject} question incorrectly${topicContext}.

Question: ${input.questionText}
Correct answer: ${input.correctAnswer}
Student chose: ${input.chosenAnswer}

Write a SHORT (2-3 sentences max), kid-friendly explanation of WHY the correct answer is right.
- Use simple words appropriate for a ${ageLabel} student
- Be encouraging, not critical
- No markdown, no bullet points — just plain friendly sentences
- End with one short encouraging phrase`;

    const response = await bedrockClient.send(new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 150,
        messages: [{ role: "user", content: prompt }],
      }),
    }));

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const explanation = responseBody.content?.[0]?.text?.trim() || "";

    if (!explanation) {
      throw new Error("Empty response from Bedrock");
    }

    return NextResponse.json({ explanation }, { status: 200 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Tutor explanation error:", error);
    return NextResponse.json(
      { error: "Could not generate explanation right now. Try again!" },
      { status: 500 }
    );
  }
}

function ageGroupToLabel(ageGroup: string | undefined): string {
  const map: Record<string, string> = {
    foundation: "5-6 year old",
    year1: "6-7 year old",
    year2: "7-8 year old",
    year3: "8-9 year old",
    year4: "9-10 year old",
    year5: "10-11 year old",
    year6: "11-12 year old",
    year7: "12-13 year old",
    year8: "13-14 year old",
  };
  return ageGroup ? (map[ageGroup] || "primary school") : "primary school";
}
