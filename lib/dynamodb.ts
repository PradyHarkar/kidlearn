import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import type { Subscription, SubscriptionStatus } from "@/types";

// APP_AWS_* credentials override Lambda execution role credentials (which lack DynamoDB access)
const accessKeyId = process.env.APP_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.APP_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.APP_AWS_REGION || process.env.AWS_REGION || "ap-southeast-2";

const client = new DynamoDBClient({
  region,
  ...(accessKeyId && {
    credentials: {
      accessKeyId,
      secretAccessKey: secretAccessKey!,
    },
  }),
});

export const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

export const TABLES = {
  USERS: process.env.DYNAMODB_USERS_TABLE || "kidlearn-users",
  CHILDREN: process.env.DYNAMODB_CHILDREN_TABLE || "kidlearn-children",
  QUESTIONS: process.env.DYNAMODB_QUESTIONS_TABLE || "kidlearn-questions",
  PROGRESS: process.env.DYNAMODB_PROGRESS_TABLE || "kidlearn-progress",
  ACHIEVEMENTS: process.env.DYNAMODB_ACHIEVEMENTS_TABLE || "kidlearn-achievements",
  SESSIONS: process.env.DYNAMODB_SESSIONS_TABLE || "kidlearn-sessions",
  SUBSCRIPTIONS: process.env.DYNAMODB_SUBSCRIPTIONS_TABLE || "kidlearn-subscriptions",
};

export async function putItem(table: string, item: Record<string, unknown> | object) {
  return ddb.send(new PutCommand({ TableName: table, Item: item }));
}

export async function getItem(table: string, key: Record<string, unknown>) {
  const result = await ddb.send(new GetCommand({ TableName: table, Key: key }));
  return result.Item;
}

export async function queryItems(
  table: string,
  keyCondition: string,
  expressionValues: Record<string, unknown>,
  expressionNames?: Record<string, string>,
  indexName?: string,
  filterExpression?: string,
  limit?: number
) {
  const result = await ddb.send(
    new QueryCommand({
      TableName: table,
      IndexName: indexName,
      KeyConditionExpression: keyCondition,
      ExpressionAttributeValues: expressionValues,
      ExpressionAttributeNames: expressionNames,
      FilterExpression: filterExpression,
      Limit: limit,
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
  return ddb.send(
    new UpdateCommand({
      TableName: table,
      Key: key,
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionValues,
      ExpressionAttributeNames: expressionNames,
      ReturnValues: "ALL_NEW",
    })
  );
}

export async function deleteItem(table: string, key: Record<string, unknown>) {
  return ddb.send(new DeleteCommand({ TableName: table, Key: key }));
}

export async function scanItems(table: string, filterExpression?: string, expressionValues?: Record<string, unknown>, expressionNames?: Record<string, string>) {
  const result = await ddb.send(
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
