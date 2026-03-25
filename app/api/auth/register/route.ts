import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { TABLES } from "@/lib/dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

function makeDb() {
  const accessKeyId = process.env.APP_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.APP_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.APP_AWS_REGION || process.env.AWS_REGION || "ap-southeast-2";
  return DynamoDBDocumentClient.from(
    new DynamoDBClient({ region, ...(accessKeyId && { credentials: { accessKeyId, secretAccessKey: secretAccessKey! } }) }),
    { marshallOptions: { removeUndefinedValues: true } }
  );
}

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  parentName: z.string().min(2, "Name must be at least 2 characters"),
  country: z.enum(["AU", "US", "IN", "UK"]),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, parentName, country } = registerSchema.parse(body);

    // Check if email already exists (inline client — same pattern as /api/health which works)
    const db = makeDb();
    const existing = await db.send(
      new QueryCommand({
        TableName: TABLES.USERS,
        IndexName: "email-index",
        KeyConditionExpression: "email = :email",
        ExpressionAttributeValues: { ":email": email.toLowerCase() },
        Limit: 1,
      })
    );

    if (existing.Items && existing.Items.length > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = uuidv4();
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await db.send(new PutCommand({ TableName: TABLES.USERS, Item: {
      userId,
      email: email.toLowerCase(),
      passwordHash,
      parentName,
      country,
      subscriptionStatus: "trial",
      trialEndsAt,
      createdAt: new Date().toISOString(),
    } }));

    return NextResponse.json({ success: true, userId, trialEndsAt }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const msg = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.error("Register error:", msg);
    return NextResponse.json({ error: "Failed to create account", debug: msg }, { status: 500 });
  }
}
