"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mascot } from "@/components/mascot/Mascot";

const FEATURES = [
  { emoji: "🧮", title: "Fun Maths", desc: "Counting, addition, shapes & more!", color: "from-pink-400 to-rose-500" },
  { emoji: "📖", title: "English Magic", desc: "Phonics, spelling & reading adventures!", color: "from-blue-400 to-cyan-500" },
  { emoji: "🎯", title: "Smart Learning", desc: "Questions get harder as you improve!", color: "from-purple-400 to-violet-500" },
  { emoji: "🏆", title: "Win Rewards", desc: "Earn stars, coins & cool badges!", color: "from-yellow-400 to-orange-500" },
];

const AVATARS = ["🐼", "🦁", "🐸", "🦊", "🐧", "🦄", "🐻", "🐯"];

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 min-h-screen flex flex-col">
        {/* Floating emojis background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {["⭐", "🌟", "🎈", "🎀", "🌈", "🦋", "🌸", "🎊", "✨", "💫"].map((emoji, i) => (
            <motion.div
              key={i}
              className="absolute text-3xl sm:text-5xl opacity-20"
              style={{ left: `${5 + i * 10}%`, top: `${10 + (i % 5) * 15}%` }}
              animate={{ y: [0, -20, 0], rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.3 }}
            >
              {emoji}
            </motion.div>
          ))}
        </div>

        {/* Nav */}
        <nav className="relative z-10 flex justify-between items-center px-6 py-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <span className="text-3xl font-black text-white">🌟 KidLearn</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex gap-3"
          >
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white/20 backdrop-blur text-white font-bold py-2 px-5 rounded-2xl border-2 border-white/30 hover:bg-white/30 transition-all"
              >
                Login
              </motion.button>
            </Link>
            <Link href="/signup">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-purple-600 font-black py-2 px-5 rounded-2xl shadow-lg hover:bg-yellow-50 transition-all"
              >
                Sign Up Free!
              </motion.button>
            </Link>
          </motion.div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center px-6 py-12 gap-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center lg:text-left max-w-xl"
          >
            <h1 className="text-5xl sm:text-7xl font-black text-white leading-tight">
              Learning is
              <span className="block text-yellow-300 drop-shadow-lg">SUPER FUN! 🚀</span>
            </h1>
            <p className="text-xl text-white/90 mt-4 font-semibold">
              Adaptive Maths & English for Prep and Year 3 students.
              Questions that grow with your child! 🌱
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mt-8 justify-center lg:justify-start">
              <Link href="/signup">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-yellow-400 text-gray-800 font-black text-xl py-4 px-8 rounded-3xl shadow-kid-hover hover:bg-yellow-300 transition-all w-full sm:w-auto"
                >
                  🎉 Start for FREE!
                </motion.button>
              </Link>
              <Link href="/login">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white/20 backdrop-blur text-white font-bold text-xl py-4 px-8 rounded-3xl border-2 border-white/40 hover:bg-white/30 transition-all w-full sm:w-auto"
                >
                  Parent Login 👋
                </motion.button>
              </Link>
            </div>

            <div className="flex items-center gap-6 mt-8 justify-center lg:justify-start">
              <div className="text-center">
                <p className="text-3xl font-black text-yellow-300">500+</p>
                <p className="text-white/80 text-sm font-semibold">Questions</p>
              </div>
              <div className="text-white/40 text-2xl">|</div>
              <div className="text-center">
                <p className="text-3xl font-black text-yellow-300">10</p>
                <p className="text-white/80 text-sm font-semibold">Difficulty Levels</p>
              </div>
              <div className="text-white/40 text-2xl">|</div>
              <div className="text-center">
                <p className="text-3xl font-black text-yellow-300">2</p>
                <p className="text-white/80 text-sm font-semibold">Year Levels</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: "spring", bounce: 0.4 }}
            className="relative"
          >
            <div className="bg-white/20 backdrop-blur rounded-4xl p-8 text-center">
              <Mascot mood="excited" size="lg" />
              <div className="mt-4 flex gap-3 justify-center flex-wrap">
                {AVATARS.map((avatar, i) => (
                  <motion.span
                    key={i}
                    className="text-3xl cursor-pointer"
                    whileHover={{ scale: 1.3, rotate: 10 }}
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                  >
                    {avatar}
                  </motion.span>
                ))}
              </div>
              <p className="text-white font-bold mt-3">Choose your avatar! 🎨</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-gradient-to-b from-purple-50 to-blue-50 py-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-black text-gray-800">Why Kids Love KidLearn! 💕</h2>
          <p className="text-gray-600 font-semibold mt-2 text-lg">Fun-powered learning that actually works!</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className={`bg-gradient-to-br ${feature.color} rounded-3xl p-6 text-white shadow-kid text-center cursor-pointer`}
            >
              <div className="text-5xl mb-3">{feature.emoji}</div>
              <h3 className="text-xl font-black">{feature.title}</h3>
              <p className="text-white/90 text-sm font-semibold mt-1">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-700 py-16 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl font-black text-white mb-4">Ready to Start Learning? 🎓</h2>
          <p className="text-white/80 text-lg font-semibold mb-8">
            Join thousands of families making learning awesome!
          </p>
          <Link href="/signup">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-yellow-400 text-gray-800 font-black text-2xl py-5 px-12 rounded-3xl shadow-kid-hover hover:bg-yellow-300 transition-all"
            >
              🌟 Get Started FREE!
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
