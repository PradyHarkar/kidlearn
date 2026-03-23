"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mascot } from "@/components/mascot/Mascot";
import toast from "react-hot-toast";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ parentName: "", email: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
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

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          parentName: form.parentName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create account");
        setLoading(false);
        return;
      }

      // Auto sign in
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

      toast.success("Welcome to KidLearn! 🎉");
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
              <Mascot mood="excited" size="md" />
            </div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mt-2">
              Join KidLearn!
            </h1>
            <p className="text-gray-500 font-semibold mt-1">Start your child's learning adventure! 🚀</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating account...
                </>
              ) : (
                "🌟 Start Learning!"
              )}
            </motion.button>
          </form>

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
