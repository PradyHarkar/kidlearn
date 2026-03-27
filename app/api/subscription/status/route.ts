import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getActiveSubscription } from "@/lib/dynamodb";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;
    const subscription = await getActiveSubscription(userId);

    // Prefer the live DynamoDB subscription status over the stale JWT value.
    // JWT is only refreshed on login, so a user who subscribes without logging
    // out will still have subscriptionStatus="trial" in their token.
    const subscriptionStatus: string =
      subscription?.status ?? session.user.subscriptionStatus ?? "trial";

    // trialEndsAt: also try the user record from DynamoDB so we don't rely on
    // the JWT being fresh.  Fall back to the JWT value if the user record lacks it.
    const { getItem, TABLES } = await import("@/lib/dynamodb");
    const userRecord = await getItem(TABLES.USERS, { userId });
    const trialEndsAtStr: string | null =
      (userRecord?.trialEndsAt as string | undefined) ??
      session.user.trialEndsAt ??
      null;

    const trialEndsAt = trialEndsAtStr ? new Date(trialEndsAtStr) : null;
    const now = new Date();
    const trialDaysRemaining = trialEndsAt
      ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    return NextResponse.json({
      subscription,
      subscriptionStatus,
      trialDaysRemaining,
      trialEndsAt: trialEndsAtStr,
    });
  } catch (error) {
    console.error("Subscription status error:", error);
    return NextResponse.json({ error: "Failed to get subscription status" }, { status: 500 });
  }
}
