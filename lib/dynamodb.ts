import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-southeast-2",
  // Use explicit credentials locally; rely on IAM role in production (Amplify)
  ...(process.env.AWS_ACCESS_KEY_ID && {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
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

export async function scanItems(table: string, filterExpression?: string, expressionValues?: Record<string, unknown>) {
  const result = await ddb.send(
    new ScanCommand({
      TableName: table,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionValues,
    })
  );
  return result.Items || [];
}
