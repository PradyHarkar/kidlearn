import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { createDdb, getItem, TABLES } from "@/lib/dynamodb";
import type {
  Child,
  ProgressAlertSummary,
  ProgressAlert,
  ProgressSessionSummary,
  Subject,
  TopicPerformanceSummary,
  TopicPerformanceTopic,
  WeeklyDigestSummary,
  WeeklyDigestTopic,
} from "@/types";

type ProgressRecordLike = Record<string, unknown>;

const SUBJECTS: Subject[] = ["maths", "english", "science"];

function toIsoDateOnly(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getIsoDateTime(date: Date): string {
  return date.toISOString();
}

async function loadProgressRecords(childId: string): Promise<ProgressRecordLike[]> {
  const ddb = createDdb();
  const records: ProgressRecordLike[] = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const result = await ddb.send(new QueryCommand({
      TableName: TABLES.PROGRESS,
      KeyConditionExpression: "childId = :childId",
      ExpressionAttributeValues: { ":childId": childId },
      ExclusiveStartKey: lastEvaluatedKey,
      Limit: 300,
    }));

    records.push(...((result.Items || []) as ProgressRecordLike[]));
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return records.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

function normalizeTopic(value: unknown): string {
  return String(value || "general").trim().toLowerCase().replace(/\s+/g, " ");
}

function buildTopicBuckets(records: ProgressRecordLike[]) {
  const subjectBuckets = new Map<Subject, Map<string, {
    attempts: number;
    correct: number;
    incorrect: number;
    lastAttemptAt: string;
  }>>();

  const topTopics = new Map<string, {
    subject: Subject;
    topic: string;
    attempts: number;
    correct: number;
    incorrect: number;
    lastAttemptAt: string;
  }>();

  let overallAttempts = 0;
  let overallCorrect = 0;

  for (const subject of SUBJECTS) {
    subjectBuckets.set(subject, new Map());
  }

  for (const record of records) {
    const subject = record.subject as Subject | undefined;
    if (!subject || !subjectBuckets.has(subject)) continue;

    const topic = normalizeTopic(record.topic);
    const correct = !!record.correct;
    const createdAt = String(record.createdAt || "");
    const subjectBucket = subjectBuckets.get(subject)!;
    const bucket = subjectBucket.get(topic) || { attempts: 0, correct: 0, incorrect: 0, lastAttemptAt: createdAt };
    bucket.attempts += 1;
    if (correct) {
      bucket.correct += 1;
      overallCorrect += 1;
    } else {
      bucket.incorrect += 1;
    }
    overallAttempts += 1;
    bucket.lastAttemptAt = createdAt || bucket.lastAttemptAt;
    subjectBucket.set(topic, bucket);

    const key = `${subject}#${topic}`;
    const existing = topTopics.get(key) || { subject, topic, attempts: 0, correct: 0, incorrect: 0, lastAttemptAt: createdAt };
    existing.attempts += 1;
    if (correct) {
      existing.correct += 1;
    } else {
      existing.incorrect += 1;
    }
    existing.lastAttemptAt = createdAt || existing.lastAttemptAt;
    topTopics.set(key, existing);
  }

  const subjects = SUBJECTS.reduce((acc, subject) => {
    const topicMap = subjectBuckets.get(subject)!;
    const topics: TopicPerformanceTopic[] = Array.from(topicMap.entries())
      .map(([topic, bucket]) => ({
        topic,
        attempts: bucket.attempts,
        correct: bucket.correct,
        incorrect: bucket.incorrect,
        accuracy: bucket.attempts ? Math.round((bucket.correct / bucket.attempts) * 100) : 0,
        lastAttemptAt: bucket.lastAttemptAt,
      }))
      .sort((a, b) => b.attempts - a.attempts || b.accuracy - a.accuracy || a.topic.localeCompare(b.topic));

    const subjectAttempts = topics.reduce((sum, topic) => sum + topic.attempts, 0);
    const subjectCorrect = topics.reduce((sum, topic) => sum + topic.correct, 0);

    acc[subject] = {
      subject,
      attempts: subjectAttempts,
      correct: subjectCorrect,
      incorrect: subjectAttempts - subjectCorrect,
      accuracy: subjectAttempts ? Math.round((subjectCorrect / subjectAttempts) * 100) : 0,
      topics,
    };
    return acc;
  }, {} as Record<Subject, {
    subject: Subject;
    attempts: number;
    correct: number;
    incorrect: number;
    accuracy: number;
    topics: TopicPerformanceTopic[];
  }>);

  const sortedTopTopics = Array.from(topTopics.values())
    .map((topic) => ({
      ...topic,
      accuracy: topic.attempts ? Math.round((topic.correct / topic.attempts) * 100) : 0,
    }))
    .sort((a, b) => b.attempts - a.attempts || b.accuracy - a.accuracy || a.topic.localeCompare(b.topic))
    .slice(0, 8);

  return {
    overallAttempts,
    overallCorrect,
    subjects,
    topTopics: sortedTopTopics,
  };
}

function summarizeSessions(records: ProgressRecordLike[]): ProgressSessionSummary[] {
  const grouped = new Map<string, ProgressRecordLike[]>();

  for (const record of records) {
    const sessionId = String(record.sessionId || "");
    if (!sessionId) continue;
    const bucket = grouped.get(sessionId) || [];
    bucket.push(record);
    grouped.set(sessionId, bucket);
  }

  return Array.from(grouped.entries())
    .map(([sessionId, items]) => {
      const total = items.length;
      const correct = items.filter((item) => !!item.correct).length;
      const first = items[items.length - 1] || {};
      const last = items[0] || {};
      const topics = Array.from(new Set(items.map((item) => normalizeTopic(item.topic)).filter(Boolean)));

      return {
        sessionId,
        subject: (items[0]?.subject as Subject) || "maths",
        completedAt: String(last.createdAt || first.createdAt || ""),
        totalQuestions: total,
        correct,
        incorrect: total - correct,
        accuracy: total ? Math.round((correct / total) * 100) : 0,
        difficultyStart: Number(first.difficultyAttempted ?? first.difficulty ?? 1),
        difficultyEnd: Number(last.difficultyAttempted ?? last.difficulty ?? 1),
        topic: topics[0] || "general",
      };
    })
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, 5);
}

function getWeekWindow() {
  const weekEnd = new Date();
  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekStart.getDate() - 6);

  return {
    weekStart,
    weekEnd,
    weekStartIso: getIsoDateTime(new Date(weekStart.setHours(0, 0, 0, 0))),
    weekEndIso: getIsoDateTime(new Date(weekEnd.setHours(23, 59, 59, 999))),
  };
}

