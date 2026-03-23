"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Mascot } from "@/components/mascot/Mascot";
import { SessionResult, Achievement } from "@/types";
import confetti from "canvas-confetti";

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [result, setResult] = useState<SessionResult | null>(null);
  const [showAchievements, setShowAchievements] = useState(false);

  useEffect(() => {
    const data = searchParams.get("data");
    if (!data) {
      router.push("/dashboard");
      return;
    }
    try {
      const parsed = JSON.parse(decodeURIComponent(data));
      setResult(parsed);

      // Trigger confetti based on performance
      setTimeout(() => {
        if (parsed.accuracy >= 80) {
          confetti({
            particleCount: 200,
            spread: 100,
            origin: { y: 0.4 },
            colors: ["#FFD700", "#FF6B6B", "#4ECDC4", "#a855f7", "#22c55e"],
          });
        }
        if (parsed.newAchievements?.length > 0) {
          setTimeout(() => setShowAchievements(true), 1500);
        }
      }, 300);
    } catch {
      router.push("/dashboard");
    }
  }, [searchParams, router]);

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
        <div className="spinner" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} />
      </div>
    );
  }

  const accuracy = Math.round(result.accuracy);
  const getMascotMood = () => {
    if (accuracy >= 90) return "celebrating";
    if (accuracy >= 70) return "excited";
    if (accuracy >= 50) return "happy";
    return "sad";
  };

  const getPerformanceMessage = () => {
    if (accuracy === 100) return "PERFECT SCORE! 🎊";
    if (accuracy >= 90) return "Outstanding! 🌟";
    if (accuracy >= 80) return "Excellent work! 🏆";
    if (accuracy >= 70) return "Great job! 🎉";
    if (accuracy >= 60) return "Good effort! 💪";
    if (accuracy >= 50) return "Keep trying! 🌈";
    return "Practice makes perfect! 💫";
  };

  const getBgGradient = () => {
    if (accuracy >= 80) return "from-yellow-400 via-orange-400 to-pink-500";
    if (accuracy >= 60) return "from-blue-500 via-purple-500 to-pink-500";
    return "from-purple-500 via-indigo-500 to-blue-500";
  };

  const stars = result.starsEarned;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${getBgGradient()} flex flex-col items-center justify-center p-4`}>
      <div className="w-full max-w-md">
        {/* Mascot */}
        <div className="flex justify-center mb-4">
          <Mascot mood={getMascotMood()} size="lg" />
        </div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", bounce: 0.3 }}
          className="bg-white rounded-4xl shadow-kid overflow-hidden"
        >
          {/* Header */}
          <div className={`bg-gradient-to-r ${getBgGradient()} p-6 text-center`}>
            <h1 className="text-3xl font-black text-white">{getPerformanceMessage()}</h1>
            <p className="text-white/80 font-semibold mt-1">
              {result.subject === "maths" ? "🔢 Maths" : "📖 English"} •{" "}
              {result.yearLevel === "prep" ? "Prep" : "Year 3"}
            </p>
          </div>

          {/* Score */}
          <div className="p-6">
            {/* Big accuracy circle */}
            <div className="flex justify-center mb-6">
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                  <motion.circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke="url(#scoreGrad)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 54}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 54 }}
                    animate={{ strokeDashoffset: (2 * Math.PI * 54) * (1 - accuracy / 100) }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                  <defs>
                    <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-gray-800">{accuracy}%</span>
                  <span className="text-gray-500 text-xs font-bold">accuracy</span>
                </div>
              </div>
            </div>

            {/* Stars */}
            <div className="flex justify-center gap-3 mb-6">
              {[1, 2, 3].map((star) => (
                <motion.span
                  key={star}
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: star <= stars ? 1 : 0.6, rotate: 0 }}
                  transition={{ delay: 0.3 + star * 0.2, type: "spring", bounce: 0.5 }}
                  className={`text-5xl ${star <= stars ? "filter-none" : "grayscale opacity-30"}`}
                >
                  ⭐
                </motion.span>
              ))}
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-green-50 rounded-2xl p-3 text-center">
                <p className="text-2xl font-black text-green-600">✅ {result.correct}</p>
                <p className="text-xs font-bold text-green-600">Correct</p>
              </div>
              <div className="bg-red-50 rounded-2xl p-3 text-center">
                <p className="text-2xl font-black text-red-500">❌ {result.incorrect}</p>
                <p className="text-xs font-bold text-red-500">Incorrect</p>
              </div>
              <div className="bg-yellow-50 rounded-2xl p-3 text-center">
                <p className="text-2xl font-black text-yellow-600">🪙 +{result.coinsEarned}</p>
                <p className="text-xs font-bold text-yellow-600">Coins Earned</p>
              </div>
              <div className="bg-purple-50 rounded-2xl p-3 text-center">
                <p className="text-2xl font-black text-purple-600">⏱️ {formatTime(result.duration)}</p>
                <p className="text-xs font-bold text-purple-600">Time Taken</p>
              </div>
            </div>

            {/* Difficulty progression */}
            {result.difficultyEnd !== result.difficultyStart && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 }}
                className={`rounded-2xl p-3 text-center mb-4 ${
                  result.difficultyEnd > result.difficultyStart
                    ? "bg-green-50 border-2 border-green-200"
                    : "bg-orange-50 border-2 border-orange-200"
                }`}
              >
                {result.difficultyEnd > result.difficultyStart ? (
                  <p className="font-black text-green-700">
                    🚀 Level Up! {result.difficultyStart} → {result.difficultyEnd}
                  </p>
                ) : (
                  <p className="font-black text-orange-700">
                    📚 Adjusted to Level {result.difficultyEnd} for better learning
                  </p>
                )}
              </motion.div>
            )}

            {result.yearLevelAdvanced && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2 }}
                className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl p-4 text-center mb-4"
              >
                <p className="font-black text-white text-lg">🎓 Year Level Advanced!</p>
                <p className="text-white/80 font-semibold text-sm">Ready for the next challenge!</p>
              </motion.div>
            )}

            {/* Buttons */}
            <div className="space-y-3">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => window.history.back()}
                className="w-full btn-primary text-xl py-4"
              >
                🔄 Play Again!
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push("/dashboard")}
                className="w-full btn-secondary text-lg"
              >
                🏠 Back to Dashboard
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Achievement popup */}
      {showAchievements && result.newAchievements?.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowAchievements(false)}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="bg-white rounded-4xl p-8 max-w-sm w-full text-center shadow-kid"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-6xl mb-3">🏆</div>
            <h2 className="text-2xl font-black text-gray-800 mb-2">Achievement Unlocked!</h2>

            {result.newAchievements.map((achievement: Achievement) => (
              <motion.div
                key={achievement.achievementId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-3xl p-4 mb-3 text-white"
              >
                <div className="text-4xl mb-1">{achievement.badgeIcon}</div>
                <p className="font-black text-lg">{achievement.badgeName}</p>
                <p className="text-white/80 text-sm">{achievement.description}</p>
              </motion.div>
            ))}

            <button
              onClick={() => setShowAchievements(false)}
              className="btn-primary w-full mt-2"
            >
              Awesome! 🎉
            </button>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
          <div className="spinner" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} />
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
