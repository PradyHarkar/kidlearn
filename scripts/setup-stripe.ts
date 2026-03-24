/**
 * KidLearn Stripe Product & Price Setup
 * Run once after setting STRIPE_SECRET_KEY in your environment.
 * Usage: STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/setup-stripe.ts
 *
 * Outputs the 8 price IDs you need to add as GitHub Secrets.
 */

import Stripe from "stripe";
import { COUNTRY_CONFIGS } from "../lib/curriculum";
import type { Country } from "../types";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
  typescript: true,
});

async function main() {
  console.log("Creating KidLearn Stripe product and prices...\n");

  // Create (or find existing) product
  let product: Stripe.Product;
  const existingProducts = await stripe.products.search({ query: 'name:"KidLearn Subscription"' });
  if (existingProducts.data.length > 0) {
    product = existingProducts.data[0];
    console.log(`Using existing product: ${product.id}`);
  } else {
    product = await stripe.products.create({
      name: "KidLearn Subscription",
      description: "Access to KidLearn adaptive learning platform for children",
      metadata: { app: "kidlearn" },
    });
    console.log(`Created product: ${product.id}`);
  }

  console.log("\nCreating prices...\n");

  const countries = Object.keys(COUNTRY_CONFIGS) as Country[];
  const results: Record<string, string> = {};

  for (const country of countries) {
    const cfg = COUNTRY_CONFIGS[country];
    const currency = cfg.currency.toLowerCase();

    for (const plan of ["weekly", "annual"] as const) {
      const envKey = `STRIPE_PRICE_${country}_${plan.toUpperCase()}`;
      const amount = cfg.prices[plan];
      const interval = plan === "weekly" ? "week" : "year";
      const nickname = `${cfg.name} ${plan.charAt(0).toUpperCase() + plan.slice(1)}`;

      // Check if price already exists
      const existing = await stripe.prices.list({
        product: product.id,
        currency,
        active: true,
        limit: 100,
      });

      const match = existing.data.find(
        (p) =>
          p.unit_amount === amount &&
          p.recurring?.interval === interval &&
          p.nickname === nickname
      );

      let price: Stripe.Price;
      if (match) {
        price = match;
        console.log(`  [skip] ${nickname}: ${price.id}`);
      } else {
        price = await stripe.prices.create({
          product: product.id,
          currency,
          unit_amount: amount,
          recurring: { interval },
          nickname,
          metadata: { country, plan },
        });
        console.log(`  [created] ${nickname}: ${price.id}`);
      }

      results[envKey] = price.id;
    }
  }

  console.log("\n================================================================");
  console.log("  GitHub Secrets to add (STRIPE_PRICE_* values):");
  console.log("================================================================\n");
  for (const [key, value] of Object.entries(results)) {
    console.log(`  ${key}=${value}`);
  }

  console.log("\n================================================================");
  console.log("  Stripe Webhook Setup");
  console.log("================================================================");
  console.log("\n  1. Go to https://dashboard.stripe.com/webhooks");
  console.log("  2. Add endpoint: https://<your-domain>/api/subscription/webhook");
  console.log("  3. Select these events:");
  console.log("     - checkout.session.completed");
  console.log("     - customer.subscription.updated");
  console.log("     - customer.subscription.deleted");
  console.log("     - invoice.paid");
  console.log("     - invoice.payment_failed");
  console.log("  4. Copy the signing secret → STRIPE_WEBHOOK_SECRET GitHub Secret\n");
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