function buildWeeklyTopicSummary(records: ProgressRecordLike[]): WeeklyDigestTopic[] {
  const buckets = new Map<string, WeeklyDigestTopic>();

  for (const record of records) {
    const subject = record.subject as Subject | undefined;
    if (!subject || !SUBJECTS.includes(subject)) continue;
    const topic = normalizeTopic(record.topic);
    const key = `${subject}#${topic}`;
    const existing = buckets.get(key) || {
      subject,
      topic,
      attempts: 0,
      correct: 0,
      incorrect: 0,
      accuracy: 0,
    };
    existing.attempts += 1;
    if (record.correct) existing.correct += 1;
    else existing.incorrect += 1;
    existing.accuracy = existing.attempts ? Math.round((existing.correct / existing.attempts) * 100) : 0;
    buckets.set(key, existing);
  }

  return Array.from(buckets.values())
    .sort((a, b) => b.attempts - a.attempts || b.accuracy - a.accuracy || a.topic.localeCompare(b.topic))
    .slice(0, 8);
}

export async function getProgressTopicSummaryForChild(childId: string): Promise<TopicPerformanceSummary> {
  const records = await loadProgressRecords(childId);
  const buckets = buildTopicBuckets(records);
  return {
    childId,
    overallAccuracy: buckets.overallAttempts ? Math.round((buckets.overallCorrect / buckets.overallAttempts) * 100) : 0,
    subjects: buckets.subjects,
    topTopics: buckets.topTopics,
    updatedAt: records[0]?.createdAt ? String(records[0].createdAt) : new Date().toISOString(),
  };
}

