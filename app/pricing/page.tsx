"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { COUNTRY_CONFIGS } from "@/lib/curriculum";
import type { Country, SubscriptionPlan } from "@/types";
import toast from "react-hot-toast";

const COUNTRIES = Object.entries(COUNTRY_CONFIGS).map(([code, cfg]) => ({
  code: code as Country,
  name: cfg.name,
  flag: cfg.flag,
  currency: cfg.currency,
  currencySymbol: cfg.currencySymbol,
  weeklyAmount: cfg.prices.weekly,
  annualAmount: cfg.prices.annual,
}));

const FEATURES = [
  "📚 Curriculum-aligned questions (ACARA / Common Core / NCERT / UK National)",
  "🤖 AI-generated personalised questions via AWS Bedrock",
  "📈 Adaptive difficulty that grows with your child",
  "🏆 Achievements, coins & reward system",
  "📊 Weekly progress reports emailed to you",
  "👶 Up to 3 child profiles per account",
  "🔢 Maths · English · Science covered",
];

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50"><div className="text-purple-600 font-bold text-xl">Loading... ✨</div></div>}>
      <PricingContent />
    </Suspense>
  );
}

function PricingContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedCountry, setSelectedCountry] = useState<Country>("AU");
  const [loadingPlan, setLoadingPlan] = useState<SubscriptionPlan | null>(null);

  const reason = searchParams.get("reason");
  const cancelled = searchParams.get("cancelled");

  useEffect(() => {
    // Auto-detect country from session
    if (session?.user?.country) {
      setSelectedCountry(session.user.country as Country);
    }
  }, [session]);

  const countryConfig = COUNTRY_CONFIGS[selectedCountry];
  const sym = countryConfig.currencySymbol;
  const weeklyDisplay = `${sym}${(countryConfig.prices.weekly / 100).toFixed(0)}`;
  const annualDisplay = `${sym}${(countryConfig.prices.annual / 100).toFixed(0)}`;
  const weeklyPerDay = `${sym}${(countryConfig.prices.weekly / 100 / 7).toFixed(2)}`;

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!session?.user) {
      router.push("/signup");
      return;
    }

    setLoadingPlan(plan);
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err) {
      toast.error("Failed to start checkout. Please try again.");
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      {/* Nav */}
      <nav className="flex items-center justify-between p-4 max-w-5xl mx-auto">
        <Link href="/" className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
          🎓 KidLearn
        </Link>
        <div className="flex gap-3">
          {session?.user ? (
            <Link href="/dashboard" className="btn-primary text-sm py-2 px-4">
              Dashboard →
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-purple-600 font-bold py-2 px-4 hover:underline">Sign in</Link>
              <Link href="/signup" className="btn-primary text-sm py-2 px-4">Start Free Trial</Link>
            </>
          )}
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Banner messages */}
        {reason === "subscription_required" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 text-center"
          >
            <p className="font-bold text-amber-800">Your free trial has ended. Subscribe to continue learning! 🎓</p>
          </motion.div>
        )}
        {cancelled && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-gray-50 border-2 border-gray-200 rounded-2xl p-4 text-center"
          >
            <p className="text-gray-600">Checkout cancelled. You can subscribe whenever you're ready.</p>
          </motion.div>
        )}

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-4">
            Simple, Honest Pricing
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            One subscription covers all your children. Curriculum-aligned for your country.
          </p>
          <div className="mt-4 inline-block bg-green-100 text-green-800 font-bold px-4 py-2 rounded-full text-sm">
            🎁 7-day free trial — no credit card required
          </div>
        </div>

        {/* Country selector */}
        <div className="flex justify-center gap-3 mb-10 flex-wrap">
          {COUNTRIES.map((c) => (
            <button
              key={c.code}
              onClick={() => setSelectedCountry(c.code)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold border-2 transition-all ${
                selectedCountry === c.code
                  ? "border-purple-500 bg-purple-100 text-purple-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-purple-300"
              }`}
            >
              {c.flag} {c.name}
            </button>
          ))}
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto mb-16">
          {/* Weekly */}
          <motion.div
            whileHover={{ y: -4 }}
            className="bg-white rounded-3xl shadow-lg p-8 border-2 border-gray-100"
          >
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">📅</div>
              <h2 className="text-2xl font-black text-gray-800">Weekly</h2>
              <p className="text-gray-500 text-sm mt-1">Billed every 7 days</p>
              <div className="mt-4">
                <span className="text-5xl font-black text-purple-600">{weeklyDisplay}</span>
                <span className="text-gray-500 text-lg">/week</span>
              </div>
              <p className="text-sm text-gray-400 mt-1">≈ {weeklyPerDay} per day</p>
            </div>

            <ul className="space-y-3 mb-8">
              {FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-green-500 mt-0.5">✓</span>
                  {f}
                </li>
              ))}
              <li className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-green-500 mt-0.5">✓</span>
                Cancel anytime
              </li>
            </ul>

            <motion.button
              onClick={() => handleSubscribe("weekly")}
              disabled={loadingPlan === "weekly"}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loadingPlan === "weekly" ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>
              ) : session?.user ? "Subscribe Weekly" : "Start Free Trial"}
            </motion.button>
          </motion.div>

          {/* Annual */}
          <motion.div
            whileHover={{ y: -4 }}
            className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl shadow-xl p-8 text-white relative overflow-hidden"
          >
            <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 text-xs font-black px-3 py-1 rounded-full">
              BEST VALUE
            </div>
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">🏆</div>
              <h2 className="text-2xl font-black">Annual</h2>
              <p className="text-purple-200 text-sm mt-1">Billed once per year</p>
              <div className="mt-4">
                <span className="text-5xl font-black">{annualDisplay}</span>
                <span className="text-purple-200 text-lg">/year</span>
              </div>
              <div className="mt-2 bg-white/20 rounded-full px-3 py-1 inline-block text-sm font-bold">
                Save {Math.round((1 - (countryConfig.prices.annual / (countryConfig.prices.weekly * 52))) * 100)}% vs weekly
              </div>
            </div>

            <ul className="space-y-3 mb-8">
              {FEATURES.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-white/90">
                  <span className="text-yellow-300 mt-0.5">✓</span>
                  {f}
                </li>
              ))}
              <li className="flex items-start gap-2 text-sm text-white/90">
                <span className="text-yellow-300 mt-0.5">✓</span>
                One payment, full year access
              </li>
            </ul>

            <motion.button
              onClick={() => handleSubscribe("annual")}
              disabled={loadingPlan === "annual"}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-white text-purple-700 font-black py-3 rounded-2xl hover:bg-purple-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loadingPlan === "annual" ? (
                <><div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" /> Processing...</>
              ) : session?.user ? "Subscribe Annual" : "Start Free Trial"}
            </motion.button>
          </motion.div>
        </div>

        {/* FAQ-style footer */}
        <div className="text-center text-gray-500 text-sm max-w-2xl mx-auto space-y-2">
          <p>All prices shown in {countryConfig.currency}. Secure payments via Stripe.</p>
          <p>Cancel anytime from your dashboard — no questions asked.</p>
          <p>Weekly reports sent every Sunday to your registered email.</p>
        </div>
      </div>
    </div>
  );
}
