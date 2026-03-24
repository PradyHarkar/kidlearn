import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent } from "@/lib/stripe";
import {
  TABLES,
  putSubscription,
  updateSubscriptionStatus,
  getSubscriptionByStripeId,
  updateItem,
} from "@/lib/dynamodb";
import type { Subscription, Country, SubscriptionPlan, Currency, SubscriptionStatus } from "@/types";
import { COUNTRY_CONFIGS } from "@/lib/curriculum";
import Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(body, signature);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const userId = session.metadata?.userId;
        const country = (session.metadata?.country as Country) ?? "AU";
        const plan = (session.metadata?.plan as SubscriptionPlan) ?? "weekly";
        const stripeSubscriptionId = session.subscription as string;
        const stripeCustomerId = session.customer as string;

        if (!userId) break;

        const currency = COUNTRY_CONFIGS[country].currency;
        const amount = COUNTRY_CONFIGS[country].prices[plan];

        // Fetch the subscription from Stripe to get the current period end
        const { stripe } = await import("@/lib/stripe");
const stripeSub = (await stripe.subscriptions.retrieve(stripeSubscriptionId)) as any;

        const subscription: Subscription = {
          userId,
          subscriptionId: stripeSubscriptionId,
          plan,
          status: "active",
          currency: currency as Currency,
          amount,
          stripeSubscriptionId,
          stripeCustomerId,
          currentPeriodEnd: new Date((stripeSub.current_period_end as number) * 1000).toISOString(),
          cancelAtPeriodEnd: stripeSub.cancel_at_period_end as boolean,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await putSubscription(subscription);

        // Update user record
        await updateItem(
          TABLES.USERS,
          { userId },
          "SET subscriptionStatus = :s, stripeCustomerId = :cid",
          { ":s": "active", ":cid": stripeCustomerId }
        );
        break;
      }

      case "customer.subscription.updated": {
const stripeSub = event.data.object as any;
        const existing = await getSubscriptionByStripeId(stripeSub.id);
        if (!existing) break;

        const status: SubscriptionStatus = stripeSub.status === "active" ? "active"
          : stripeSub.status === "past_due" ? "past_due"
          : stripeSub.status === "canceled" ? "cancelled"
          : "active";

        await updateSubscriptionStatus(existing.userId, existing.subscriptionId, status, {
          currentPeriodEnd: new Date(stripeSub.current_period_end * 1000).toISOString(),
          cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        });

        await updateItem(
          TABLES.USERS,
          { userId: existing.userId },
          "SET subscriptionStatus = :s",
          { ":s": status }
        );
        break;
      }

      case "customer.subscription.deleted": {
const stripeSub = event.data.object as any;
        const existing = await getSubscriptionByStripeId(stripeSub.id);
        if (!existing) break;

        await updateSubscriptionStatus(existing.userId, existing.subscriptionId, "cancelled");
        await updateItem(
          TABLES.USERS,
          { userId: existing.userId },
          "SET subscriptionStatus = :s",
          { ":s": "cancelled" }
        );
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeSubscriptionId = (invoice as Stripe.Invoice & { subscription?: string }).subscription;
        if (!stripeSubscriptionId) break;

        const existing = await getSubscriptionByStripeId(stripeSubscriptionId);
        if (!existing) break;

        const { stripe } = await import("@/lib/stripe");
const stripeSub = (await stripe.subscriptions.retrieve(stripeSubscriptionId)) as any;

        await updateSubscriptionStatus(existing.userId, existing.subscriptionId, "active", {
          currentPeriodEnd: new Date((stripeSub.current_period_end as number) * 1000).toISOString(),
        });
        await updateItem(
          TABLES.USERS,
          { userId: existing.userId },
          "SET subscriptionStatus = :s",
          { ":s": "active" }
        );
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeSubscriptionId = (invoice as Stripe.Invoice & { subscription?: string }).subscription;
        if (!stripeSubscriptionId) break;

        const existing = await getSubscriptionByStripeId(stripeSubscriptionId);
        if (!existing) break;

        await updateSubscriptionStatus(existing.userId, existing.subscriptionId, "past_due");
        await updateItem(
          TABLES.USERS,
          { userId: existing.userId },
          "SET subscriptionStatus = :s",
          { ":s": "past_due" }
        );
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    // Return 200 so Stripe doesn't retry — the error is logged
  }

  return NextResponse.json({ received: true });
}
