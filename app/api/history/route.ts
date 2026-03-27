/**
 * GET /api/history?childId=<id>&subject=<maths|english|science>&limit=<N>
 *
 * Returns the last N answered questions for a child, grouped by session.
 * Accessible by the parent who owns the child (via session) or the child
 * themselves (via kid actor session).
 *
 * Query params:
 *   childId   required — the child's ID
 *   subject   optional — filter to one subject (maths | english | science)
 *   limit     optional — max questions to return, default 100
 *
 * Response:
 *   {
 *     childId: string,
 *     sessions: Array<{
 *       sessionId: string,
 *       subject: string,
 *       date: string,        // YYYY-MM-DD
 *       questions: Array<{
 *         questionId: string,
 *         correct: boolean,
 *         topic: string,
 *         difficulty: number,
 *         timeSpent: number,
 *         answeredAt: string  // ISO timestamp
 *       }>
 *     }>
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { createDdb, getItem, TABLES } from "@/lib/dynamodb";
import { getSession } from "@/lib/auth";

// ── Auth helper ───────────────────────────────────────────────────────────────

async function getActorUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id ?? null;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const userId = await getActorUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const childId = searchParams.get("childId");
    if (!childId) {
      return NextResponse.json({ error: "childId is required" }, { status: 400 });
    }

    const subjectFilter = searchParams.get("subject") as "maths" | "english" | "science" | null;
    const limitParam = parseInt(searchParams.get("limit") ?? "100", 10);
    const limit = Math.min(Math.max(limitParam, 1), 500); // cap at 500

    // Verify the child belongs to this user
    const childRecord = await getItem(TABLES.CHILDREN, { userId, childId });
    if (!childRecord) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    // Query progress records for this child (most recent first)
    const ddb = createDdb();
    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLES.PROGRESS,
        KeyConditionExpression: "childId = :childId",
        ExpressionAttributeValues: { ":childId": childId },
        ScanIndexForward: false, // newest first
        Limit: limit * 3,       // over-fetch to account for subject filtering
      })
    );

    const records = (result.Items ?? []) as Array<{
      childId: string;
      sessionKey: string;
      sessionId: string;
      questionId: string;
      subject: string;
      correct: boolean;
      timeSpent: number;
      difficultyAttempted: number;
      topic: string;
      createdAt: string;
    }>;

    // Filter by subject if requested
    const filtered = subjectFilter
      ? records.filter((r) => r.subject === subjectFilter)
      : records;

    // Limit to requested count
    const limited = filtered.slice(0, limit);

    // Group into sessions
    const sessionMap = new Map<string, {
      sessionId: string;
      subject: string;
      date: string;
      questions: Array<{
        questionId: string;
        correct: boolean;
        topic: string;
        difficulty: number;
        timeSpent: number;
        answeredAt: string;
      }>;
    }>();

    for (const rec of limited) {
      const sid = rec.sessionId;
      // sessionKey format: YYYY-MM-DD#<iso-timestamp>#<questionId>
      const date = rec.sessionKey?.split("#")[0] ?? rec.createdAt?.slice(0, 10) ?? "unknown";

      if (!sessionMap.has(sid)) {
        sessionMap.set(sid, {
          sessionId: sid,
          subject: rec.subject,
          date,
          questions: [],
        });
      }

      sessionMap.get(sid)!.questions.push({
        questionId: rec.questionId,
        correct: rec.correct,
        topic: rec.topic,
        difficulty: rec.difficultyAttempted,
        timeSpent: rec.timeSpent,
        answeredAt: rec.createdAt,
      });
    }

    const sessions = Array.from(sessionMap.values()).sort(
      (a, b) => b.date.localeCompare(a.date)
    );

    return NextResponse.json({ childId, sessions });
  } catch (error) {
    console.error("History error:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
