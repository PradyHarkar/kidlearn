import { NextResponse } from "next/server";
import { ddb, TABLES } from "@/lib/dynamodb";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";

export async function GET() {
  const checks: Record<string, string> = {};

  try {
    await ddb.send(new ScanCommand({ TableName: TABLES.USERS, Limit: 1 }));
    checks.dynamodb = "healthy";
  } catch {
    checks.dynamodb = "unhealthy";
  }

  const allHealthy = Object.values(checks).every((v) => v === "healthy");

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      checks,
    },
    { status: allHealthy ? 200 : 503 }
  );
}
