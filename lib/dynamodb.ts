import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import type { Subscription, SubscriptionStatus } from "@/types";

// Create a fresh DynamoDB client on every call.
// Amplify WEB_COMPUTE: env vars set in Amplify Console are NOT available at Lambda runtime
// (only during the build phase). The Lambda execution role IS available via the default
// credential chain (provided by AWS_AMPLIFY_CREDENTIAL_LISTENER_* at runtime).
// Use the default credential chain — no explicit key injection needed.
export function createDdb(): DynamoDBDocumentClient {
  const region = "ap-southeast-2";
  const client = new DynamoDBClient({ region });
  return DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });
}

// Keep `ddb` as a backward-compatible alias (used in many routes via ddb.send).
// Each call creates a fresh client so there is no stale credential problem.
// Cast as DynamoDBDocumentClient["send"] to preserve all generic overloads at call sites.
export const ddb = {
  send: ((command: Parameters<DynamoDBDocumentClient["send"]>[0]) =>
    createDdb().send(command)) as DynamoDBDocumentClient["send"],
};

export const TABLES = {
  USERS: process.env.DYNAMODB_USERS_TABLE || "kidlearn-users",
  CHILDREN: process.env.DYNAMODB_CHILDREN_TABLE || "kidlearn-children",
  QUESTIONS: process.env.DYNAMODB_QUESTIONS_TABLE || "kidlearn-questions",
  PROGRESS: process.env.DYNAMODB_PROGRESS_TABLE || "kidlearn-progress",
  ACHIEVEMENTS: process.env.DYNAMODB_ACHIEVEMENTS_TABLE || "kidlearn-achievements",
  SESSIONS: process.env.DYNAMODB_SESSIONS_TABLE || "kidlearn-sessions",
  SUBSCRIPTIONS: process.env.DYNAMODB_SUBSCRIPTIONS_TABLE || "kidlearn-subscriptions",
  REWARD_TRANSACTIONS: process.env.DYNAMODB_REWARD_TRANSACTIONS_TABLE || "kidlearn-reward-transactions",
  REDEMPTIONS: process.env.DYNAMODB_REDEMPTIONS_TABLE || "kidlearn-redemptions",
  QUESTION_ISSUES: process.env.DYNAMODB_QUESTION_ISSUES_TABLE || "kidlearn-question-issues",
};

export async function putItem(table: string, item: Record<string, unknown> | object) {
  return createDdb().send(new PutCommand({ TableName: table, Item: item }));
}

export async function getItem(table: string, key: Record<string, unknown>) {
  const result = await createDdb().send(new GetCommand({ TableName: table, Key: key }));
  return result.Item;
}

export async function queryItems(
  table: string,
  keyCondition: string,
  expressionValues: Record<string, unknown>,
  expressionNames?: Record<string, string>,
  indexName?: string,
  filterExpression?: string,
  limit?: number,
  scanIndexForward?: boolean
) {
  const result = await createDdb().send(
    new QueryCommand({
      TableName: table,
      IndexName: indexName,
      KeyConditionExpression: keyCondition,
      ExpressionAttributeValues: expressionValues,
      ExpressionAttributeNames: expressionNames,
      FilterExpression: filterExpression,
      Limit: limit,
      ScanIndexForward: scanIndexForward,
    })
  );
  return result.Items || [];
}

export async function updateItem(
  table: string,
  key: Record<string, unknown>,
  updateExpression: string,
  expressionValues: Record<string, unknown>,
  expressionNames?: Record<string, string>
) {
  const input: ConstructorParameters<typeof UpdateCommand>[0] = {
    TableName: table,
    Key: key,
    UpdateExpression: updateExpression,
    ReturnValues: "ALL_NEW",
  };

  if (Object.keys(expressionValues).length > 0) {
    input.ExpressionAttributeValues = expressionValues;
  }

  if (expressionNames && Object.keys(expressionNames).length > 0) {
    input.ExpressionAttributeNames = expressionNames;
  }

  return createDdb().send(new UpdateCommand(input));
}

export async function deleteItem(table: string, key: Record<string, unknown>) {
  return createDdb().send(new DeleteCommand({ TableName: table, Key: key }));
}

export async function scanItems(table: string, filterExpression?: string, expressionValues?: Record<string, unknown>, expressionNames?: Record<string, string>) {
  const result = await createDdb().send(
    new ScanCommand({
      TableName: table,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionValues,
      ExpressionAttributeNames: expressionNames,
    })
  );
  return result.Items || [];
}

// ---------------------------------------------------------------------------
// Subscription helpers
// ---------------------------------------------------------------------------

export async function putSubscription(sub: Subscription): Promise<void> {
  await putItem(TABLES.SUBSCRIPTIONS, sub);
}

export async function getActiveSubscription(userId: string): Promise<Subscription | null> {
  const items = await queryItems(
    TABLES.SUBSCRIPTIONS,
    "userId = :uid",
    { ":uid": userId, ":active": "active", ":trial": "trial" },
    { "#s": "status" },
    undefined,
    "#s IN (:active, :trial)"
  );
  if (!items.length) return null;
  // Return the most recently created one
  return items.sort((a, b) =>
    new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()
  )[0] as Subscription;
}

export async function getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | null> {
  const items = await queryItems(
    TABLES.SUBSCRIPTIONS,
    "stripeSubscriptionId = :sid",
    { ":sid": stripeSubscriptionId },
    undefined,
    "stripeSubscriptionId-index"
  );
  return (items[0] as Subscription) ?? null;
}

export async function updateSubscriptionStatus(
  userId: string,
  subscriptionId: string,
  status: SubscriptionStatus,
  extra?: Partial<Subscription>
): Promise<void> {
  const sets = ["#s = :status", "updatedAt = :ts"];
  const values: Record<string, unknown> = {
    ":status": status,
    ":ts": new Date().toISOString(),
  };
  const names: Record<string, string> = { "#s": "status" };

  if (extra?.currentPeriodEnd) {
    sets.push("currentPeriodEnd = :cpe");
    values[":cpe"] = extra.currentPeriodEnd;
  }
  if (extra?.cancelAtPeriodEnd !== undefined) {
    sets.push("cancelAtPeriodEnd = :cape");
    values[":cape"] = extra.cancelAtPeriodEnd;
  }

  await updateItem(
    TABLES.SUBSCRIPTIONS,
    { userId, subscriptionId },
    `SET ${sets.join(", ")}`,
    values,
    names
  );
}