export async function getProgressAlertsForChild(childId: string): Promise<ProgressAlertSummary> {
  const records = await loadProgressRecords(childId);
  const subjectTopicMap = new Map<string, ProgressRecordLike[]>();

  for (const record of records) {
    const subject = record.subject as Subject | undefined;
    if (!subject || !SUBJECTS.includes(subject)) continue;
    const topic = normalizeTopic(record.topic);
    const key = `${subject}#${topic}`;
    const bucket = subjectTopicMap.get(key) || [];
    bucket.push(record);
    subjectTopicMap.set(key, bucket);
  }

  const alerts: ProgressAlert[] = Array.from(subjectTopicMap.entries())
    .map(([key, items]) => {
      const [subject, topic] = key.split("#") as [Subject, string];
      const recent = items
        .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
        .slice(0, 10);
      const attempts = recent.length;
      const correct = recent.filter((item) => !!item.correct).length;
      const incorrect = attempts - correct;
      const accuracy = attempts ? Math.round((correct / attempts) * 100) : 0;
      const severity: ProgressAlert["severity"] = accuracy < 35 ? "danger" : "warning";

      return {
        subject,
        topic,
        attempts,
        correct,
        incorrect,
        accuracy,
        severity,
        message: `Last 10 ${subject} attempts on ${topic} are at ${accuracy}%.`,
        actionLabel: "Open practice",
        actionUrl: `/learn?child=${childId}&subject=${subject}`,
      };
    })
    .filter((alert) => alert.attempts >= 5 && alert.accuracy < 50)
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)
    .slice(0, 5);

  return {
    childId,
    alerts,
    updatedAt: records[0]?.createdAt ? String(records[0].createdAt) : new Date().toISOString(),
  };
}

export async function getWeeklyDigestForChild(userId: string, childId: string): Promise<WeeklyDigestSummary | null> {
  const child = await getItem(TABLES.CHILDREN, { userId, childId });
  if (!child) return null;

  const typedChild = child as Child;
  const records = await loadProgressRecords(childId);
  const { weekStartIso, weekEndIso } = getWeekWindow();
  const weeklyRecords = records.filter((record) => {
    const createdAt = String(record.createdAt || "");
    return createdAt >= weekStartIso && createdAt <= weekEndIso;
  });

  const totalQuestions = weeklyRecords.length;
  const correct = weeklyRecords.filter((record) => !!record.correct).length;
  const accuracy = totalQuestions ? Math.round((correct / totalQuestions) * 100) : 0;
  const subjectAccuracy = SUBJECTS.reduce((acc, subject) => {
    const subjectRecords = weeklyRecords.filter((record) => record.subject === subject);
    const subjectCorrect = subjectRecords.filter((record) => !!record.correct).length;
    acc[subject] = subjectRecords.length ? Math.round((subjectCorrect / subjectRecords.length) * 100) : 0;
    return acc;
  }, {} as Record<Subject, number>);

  return {
    childId,
    childName: typedChild.childName,
    weekStart: toIsoDateOnly(new Date(weekStartIso)),
    weekEnd: toIsoDateOnly(new Date()),
    totalSessions: new Set(weeklyRecords.map((record) => String(record.sessionId || ""))).size,
    totalQuestions,
    correct,
    accuracy,
    rewardPointsEarned: totalQuestions,
    streakDays: typedChild.streakDays || 0,
    subjectAccuracy,
    topTopics: buildWeeklyTopicSummary(weeklyRecords),
    recentSessions: summarizeSessions(weeklyRecords),
  };
}
