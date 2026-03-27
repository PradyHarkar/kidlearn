/**
 * AI PARENT INSIGHTS
 * ──────────────────
 * Aggregates a child's progress data and calls Amazon Bedrock (Claude) to
 * produce a plain-English parent summary covering strengths, weaknesses,
 * trend, and next steps.
 *
 * Result is cached as JSON on the child DynamoDB record for 24 hours so
 * parents don't wait for a Bedrock round-trip on every page load.
 */

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { getItem, updateItem, TABLES } from "@/lib/dynamodb";
import {
  getProgressAlertsForChild,
  getProgressTopicSummaryForChild,
} from "@/lib/services/performance-insights";
import type { AgeGroup, Child, Subject } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AIInsight {
  summary: string;               // 2-3 sentence narrative for the parent
  strengths: string[];           // 2-3 specific strengths observed
  weaknesses: string[];          // 1-2 areas that need more practice
  trend: "improving" | "steady" | "needs-attention";
  trendDetail: string;           // one sentence on direction of progress
  nextSteps: string[];           // 2-3 concrete parent actions
  encouragement: string;         // short upbeat closing line
  generatedAt: string;           // ISO timestamp
  dataPoints: number;            // total questions analysed
}

// ── Config ────────────────────────────────────────────────────────────────────

const INSIGHT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MODEL_ID = process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-5-sonnet-20241022-v2:0";

