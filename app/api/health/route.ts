import { NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

export async function GET() {
  const env = {
    APP_AWS_KEY: process.env.APP_AWS_ACCESS_KEY_ID?.slice(0, 8) || "NOT_SET",
    APP_AWS_REGION: process.env.APP_AWS_REGION || "NOT_SET",
    AWS_KEY: process.env.AWS_ACCESS_KEY_ID?.slice(0, 8) || "NOT_SET",
    AWS_REGION: process.env.AWS_REGION || "NOT_SET",
  };

  let dynamodbStatus = "pending";
  let dynamodbError = "";

  try {
    const accessKeyId = process.env.APP_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.APP_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.APP_AWS_REGION || process.env.AWS_REGION || "ap-southeast-2";

    const client = new DynamoDBClient({
      region,
      ...(accessKeyId && { credentials: { accessKeyId, secretAccessKey: secretAccessKey! } }),
    });

    const docClient = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });
    const result = await docClient.send(new QueryCommand({
      TableName: process.env.DYNAMODB_USERS_TABLE || "kidlearn-users",
      IndexName: "email-index",
      KeyConditionExpression: "email = :e",
      ExpressionAttributeValues: { ":e": "healthcheck@example.com" },
      Limit: 1,
    }));
    dynamodbStatus = `OK: query returned ${result.Count} items`;
  } catch (e: unknown) {
    dynamodbStatus = "FAILED";
    dynamodbError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json({
    status: dynamodbStatus.startsWith("OK") ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    env,
    dynamodb: dynamodbStatus,
    dynamodbError,
  });
}
