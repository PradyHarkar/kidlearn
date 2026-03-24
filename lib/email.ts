import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import type { Achievement } from "@/types";

export const sesClient = new SESClient({
  region: process.env.SES_REGION || process.env.AWS_REGION || "ap-southeast-2",
  ...(process.env.AWS_ACCESS_KEY_ID && {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  }),
});

export interface ChildWeeklyReport {
  childName: string;
  grade: string;
  country: string;
  sessionsCount: number;
  totalMinutes: number;
  mathsAccuracy: number;
  englishAccuracy: number;
  scienceAccuracy: number;
  mathsDelta: number;   // percentage point change vs prior week
  englishDelta: number;
  scienceDelta: number;
  coinsEarned: number;
  streakDays: number;
  newAchievements: Achievement[];
  topicsStudied: string[];
}

export interface WeeklyReportData {
  parentName: string;
  parentEmail: string;
  weekStart: string; // "March 17, 2026"
  weekEnd: string;   // "March 23, 2026"
  children: ChildWeeklyReport[];
}

function deltaArrow(delta: number): string {
  if (delta > 0) return `<span style="color:#16a34a">&#9650; ${delta.toFixed(0)}%</span>`;
  if (delta < 0) return `<span style="color:#dc2626">&#9660; ${Math.abs(delta).toFixed(0)}%</span>`;
  return `<span style="color:#6b7280">&#8212;</span>`;
}

function accuracyBar(accuracy: number, color: string): string {
  const width = Math.round(accuracy);
  return `
    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="width:${width}%;background:${color};height:8px;border-radius:4px 0 0 4px;"></td>
        <td style="width:${100 - width}%;background:#e5e7eb;height:8px;border-radius:0 4px 4px 0;"></td>
      </tr>
    </table>`;
}

function childSection(child: ChildWeeklyReport): string {
  const achievements = child.newAchievements.length
    ? child.newAchievements.map((a) => `<span style="display:inline-block;background:#fef3c7;border:1px solid #f59e0b;border-radius:12px;padding:2px 10px;margin:2px;font-size:13px;">${a.badgeIcon} ${a.badgeName}</span>`).join("")
    : `<span style="color:#9ca3af;font-size:13px;">No new badges this week</span>`;

  const topics = child.topicsStudied.length
    ? child.topicsStudied.slice(0, 6).map((t) => `<span style="display:inline-block;background:#ede9fe;border-radius:10px;padding:2px 8px;margin:2px;font-size:12px;color:#7c3aed;">${t}</span>`).join("")
    : "";

  return `
  <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-bottom:24px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <tr>
      <td style="background:linear-gradient(135deg,#7c3aed,#db2777);padding:16px 20px;">
        <h2 style="margin:0;color:#ffffff;font-size:20px;font-family:Arial,sans-serif;">
          ${child.childName}
          <span style="font-size:14px;font-weight:normal;opacity:0.9;margin-left:8px;">${child.grade}</span>
        </h2>
      </td>
    </tr>
    <tr>
      <td style="padding:20px;">
        <!-- Stats row -->
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr>
            <td style="width:25%;text-align:center;padding:12px;background:#f9fafb;border-radius:8px;margin-right:8px;">
              <div style="font-size:24px;font-weight:bold;color:#7c3aed;font-family:Arial,sans-serif;">${child.sessionsCount}</div>
              <div style="font-size:12px;color:#6b7280;font-family:Arial,sans-serif;">Sessions</div>
            </td>
            <td style="width:4%;"></td>
            <td style="width:25%;text-align:center;padding:12px;background:#f9fafb;border-radius:8px;">
              <div style="font-size:24px;font-weight:bold;color:#db2777;font-family:Arial,sans-serif;">${child.totalMinutes}</div>
              <div style="font-size:12px;color:#6b7280;font-family:Arial,sans-serif;">Minutes</div>
            </td>
            <td style="width:4%;"></td>
            <td style="width:25%;text-align:center;padding:12px;background:#f9fafb;border-radius:8px;">
              <div style="font-size:24px;font-weight:bold;color:#d97706;font-family:Arial,sans-serif;">${child.coinsEarned}</div>
              <div style="font-size:12px;color:#6b7280;font-family:Arial,sans-serif;">Coins</div>
            </td>
            <td style="width:4%;"></td>
            <td style="width:25%;text-align:center;padding:12px;background:#f9fafb;border-radius:8px;">
              <div style="font-size:24px;font-weight:bold;color:#16a34a;font-family:Arial,sans-serif;">${child.streakDays}${child.streakDays > 0 ? " 🔥" : ""}</div>
              <div style="font-size:12px;color:#6b7280;font-family:Arial,sans-serif;">Day Streak</div>
            </td>
          </tr>
        </table>

        <!-- Subject accuracy -->
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr><td style="padding-bottom:12px;">
            <table cellpadding="0" cellspacing="0" style="width:100%;">
              <tr>
                <td style="font-family:Arial,sans-serif;font-size:14px;font-weight:bold;color:#374151;width:80px;">Maths</td>
                <td style="font-family:Arial,sans-serif;font-size:14px;color:#374151;width:45px;text-align:right;">${child.mathsAccuracy.toFixed(0)}%</td>
                <td style="width:8px;"></td>
                <td style="font-family:Arial,sans-serif;font-size:12px;">${deltaArrow(child.mathsDelta)}</td>
              </tr>
              <tr><td colspan="4" style="padding-top:4px;">${accuracyBar(child.mathsAccuracy, "#7c3aed")}</td></tr>
            </table>
          </td></tr>
          <tr><td style="padding-bottom:12px;">
            <table cellpadding="0" cellspacing="0" style="width:100%;">
              <tr>
                <td style="font-family:Arial,sans-serif;font-size:14px;font-weight:bold;color:#374151;width:80px;">English</td>
                <td style="font-family:Arial,sans-serif;font-size:14px;color:#374151;width:45px;text-align:right;">${child.englishAccuracy.toFixed(0)}%</td>
                <td style="width:8px;"></td>
                <td style="font-family:Arial,sans-serif;font-size:12px;">${deltaArrow(child.englishDelta)}</td>
              </tr>
              <tr><td colspan="4" style="padding-top:4px;">${accuracyBar(child.englishAccuracy, "#2563eb")}</td></tr>
            </table>
          </td></tr>
          <tr><td>
            <table cellpadding="0" cellspacing="0" style="width:100%;">
              <tr>
                <td style="font-family:Arial,sans-serif;font-size:14px;font-weight:bold;color:#374151;width:80px;">Science</td>
                <td style="font-family:Arial,sans-serif;font-size:14px;color:#374151;width:45px;text-align:right;">${child.scienceAccuracy.toFixed(0)}%</td>
                <td style="width:8px;"></td>
                <td style="font-family:Arial,sans-serif;font-size:12px;">${deltaArrow(child.scienceDelta)}</td>
              </tr>
              <tr><td colspan="4" style="padding-top:4px;">${accuracyBar(child.scienceAccuracy, "#16a34a")}</td></tr>
            </table>
          </td></tr>
        </table>

        <!-- Achievements -->
        <div style="margin-bottom:12px;">
          <div style="font-family:Arial,sans-serif;font-size:13px;font-weight:bold;color:#374151;margin-bottom:6px;">🏆 Badges Earned This Week</div>
          ${achievements}
        </div>

        ${topics ? `<div><div style="font-family:Arial,sans-serif;font-size:13px;font-weight:bold;color:#374151;margin-bottom:6px;">📚 Topics Studied</div>${topics}</div>` : ""}
      </td>
    </tr>
  </table>`;
}

