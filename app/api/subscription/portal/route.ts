import { NextResponse } from "next/server";
import { getItem, TABLES } from "@/lib/dynamodb";
import { createBillingPortalSession } from "@/lib/stripe";
import { getSession } from "@/lib/auth";

export async function POST() {
  try {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;
    const user = await getItem(TABLES.USERS, { userId });

    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No subscription found. Please subscribe first." },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const portalSession = await createBillingPortalSession(
      user.stripeCustomerId as string,
      `${appUrl}/dashboard`
    );

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("Portal error:", error);
    const message = error instanceof Error ? error.message : "Failed to open billing portal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
