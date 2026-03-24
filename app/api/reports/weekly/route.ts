import { NextRequest, NextResponse } from "next/server";
import { scanItems, queryItems, TABLES } from "@/lib/dynamodb";
import { sendWeeklyReport } from "@/lib/email";
import type { ChildWeeklyReport, WeeklyReportData } from "@/lib/email";
import type { Achievement } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for large user bases

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function isoDateOnly(d: Date): string {
  return d.toISOString().split("T")[0];
}

export async function POST(req: NextRequest) {
  // Secure this endpoint — only GitHub Actions cron or admin can call it
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() - 1); // yesterday
  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekStart.getDate() - 6); // 7 days ago

  const weekStartStr = isoDateOnly(weekStart);
  const weekEndStr = isoDateOnly(weekEnd) + "T23:59:59";

  const twoWeeksStart = new Date(weekStart);
  twoWeeksStart.setDate(twoWeeksStart.getDate() - 7);
  const twoWeeksStartStr = isoDateOnly(twoWeeksStart);
  const twoWeeksEndStr = isoDateOnly(new Date(weekStart.getTime() - 1000));

  let sent = 0;
  const errors: string[] = [];

  try {
    // Scan all users with active/trial subscription
    const users = await scanItems(
      TABLES.USERS,
      "#ss IN (:active, :trial)",
      { ":active": "active", ":trial": "trial" },
      { "#ss": "subscriptionStatus" }
    );

    for (const user of users) {
      if (!user.email) continue;

      try {
        // Get all children for this user
        const children = await queryItems(
          TABLES.CHILDREN,
          "userId = :uid",
          { ":uid": user.userId }
        );

        if (!children.length) continue;

        const childReports: ChildWeeklyReport[] = [];

        for (const child of children) {
          // Query this week's progress
          const thisWeekProgress = await queryItems(
            TABLES.PROGRESS,
            "childId = :cid AND sessionKey BETWEEN :start AND :end",
            {
              ":cid": child.childId,
              ":start": weekStartStr,
              ":end": weekEndStr,
            }
          );

          // Query prior week's progress for delta calculation
          const priorWeekProgress = await queryItems(
            TABLES.PROGRESS,
            "childId = :cid AND sessionKey BETWEEN :start AND :end",
            {
              ":cid": child.childId,
              ":start": twoWeeksStartStr,
              ":end": twoWeeksEndStr,
            }
          );

          // Achievements unlocked this week
          const achievements = await queryItems(
            TABLES.ACHIEVEMENTS,
            "childId = :cid",
            { ":cid": child.childId },
            undefined,
            undefined,
            "unlockedDate >= :start",
            { ":start": weekStartStr } as unknown as number
          );

          // Calculate stats
          const calcAccuracy = (records: Record<string, unknown>[], subject?: string) => {
            const filtered = subject ? records.filter((r) => r.subject === subject) : records;
            if (!filtered.length) return 0;
            const correct = filtered.filter((r) => r.correct).length;
            return Math.round((correct / filtered.length) * 100);
          };

          const uniqueSessions = new Set(thisWeekProgress.map((r) => r.sessionId as string));
          const totalMinutes = Math.round(
            thisWeekProgress.reduce((sum, r) => sum + ((r.timeSpent as number) || 0), 0) / 60
          );

          const thisWeekCoins = thisWeekProgress.reduce(
            (sum, r) => sum + ((r.coinsEarned as number) || 0), 0
          );

          const mathsNow = calcAccuracy(thisWeekProgress as Record<string, unknown>[], "maths");
          const englishNow = calcAccuracy(thisWeekProgress as Record<string, unknown>[], "english");
          const scienceNow = calcAccuracy(thisWeekProgress as Record<string, unknown>[], "science");

          const mathsPrior = calcAccuracy(priorWeekProgress as Record<string, unknown>[], "maths");
          const englishPrior = calcAccuracy(priorWeekProgress as Record<string, unknown>[], "english");
          const sciencePrior = calcAccuracy(priorWeekProgress as Record<string, unknown>[], "science");

          const topicsStudied = Array.from(
            new Set(thisWeekProgress.map((r) => r.topic as string).filter(Boolean))
          );

          childReports.push({
            childName: child.childName as string,
            grade: (child.grade as string) || (child.yearLevel as string) || "",
            country: (child.country as string) || "AU",
            sessionsCount: uniqueSessions.size,
            totalMinutes,
            mathsAccuracy: mathsNow,
            englishAccuracy: englishNow,
            scienceAccuracy: scienceNow,
            mathsDelta: mathsNow - mathsPrior,
            englishDelta: englishNow - englishPrior,
            scienceDelta: scienceNow - sciencePrior,
            coinsEarned: thisWeekCoins,
            streakDays: (child.streakDays as number) || 0,
            newAchievements: achievements as unknown as Achievement[],
            topicsStudied,
          });
        }

        const reportData: WeeklyReportData = {
          parentName: user.parentName as string,
          parentEmail: user.email as string,
          weekStart: formatDate(weekStart),
          weekEnd: formatDate(weekEnd),
          children: childReports,
        };

        await sendWeeklyReport(reportData);
        sent++;
      } catch (userErr) {
        console.error(`Failed to send report for ${user.email}:`, userErr);
        errors.push(user.email as string);
      }
    }
  } catch (err) {
    console.error("Weekly report job failed:", err);
    return NextResponse.json({ error: "Report job failed" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    sent,
    errors,
    weekStart: formatDate(weekStart),
    weekEnd: formatDate(weekEnd),
  });
}
