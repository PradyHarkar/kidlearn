"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mascot } from "@/components/mascot/Mascot";
import { SessionResult, Achievement } from "@/types";
import confetti from "canvas-confetti";

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [result, setResult] = useState<SessionResult | null>(null);
  const [showAchievements, setShowAchievements] = useState(false);
  const [starsVisible, setStarsVisible] = useState(0);

  useEffect(() => {
    const data = searchParams.get("data");
    if (!data) { router.push("/dashboard"); return; }
    try {
      const parsed = JSON.parse(decodeURIComponent(data));
      setResult(parsed);

      // Staggered confetti
      setTimeout(() => {
        if (parsed.accuracy >= 70) {
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors: ["#FFD700", "#FF6B6B", "#4ECDC4", "#a855f7"] });
        }
        if (parsed.accuracy >= 90) {
          setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0 } }), 300);
          setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1 } }), 600);
        }
        // Animate stars
        const stars = parsed.starsEarned;
        for (let i = 1; i <= stars; i++) {
          setTimeout(() => setStarsVisible(i), i * 400);
        }
        // Show achievements after delay
        if (parsed.newAchievements?.length > 0) {
          setTimeout(() => setShowAchievements(true), 2500);
        }
      }, 400);
    } catch {
      router.push("/dashboard");
    }
  }, [searchParams, router]);

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
        <div className="spinner" />
      </div>
    );
  }

  const accuracy = Math.round(result.accuracy);

  const getMascotMood = () => {
    if (accuracy >= 90) return "celebrating" as const;
    if (accuracy >= 70) return "excited" as const;
    if (accuracy >= 50) return "happy" as const;
    return "sad" as const;
  };

  const getPerformanceData = () => {
    if (accuracy === 100) return { msg: "PERFECT SCORE! 🎊", bg: "from-yellow-400 via-orange-400 to-pink-400", emoji: "🏆" };
    if (accuracy >= 90) return { msg: "Outstanding! 🌟", bg: "from-yellow-400 to-orange-400", emoji: "⭐" };
    if (accuracy >= 80) return { msg: "Excellent! 🎉", bg: "from-green-400 to-emerald-500", emoji: "🎉" };
    if (accuracy >= 70) return { msg: "Great Job! 👍", bg: "from-blue-400 to-cyan-500", emoji: "💪" };
    if (accuracy >= 60) return { msg: "Good Effort! 🌈", bg: "from-purple-400 to-blue-500", emoji: "🌈" };
    return { msg: "Keep Practising! 💫", bg: "from-indigo-400 to-purple-500", emoji: "💫" };
  };

  const perf = getPerformanceData();
  const stars = result.starsEarned;

  const formatTime = (s: number) => s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${perf.bg} p-4 flex flex-col items-center`}>
      {/* Mascot */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", bounce: 0.5 }}
        className="mt-4 mb-2"
      >
        <Mascot mood={getMascotMood()} size="lg" />
      </motion.div>

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.2, type: "spring", bounce: 0.3 }}
        className="w-full max-w-md bg-white rounded-4xl shadow-kid overflow-hidden mb-6"
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${perf.bg} p-6 text-center relative overflow-hidden`}>
          <div className="text-6xl mb-2">{perf.emoji}</div>
          <h1 className="text-3xl font-black text-white drop-shadow">{perf.msg}</h1>
          <p className="text-white/80 font-semibold mt-1">
            {result.subject === "maths" ? "🔢 Maths" : result.subject === "science" ? "🔬 Science" : "📖 English"} •{" "}
            {result.yearLevel === "prep" ? "Prep" : "Year 3"}
          </p>
          {/* Decorative bg emojis */}
          <div className="absolute -top-2 -right-2 text-6xl opacity-10 rotate-12">⭐</div>
          <div className="absolute -bottom-2 -left-2 text-6xl opacity-10 -rotate-12">🌟</div>
        </div>

        <div className="p-6">
          {/* Stars */}
          <div className="flex justify-center gap-4 mb-6">
            {[1, 2, 3].map(i => (
              <motion.div
                key={i}
                initial={{ scale: 0, rotate: -30, opacity: 0 }}
                animate={i <= starsVisible ? { scale: 1, rotate: 0, opacity: 1 } : {}}
                transition={{ type: "spring", bounce: 0.6 }}
                className="relative"
              >
                <span className={`text-6xl leading-none block ${i <= stars ? "animate-star-shine" : "grayscale opacity-25"}`}>
                  ⭐
                </span>
              </motion.div>
            ))}
          </div>

          {/* Accuracy donut */}
          <div className="flex justify-center mb-6">
            <div className="relative w-28 h-28">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 112 112">
                <circle cx="56" cy="56" r="46" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                <motion.circle
                  cx="56" cy="56" r="46" fill="none"
                  stroke="url(#grad)" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 46}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 46 }}
                  animate={{ strokeDashoffset: (2 * Math.PI * 46) * (1 - accuracy / 100) }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
                <defs>
                  <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-gray-800">{accuracy}%</span>
                <span className="text-gray-400 text-xs font-bold">accuracy</span>
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { icon: "✅", value: result.correct, label: "Correct", color: "from-green-50 to-emerald-50", textColor: "text-green-700" },
              { icon: "❌", value: result.incorrect, label: "Incorrect", color: "from-red-50 to-pink-50", textColor: "text-red-600" },
              { icon: "🪙", value: `+${result.coinsEarned}`, label: "Coins Earned", color: "from-yellow-50 to-amber-50", textColor: "text-yellow-700" },
              { icon: "⏱️", value: formatTime(result.duration || 0), label: "Time", color: "from-blue-50 to-indigo-50", textColor: "text-blue-700" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className={`bg-gradient-to-br ${stat.color} rounded-2xl p-3 text-center`}
              >
                <p className={`text-2xl font-black ${stat.textColor}`}>{stat.icon} {stat.value}</p>
                <p className={`text-xs font-bold ${stat.textColor} opacity-80`}>{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Difficulty progression */}
          {result.difficultyEnd !== result.difficultyStart && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 }}
              className={`rounded-2xl p-3 text-center mb-3 ${result.difficultyEnd > result.difficultyStart
                ? "bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300"
                : "bg-gradient-to-r from-orange-100 to-amber-100 border-2 border-orange-300"}`}
            >
              {result.difficultyEnd > result.difficultyStart ? (
                <p className="font-black text-green-800">🚀 Level Up! {result.difficultyStart} → {result.difficultyEnd}</p>
              ) : (
                <p className="font-black text-orange-800">📚 Adjusted to Level {result.difficultyEnd}</p>
              )}
            </motion.div>
          )}

          {/* Year level advanced */}
          {result.yearLevelAdvanced && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1 }}
              className="gold-gradient rounded-2xl p-4 text-center mb-3"
            >
              <p className="font-black text-white text-xl">🎓 Year Level Advanced!</p>
              <p className="text-white/80 font-semibold text-sm">You're ready for harder challenges!</p>
            </motion.div>
          )}

          {/* Buttons */}
          <div className="space-y-3 mt-2">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                router.back();
              }}
              className="w-full btn-primary text-xl py-4"
            >
              🔄 Play Again!
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push("/dashboard")}
              className="w-full btn-secondary text-lg"
            >
              🏠 Home
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Achievement popup */}
      <AnimatePresence>
        {showAchievements && result.newAchievements?.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowAchievements(false)}
          >
            <motion.div
              initial={{ scale: 0.3, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.3, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.6 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-4xl p-8 max-w-sm w-full text-center shadow-kid"
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: 3 }}
                className="text-7xl mb-3"
              >
                🏆
              </motion.div>
              <h2 className="text-2xl font-black text-gray-800 mb-1">Achievement Unlocked!</h2>
              <p className="text-gray-500 font-semibold mb-4">You did something amazing!</p>

              {result.newAchievements.map((achievement: Achievement, i: number) => (
                <motion.div
                  key={achievement.achievementId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className="gold-gradient rounded-3xl p-4 mb-3 text-white"
                >
                  <div className="text-5xl mb-1">{achievement.badgeIcon}</div>
                  <p className="font-black text-xl">{achievement.badgeName}</p>
                  <p className="text-white/80 text-sm font-semibold">{achievement.description}</p>
                </motion.div>
              ))}

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAchievements(false)}
                className="btn-primary w-full mt-2 text-lg py-3"
              >
                Awesome! 🎉
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
        <div className="spinner" />
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
