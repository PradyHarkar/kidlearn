import Stripe from "stripe";
import type { Country, SubscriptionPlan } from "@/types";
import { COUNTRY_CONFIGS } from "./curriculum";

// Lazy singleton — avoids "no apiKey" crash during `next build` when env not set
let _stripe: Stripe | null = null;
function getStripeInstance(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    });
  }
  return _stripe;
}
// Proxy so all existing `stripe.xyz` call sites work unchanged
export const stripe = new Proxy({} as Stripe, {
  get(_t, prop) {
    return (getStripeInstance() as unknown as Record<string, unknown>)[prop as string];
  },
});

/** Returns the Stripe price ID for a given country + plan.
 *  First checks STRIPE_PRICE_AU_WEEKLY-style env vars.
 *  Falls back to querying Stripe by product metadata if env var is missing.
 */
export async function getStripePriceId(country: Country, plan: SubscriptionPlan): Promise<string> {
  const key = `STRIPE_PRICE_${country}_${plan.toUpperCase()}`;
  const id = process.env[key];
  if (id) return id;

  // Fallback: query Stripe for price matching country + plan via metadata
  const stripeClient = getStripeInstance();
  const interval = plan === "weekly" ? "week" : "year";
  const currency = COUNTRY_CONFIGS[country].currency.toLowerCase();

  const allPrices = await stripeClient.prices.list({ active: true, limit: 100, expand: ["data.product"] });
  const match = allPrices.data.find((p) => {
    const prod = p.product as Stripe.Product;
    return (
      p.currency === currency &&
      p.recurring?.interval === interval &&
      (p.metadata?.country === country || prod?.name === "KidLearn Subscription")
    );
  });

  if (match) return match.id;
  throw new Error(`No active Stripe price found for ${country} ${plan}. Run: npx tsx scripts/setup-stripe.ts`);
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

  const priceId = await getStripePriceId(country, plan);

  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
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
