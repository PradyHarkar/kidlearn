import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getItem, updateItem, TABLES } from "@/lib/dynamodb";
import { createCheckoutSession } from "@/lib/stripe";
import { getSession } from "@/lib/auth";
import type { Country, SubscriptionPlan } from "@/types";

const checkoutSchema = z.object({
  plan: z.enum(["weekly", "annual"]),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;
    const body = await req.json();
    const { plan } = checkoutSchema.parse(body) as { plan: SubscriptionPlan };

    const user = await getItem(TABLES.USERS, { userId });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const country = (user.country as Country) ?? "AU";
    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    const checkoutSession = await createCheckoutSession({
      userId,
      email: user.email as string,
      parentName: user.parentName as string,
      country,
      plan,
      existingStripeCustomerId: user.stripeCustomerId as string | undefined,
      successUrl: `${appUrl}/dashboard?checkout=success`,
      cancelUrl: `${appUrl}/pricing?cancelled=1`,
    });

    // Persist stripeCustomerId back to user if newly created
    if (!user.stripeCustomerId && checkoutSession.customer) {
      await updateItem(
        TABLES.USERS,
        { userId },
        "SET stripeCustomerId = :cid",
        { ":cid": checkoutSession.customer }
      );
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
