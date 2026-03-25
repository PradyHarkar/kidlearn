import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getActiveSubscription } from "@/lib/dynamodb";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;
    const subscription = await getActiveSubscription(userId);

    const trialEndsAt = session.user.trialEndsAt ? new Date(session.user.trialEndsAt) : null;
    const now = new Date();
    const trialDaysRemaining = trialEndsAt
      ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    return NextResponse.json({
      subscription,
      subscriptionStatus: session.user.subscriptionStatus ?? "trial",
      trialDaysRemaining,
      trialEndsAt: session.user.trialEndsAt ?? null,
    });
  } catch (error) {
    console.error("Subscription status error:", error);
    return NextResponse.json({ error: "Failed to get subscription status" }, { status: 500 });
  }
}