function createBedrockClient(): BedrockRuntimeClient {
  return new BedrockRuntimeClient({
    region: process.env.BEDROCK_REGION || "us-east-1",
    ...(process.env.AWS_ACCESS_KEY_ID && {
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    }),
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const AGE_LABELS: Record<AgeGroup, string> = {
  foundation: "5-6 years (Foundation / Kindergarten)",
  year1:      "6-7 years (Year 1)",
  year2:      "7-8 years (Year 2)",
  year3:      "8-9 years (Year 3)",
  year4:      "9-10 years (Year 4)",
  year5:      "10-11 years (Year 5)",
  year6:      "11-12 years (Year 6)",
  year7:      "12-13 years (Year 7)",
  year8:      "13-14 years (Year 8)",
};

function cap(s: Subject): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(
  child: Child,
  topicSummary: Awaited<ReturnType<typeof getProgressTopicSummaryForChild>> | null,
  alertSummary: Awaited<ReturnType<typeof getProgressAlertsForChild>> | null
): string {
  const stats = child.stats;
  const total = stats?.totalQuestionsAttempted ?? 0;
  const correct = stats?.totalCorrect ?? 0;
  const overallPct = total > 0 ? Math.round((correct / total) * 100) : 0;

  // Per-subject lines
  const SUBJECTS: Subject[] = ["maths", "english", "science"];
  const subjectLines = SUBJECTS
    .filter((s) => (stats?.[`${s}Attempted` as keyof typeof stats] as number ?? 0) > 0)
    .map((s) => {
      const attempted = stats?.[`${s}Attempted` as keyof typeof stats] as number;
      const accuracy  = stats?.[`${s}Accuracy`  as keyof typeof stats] as number;
      const diff = s === "maths"
        ? child.currentDifficultyMaths
        : s === "english"
        ? child.currentDifficultyEnglish
        : child.currentDifficultyScience;
      return `  ${cap(s)}: ${attempted} questions, ${accuracy}% accuracy, difficulty ${diff}/10`;
    });

  // Top topics per subject (max 3 per subject, max 9 total)
  const topicLines: string[] = [];
  for (const s of SUBJECTS) {
    const subData = topicSummary?.subjects?.[s];
    if (!subData?.topics?.length) continue;
    subData.topics.slice(0, 3).forEach((t) => {
      topicLines.push(`  ${cap(s)} / ${t.topic}: ${t.attempts} attempts, ${t.accuracy}% accuracy`);
    });
  }

  // Struggling topics from smart alerts
  const alertLines = (alertSummary?.alerts ?? []).slice(0, 3).map((a) => {
    const acc = (a as { recentAccuracy?: number; subject?: string; topic?: string }).recentAccuracy ?? 0;
    const subj = (a as { subject?: string }).subject ?? "general";
    const topic = (a as { topic?: string }).topic ?? "unknown";
    return `  ${cap(subj as Subject)} / ${topic}: ${acc}% recent accuracy — needs attention`;
  });

  const ageLabel = child.ageGroup ? (AGE_LABELS[child.ageGroup] ?? "school age") : "school age";

  return `You are a helpful assistant writing a progress insight for a parent on KidLearn, an adaptive learning app for kids.

Child profile:
- Name: ${child.childName}
- Age group: ${ageLabel}
- Country: ${child.country ?? "AU"}
- Total questions answered: ${total}
- Overall accuracy: ${overallPct}%
- Current streak: ${child.streakDays ?? 0} days
- Reward coins: ${child.totalCoins ?? 0}

Subject performance (only subjects practiced so far):
${subjectLines.length ? subjectLines.join("\n") : "  No practice sessions yet"}

Topic breakdown (most-practiced topics):
${topicLines.length ? topicLines.join("\n") : "  No topic data yet"}

${alertLines.length ? `Topics that need more practice:\n${alertLines.join("\n")}` : ""}

Instructions:
- Write for the parent, not the child
- Be warm, specific, and encouraging — avoid jargon
- Keep the summary concise (2-3 sentences max)
- If data is limited, still provide useful general guidance
- Base strengths/weaknesses on the actual numbers above

Return ONLY valid JSON (no markdown fences, no extra text):
{
  "summary": "2-3 sentence plain-English overview of the child's progress",
  "strengths": ["specific observed strength 1", "specific observed strength 2"],
  "weaknesses": ["specific area needing more practice"],
  "trend": "improving",
  "trendDetail": "one sentence describing whether progress is going up, stable, or declining",
  "nextSteps": ["concrete action a parent can take right now", "second action"],
  "encouragement": "one short upbeat closing message for the parent"
}

The "trend" field must be exactly one of: "improving", "steady", "needs-attention".`;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Returns a cached insight if fresh (< 24 h), otherwise generates a new one
 * via Bedrock and caches it on the child record.
 *
 * Returns null if:
 *  - the child has zero questions answered (not enough data)
 *  - Bedrock fails
 */
export async function getOrGenerateInsight(
  userId: string,
  childId: string,
  forceRefresh = false
): Promise<AIInsight | null> {
  // 1. Load child
  const childRecord = await getItem(TABLES.CHILDREN, { userId, childId });
  if (!childRecord) return null;

  const child = childRecord as Child & {
    aiInsight?: string;
    aiInsightGeneratedAt?: string;
  };

  // 2. Return cache if fresh
  if (!forceRefresh && child.aiInsightGeneratedAt && child.aiInsight) {
    const ageMs = Date.now() - new Date(child.aiInsightGeneratedAt).getTime();
    if (ageMs < INSIGHT_TTL_MS) {
      try {
        return JSON.parse(child.aiInsight) as AIInsight;
      } catch {
        // Cache corrupt — fall through to regenerate
      }
    }
  }

  // 3. Need enough data to say something meaningful
  const totalAttempted = child.stats?.totalQuestionsAttempted ?? 0;
  if (totalAttempted === 0) return null;

  // 4. Gather supporting data (non-blocking failures are OK)
  const [topicSummary, alertSummary] = await Promise.all([
    getProgressTopicSummaryForChild(childId).catch(() => null),
    getProgressAlertsForChild(childId).catch(() => null),
  ]);

  // 5. Build prompt + call Bedrock
  const prompt = buildPrompt(child, topicSummary, alertSummary);

  try {
    const client = createBedrockClient();
    const response = await client.send(
      new InvokeModelCommand({
        modelId: MODEL_ID,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 800,
          messages: [{ role: "user", content: prompt }],
        }),
      })
    );

    const body = JSON.parse(new TextDecoder().decode(response.body));
    const text: string = body.content?.[0]?.text ?? "";

    // Extract JSON — handle both raw and markdown-fenced responses
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in Bedrock response");

    const parsed = JSON.parse(jsonMatch[0]);

    const VALID_TRENDS = ["improving", "steady", "needs-attention"] as const;
    const trend: AIInsight["trend"] = VALID_TRENDS.includes(parsed.trend)
      ? parsed.trend
      : "steady";

    const insight: AIInsight = {
      summary:      typeof parsed.summary === "string" ? parsed.summary : "",
      strengths:    Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 3) : [],
      weaknesses:   Array.isArray(parsed.weaknesses) ? parsed.weaknesses.slice(0, 2) : [],
      trend,
      trendDetail:  typeof parsed.trendDetail === "string" ? parsed.trendDetail : "",
      nextSteps:    Array.isArray(parsed.nextSteps) ? parsed.nextSteps.slice(0, 3) : [],
      encouragement: typeof parsed.encouragement === "string" ? parsed.encouragement : "",
      generatedAt:  new Date().toISOString(),
      dataPoints:   totalAttempted,
    };

    // 6. Cache on child record (non-fatal if update fails)
    try {
      await updateItem(
        TABLES.CHILDREN,
        { userId, childId },
        "SET aiInsight = :i, aiInsightGeneratedAt = :at",
        { ":i": JSON.stringify(insight), ":at": insight.generatedAt }
      );
    } catch {
      // Cache write failure is non-critical
    }

    return insight;
  } catch (error) {
    console.error("AI insight generation failed:", error);
    return null;
  }
}
