import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { ddb, TABLES, putItem } from "@/lib/dynamodb";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";

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
    console.error("Register error:", msg);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
