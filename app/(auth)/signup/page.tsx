"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Mascot } from "@/components/mascot/Mascot";
import toast from "react-hot-toast";
import { COUNTRY_CONFIGS } from "@/lib/curriculum";
import type { Country } from "@/types";

const COUNTRIES = Object.entries(COUNTRY_CONFIGS).map(([code, cfg]) => ({
  code: code as Country,
  name: cfg.name,
  flag: cfg.flag,
  currencySymbol: cfg.currencySymbol,
  weeklyPrice: cfg.prices.weekly / 100,
  annualPrice: cfg.prices.annual / 100,
  currency: cfg.currency,
}));

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({
    parentName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords don't match!");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!selectedCountry) {
      setError("Please select your country.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          parentName: form.parentName,
          country: selectedCountry,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create account");
        setLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Account created! Please log in.");
        router.push("/login");
        return;
      }

      toast.success("Welcome to KidLearn! 🎉 Your 7-day free trial has started.");
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center p-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {["🎓", "📚", "✏️", "🔢", "🎯", "🏆", "💡", "🌟"].map((emoji, i) => (
          <motion.div
            key={i}
            className="absolute text-4xl opacity-20"
            style={{ left: `${5 + i * 12}%`, top: `${15 + (i % 4) * 20}%` }}
            animate={{ y: [0, -15, 0], rotate: [0, 8, -8, 0] }}
            transition={{ duration: 2.5 + i * 0.4, repeat: Infinity, delay: i * 0.2 }}
          >
            {emoji}
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, type: "spring", bounce: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-4xl shadow-kid p-8">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-2">
              <Mascot mood={step === 2 ? "happy" : "excited"} size="md" />
            </div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mt-2">
              {step === 1 ? "Join KidLearn!" : "Your Country"}
            </h1>
            <p className="text-gray-500 font-semibold mt-1">
              {step === 1
                ? "Start your child's learning adventure! 🚀"
                : "Select your country for curriculum-aligned content"}
            </p>
            {/* Step indicator */}
            <div className="flex justify-center gap-2 mt-3">
              {[1, 2].map((s) => (
                <div
                  key={s}
                  className={`h-2 rounded-full transition-all ${
                    step === s ? "w-8 bg-purple-500" : "w-2 bg-gray-200"
                  }`}
                />
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.form
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleStep1}
                className="space-y-4"
              >
                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-red-50 border-2 border-red-200 text-red-700 rounded-2xl p-3 text-center font-bold text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1 ml-1">👤 Your Name</label>
                  <input
                    type="text"
                    value={form.parentName}
                    onChange={(e) => setForm({ ...form, parentName: e.target.value })}
                    className="input-field"
                    placeholder="e.g., Sarah (Parent)"
                    required
                    minLength={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1 ml-1">📧 Email Address</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input-field"
                    placeholder="parent@email.com"
                    required
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1 ml-1">🔒 Password</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="input-field"
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1 ml-1">🔒 Confirm Password</label>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    className="input-field"
                    placeholder="Repeat your password"
                    required
                    autoComplete="new-password"
                  />
                </div>

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full btn-primary"
                >
                  Continue →
                </motion.button>
              </motion.form>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-red-50 border-2 border-red-200 text-red-700 rounded-2xl p-3 text-center font-bold text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {COUNTRIES.map((c) => (
                    <motion.button
                      key={c.code}
                      type="button"
                      onClick={() => setSelectedCountry(c.code)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${
                        selectedCountry === c.code
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 bg-white hover:border-purple-300"
                      }`}
                    >
                      <div className="text-3xl mb-1">{c.flag}</div>
                      <div className="font-bold text-gray-800 text-sm">{c.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {c.currencySymbol}{c.weeklyPrice.toFixed(0)}/wk
                      </div>
                    </motion.button>
                  ))}
                </div>

                <div className="text-center text-xs text-gray-500 bg-purple-50 rounded-2xl p-3">
                  🎁 <strong>7-day free trial</strong> — no credit card required to start
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setStep(1); setError(""); }}
                    className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    ← Back
                  </button>
                  <motion.button
                    onClick={handleSubmit}
                    disabled={loading || !selectedCountry}
                    whileHover={{ scale: selectedCountry ? 1.02 : 1 }}
                    whileTap={{ scale: selectedCountry ? 0.98 : 1 }}
                    className="flex-2 flex-grow btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "🌟 Start Free Trial!"
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-6 text-center">
            <p className="text-gray-500 font-semibold">
              Already have an account?{" "}
              <Link href="/login" className="text-purple-600 font-black hover:text-blue-600 transition-colors">
                Sign in! 👋
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
