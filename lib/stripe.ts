import Stripe from "stripe";
import type { Country, SubscriptionPlan } from "@/types";
import { COUNTRY_CONFIGS } from "./curriculum";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
  typescript: true,
});

/** Returns the Stripe price ID for a given country + plan.
 *  Env var naming convention: STRIPE_PRICE_AU_WEEKLY, STRIPE_PRICE_US_ANNUAL, etc.
 */
export function getStripePriceId(country: Country, plan: SubscriptionPlan): string {
  const key = `STRIPE_PRICE_${country}_${plan.toUpperCase()}`;
  const id = process.env[key];
  if (!id) throw new Error(`Missing env var ${key} — run scripts/setup-stripe.ts to create Stripe prices`);
  return id;
}

/** Retrieve an existing Stripe customer by ID, or create one. Returns the customer ID. */
export async function createOrRetrieveStripeCustomer(
  userId: string,
  email: string,
  name: string,
  existingStripeCustomerId?: string
): Promise<string> {
  if (existingStripeCustomerId) {
    return existingStripeCustomerId;
  }
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { userId },
  });
  return customer.id;
}

export async function createCheckoutSession(params: {
  userId: string;
  email: string;
  parentName: string;
  country: Country;
  plan: SubscriptionPlan;
  existingStripeCustomerId?: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  const { userId, email, parentName, country, plan, existingStripeCustomerId, successUrl, cancelUrl } = params;

  const customerId = await createOrRetrieveStripeCustomer(
    userId, email, parentName, existingStripeCustomerId
  );

  const priceId = getStripePriceId(country, plan);
  const currency = COUNTRY_CONFIGS[country].currency.toLowerCase();

  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    currency,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId, country, plan },
    subscription_data: {
      metadata: { userId, country, plan },
    },
  });
}

export async function createBillingPortalSession(
  stripeCustomerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });
}

export function constructWebhookEvent(body: string, signature: string): Stripe.Event {
  return stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}
