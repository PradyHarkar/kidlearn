import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { ddb, TABLES, putItem } from "@/lib/dynamodb";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";

// Diagnostic GET — scan ALL env vars to see what the Lambda receives at runtime
export async function GET() {
  return NextResponse.json({
    appKey: process.env.APP_AWS_ACCESS_KEY_ID?.slice(0, 8) || "MISSING",
    appRegion: process.env.APP_AWS_REGION || "MISSING",
    awsKey: process.env.AWS_ACCESS_KEY_ID?.slice(0, 8) || "MISSING",
    nextAuthSecret: process.env.NEXTAUTH_SECRET?.slice(0, 8) || "MISSING",
    nodeEnv: process.env.NODE_ENV || "MISSING",
    dynamoUsersTable: process.env.DYNAMODB_USERS_TABLE || "MISSING",
    awsRegion: process.env.AWS_REGION || "MISSING",
    allKeysCount: Object.keys(process.env).length,
    sampleKeys: Object.keys(process.env).slice(0, 20),
  });
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

    // Check if email already exists
    const existing = await ddb.send(
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

    await putItem(TABLES.USERS, {
      userId,
      email: email.toLowerCase(),
      passwordHash,
      parentName,
      country,
      subscriptionStatus: "trial",
      trialEndsAt,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, userId, trialEndsAt }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const msg = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    const envDebug = {
      appKey: process.env.APP_AWS_ACCESS_KEY_ID?.slice(0, 8) || "MISSING",
      appRegion: process.env.APP_AWS_REGION || "MISSING",
      awsKey: process.env.AWS_ACCESS_KEY_ID?.slice(0, 8) || "MISSING",
    };
    console.error("Register error:", msg, "env:", JSON.stringify(envDebug));
    return NextResponse.json({ error: "Failed to create account", debug: msg, env: envDebug }, { status: 500 });
  }
}
