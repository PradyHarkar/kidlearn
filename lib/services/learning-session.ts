import { DescribeTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { deleteItem, getItem, putItem, TABLES } from "@/lib/dynamodb";
import { prepareQuestionForDelivery } from "@/lib/services/questions";
import type { ChildJourneyTheme, Question, Subject } from "@/types";

const ACTIVE_SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

export interface LearnSessionQuestionResult {
  questionId: string;
  correct: boolean;
  timeSpent: number;
  difficulty: number;
  topic: string;
}

export interface LearnSessionState {
  sessionId: string;
  userId: string;
  childId: string;
  subject: Subject;
  questions: Question[];
  currentIndex: number;
  selectedAnswer: string | null;
  isAnswered: boolean;
  results: LearnSessionQuestionResult[];
  currentDifficulty: number;
  ageGroup?: string;
  journeyTheme?: ChildJourneyTheme;
  timer: number;
  coins: number;
  streak: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  showHint: boolean;
  showExplanation: boolean;
  mascotMood: "happy" | "excited" | "thinking" | "sad" | "celebrating";
  mascotMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface LearnSessionRecord extends LearnSessionState {
  pk: string;
  sk: string;
  GSI1PK: string;
  GSI1SK: string;
  expires: number;
  status: "active";
}

type SessionTableMode = "composite" | "legacy";

const ddbClient = new DynamoDBClient({ region: "ap-southeast-2" });
let sessionTableModePromise: Promise<SessionTableMode> | null = null;

async function getSessionTableMode(): Promise<SessionTableMode> {
  if (!sessionTableModePromise) {
    sessionTableModePromise = (async () => {
      try {
        const result = await ddbClient.send(new DescribeTableCommand({ TableName: TABLES.SESSIONS }));
        const keys = result.Table?.KeySchema?.map((entry) => entry.AttributeName) || [];
        if (keys.includes("pk") && keys.includes("sk")) {
          return "composite";
        }
      } catch {
        // Fall through to legacy.
      }
      return "legacy";
    })();
  }
  return sessionTableModePromise;
}

async function sessionKey(userId: string, childId: string, subject: Subject) {
  const mode = await getSessionTableMode();
  if (mode === "composite") {
    return {
      pk: `LEARN#${userId}#${childId}`,
      sk: `SUBJECT#${subject}`,
    };
  }

  return {
    sessionId: `LEARN#${userId}#${childId}#${subject}`,
  };
}

async function toRecord(state: LearnSessionState): Promise<Record<string, unknown>> {
  const now = new Date().toISOString();
  const mode = await getSessionTableMode();
  const base = {
    expires: Math.floor(Date.now() / 1000) + ACTIVE_SESSION_TTL_SECONDS,
    status: "active" as const,
    ...state,
    updatedAt: now,
  };

  if (mode === "composite") {
    return {
      pk: `LEARN#${state.userId}#${state.childId}`,
      sk: `SUBJECT#${state.subject}`,
      GSI1PK: `CHILD#${state.childId}`,
      GSI1SK: now,
      ...base,
    };
  }

  return base;
}

function normalizeSessionQuestions(session: LearnSessionState): LearnSessionState {
  return {
    ...session,
    questions: (session.questions || []).map((question) => prepareQuestionForDelivery(question)),
  };
}

export async function getActiveLearningSession(userId: string, childId: string, subject: Subject): Promise<LearnSessionState | null> {
  const item = await getItem(TABLES.SESSIONS, await sessionKey(userId, childId, subject));
  if (!item) return null;
  return normalizeSessionQuestions(item as LearnSessionState);
}

export async function saveActiveLearningSession(state: Omit<LearnSessionState, "sessionId" | "createdAt" | "updatedAt"> & Partial<Pick<LearnSessionState, "sessionId" | "createdAt">>) {
  const now = new Date().toISOString();
  const mode = await getSessionTableMode();
  const key = await sessionKey(state.userId, state.childId, state.subject);
  const existing = await getItem(TABLES.SESSIONS, key);
  const sessionId = mode === "legacy"
    ? `LEARN#${state.userId}#${state.childId}#${state.subject}`
    : (state.sessionId || (existing as LearnSessionState | null)?.sessionId || uuidv4());
  const createdAt = state.createdAt || (existing as LearnSessionState | null)?.createdAt || now;
  const record: LearnSessionState = normalizeSessionQuestions({
    ...state,
    sessionId,
    createdAt,
    updatedAt: now,
  });

  await putItem(TABLES.SESSIONS, await toRecord(record));
  return record;
}

export async function clearActiveLearningSession(userId: string, childId: string, subject: Subject) {
  await deleteItem(TABLES.SESSIONS, await sessionKey(userId, childId, subject));
}
