import { DescribeTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { deleteItem, getItem, putItem, TABLES, updateItem } from "@/lib/dynamodb";
import type { WritingSessionState, WritingMode, WritingStepState } from "@/types";

const ACTIVE_SESSION_TTL_SECONDS = 60 * 60 * 24 * 21;

interface WritingSessionRecord extends WritingSessionState {
  pk: string;
  sk: string;
  GSI1PK: string;
  GSI1SK: string;
  expires: number;
  status: "active" | "completed";
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
        // Fall through to legacy mode.
      }
      return "legacy";
    })();
  }
  return sessionTableModePromise;
}

async function sessionKey(userId: string, childId: string, mode: WritingMode) {
  const sessionMode = await getSessionTableMode();
  if (sessionMode === "composite") {
    return {
      pk: `WRITE#${userId}#${childId}`,
      sk: `MODE#${mode}`,
    };
  }

  return {
    sessionId: `WRITE#${userId}#${childId}#${mode}`,
  };
}

async function toRecord(state: WritingSessionState, status: "active" | "completed"): Promise<Record<string, unknown>> {
  const now = new Date().toISOString();
  const sessionMode = await getSessionTableMode();
  const base = {
    expires: Math.floor(Date.now() / 1000) + ACTIVE_SESSION_TTL_SECONDS,
    status,
    ...state,
    updatedAt: now,
  };

  if (sessionMode === "composite") {
    return {
      pk: `WRITE#${state.userId}#${state.childId}`,
      sk: `MODE#${state.writingMode}`,
      GSI1PK: `CHILD#${state.childId}`,
      GSI1SK: now,
      ...base,
    };
  }

  return base;
}

export async function getActiveWritingSession(userId: string, childId: string, mode: WritingMode): Promise<WritingSessionState | null> {
  const item = await getItem(TABLES.SESSIONS, await sessionKey(userId, childId, mode));
  if (!item || (item as WritingSessionRecord).status !== "active") return null;
  return item as WritingSessionState;
}

export async function saveActiveWritingSession(
  state: Omit<WritingSessionState, "sessionId" | "createdAt" | "updatedAt"> & Partial<Pick<WritingSessionState, "sessionId" | "createdAt">>
) {
  const now = new Date().toISOString();
  const sessionMode = await getSessionTableMode();
  const key = await sessionKey(state.userId, state.childId, state.writingMode);
  const existing = await getItem(TABLES.SESSIONS, key);
  const sessionId = sessionMode === "legacy"
    ? `WRITE#${state.userId}#${state.childId}#${state.writingMode}`
    : (state.sessionId || (existing as WritingSessionState | null)?.sessionId || uuidv4());
  const createdAt = state.createdAt || (existing as WritingSessionState | null)?.createdAt || now;
  const record: WritingSessionState = {
    ...state,
    sessionId,
    createdAt,
    updatedAt: now,
  };

  await putItem(TABLES.SESSIONS, await toRecord(record, "active"));
  return record;
}

export async function completeWritingSession(
  state: WritingSessionState,
  finalDraft: string,
  comparison: WritingSessionState["comparison"],
  pointsEarned: number
) {
  const now = new Date().toISOString();
  const completed: WritingSessionState = {
    ...state,
    isComplete: true,
    finalDraft,
    comparison,
    pointsEarned,
    updatedAt: now,
  };

  await putItem(TABLES.SESSIONS, await toRecord(completed, "completed"));
  return completed;
}

export async function clearActiveWritingSession(userId: string, childId: string, mode: WritingMode) {
  await deleteItem(TABLES.SESSIONS, await sessionKey(userId, childId, mode));
}

export async function markWritingSessionDraft(
  userId: string,
  childId: string,
  mode: WritingMode,
  steps: WritingStepState[],
  currentStepIndex: number,
  originalDraft?: string,
  finalDraft?: string,
  revisedDraft?: string,
  comparison?: WritingSessionState["comparison"],
  pointsEarned?: number
) {
  const existing = await getActiveWritingSession(userId, childId, mode);
  if (!existing) return null;
  const nextState: WritingSessionState = {
    ...existing,
    steps,
    currentStepIndex,
    originalDraft,
    finalDraft,
    revisedDraft,
    comparison,
    pointsEarned,
    updatedAt: new Date().toISOString(),
  };
  await putItem(TABLES.SESSIONS, await toRecord(nextState, "active"));
  return nextState;
}