export function buildWeeklyReportHtml(data: WeeklyReportData): string {
  const childSections = data.children.map(childSection).join("");
  const hasActivity = data.children.some((c) => c.sessionsCount > 0);

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table cellpadding="0" cellspacing="0" style="width:100%;background:#f3f4f6;">
    <tr><td style="padding:32px 16px;">
      <table cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;margin:0 auto;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#db2777);border-radius:16px 16px 0 0;padding:32px;text-align:center;">
          <div style="font-size:36px;margin-bottom:8px;">🎓</div>
          <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:900;">KidLearn</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:15px;">Weekly Progress Report</p>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">${data.weekStart} — ${data.weekEnd}</p>
        </td></tr>

        <!-- Greeting -->
        <tr><td style="background:#ffffff;padding:24px 32px;">
          <p style="margin:0 0 16px;font-size:16px;color:#374151;">Hi <strong>${data.parentName}</strong>,</p>
          <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.6;">
            ${hasActivity
              ? "Here's a summary of your children's learning activity this week. Keep up the great work!"
              : "It looks like there wasn't much activity this week. Log in and start a session to keep the streak going!"}
          </p>
        </td></tr>

        <!-- Children sections -->
        <tr><td style="background:#f9fafb;padding:24px 32px;">
          ${childSections}
        </td></tr>

        <!-- CTA -->
        <tr><td style="background:#ffffff;padding:24px 32px;text-align:center;">
          <a href="${process.env.NEXTAUTH_URL || "https://kidlearn.app"}/dashboard"
             style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#db2777);color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:14px 32px;border-radius:50px;">
            View Full Dashboard →
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            You're receiving this because you have an active KidLearn account.<br>
            © ${new Date().getFullYear()} KidLearn. All rights reserved.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendWeeklyReport(data: WeeklyReportData): Promise<void> {
  const fromEmail = process.env.SES_FROM_EMAIL || "noreply@kidlearn.app";
  const html = buildWeeklyReportHtml(data);

  await sesClient.send(
    new SendEmailCommand({
      Source: `KidLearn <${fromEmail}>`,
      Destination: { ToAddresses: [data.parentEmail] },
      Message: {
        Subject: {
          Data: `KidLearn Weekly Report — ${data.weekStart}`,
          Charset: "UTF-8",
        },
        Body: {
          Html: { Data: html, Charset: "UTF-8" },
          Text: {
            Data: `KidLearn Weekly Progress Report for ${data.weekStart} — ${data.weekEnd}\n\nHi ${data.parentName},\n\nLog in to view your children's progress: ${process.env.NEXTAUTH_URL || "https://kidlearn.app"}/dashboard`,
            Charset: "UTF-8",
          },
        },
      },
    })
  );
}
