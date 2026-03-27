"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mascot } from "@/components/mascot/Mascot";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password. Please try again!");
        setLoading(false);
        return;
      }

      toast.success("Welcome back! 🎉");
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {["⭐", "🌟", "✨", "🎈", "🎀", "🌈", "🦋", "🌸"].map((emoji, i) => (
          <motion.div
            key={i}
            className="absolute text-4xl opacity-20"
            style={{
              left: `${10 + i * 12}%`,
              top: `${10 + (i % 4) * 20}%`,
            }}
            animate={{ y: [0, -20, 0], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.3 }}
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
        <div className="bg-white rounded-4xl shadow-kid p-8 relative">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-2">
              <Mascot mood="happy" size="md" />
            </div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mt-2">
              KidLearn
            </h1>
            <p className="text-gray-500 font-semibold mt-1">Welcome back, Super Parent! 🎉</p>
          </div>

          {/* Form */}
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
              <label className="block text-sm font-bold text-gray-600 mb-1 ml-1">
                📧 Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="parent@email.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1 ml-1">
                🔒 Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Your password"
                required
                autoComplete="current-password"
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
                  Logging in...
                </>
              ) : (
                "🚀 Let's Learn!"
              )}
            </motion.button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-gray-500 font-semibold">
              New here?{" "}
              <Link
                href="/signup"
                className="text-purple-600 font-black hover:text-blue-600 transition-colors"
              >
                Create an account! 🌟
              </Link>
            </p>
            <p className="text-gray-500 font-semibold">
              Are you a kid?{" "}
              <Link
                href="/kids"
                className="text-yellow-600 font-black hover:text-yellow-700 transition-colors"
              >
                🧒 Kid Login
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
