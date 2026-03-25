"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mascot } from "@/components/mascot/Mascot";
import { Question, Subject } from "@/types";
import toast from "react-hot-toast";
import confetti from "canvas-confetti";

interface QuestionResult {
  questionId: string;
  correct: boolean;
  timeSpent: number;
  difficulty: number;
  topic: string;
}

function LearnContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const childId = searchParams.get("child");
  const subject = searchParams.get("subject") as Subject;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [mascotMood, setMascotMood] = useState<"happy" | "excited" | "thinking" | "sad" | "celebrating">("happy");
  const [mascotMessage, setMascotMessage] = useState<string | undefined>();
  const [showHint, setShowHint] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [consecutiveWrong, setConsecutiveWrong] = useState(0);
  const [currentDifficulty, setCurrentDifficulty] = useState(1);
  const [timer, setTimer] = useState(0);
  const [coins, setCoins] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [streak, setStreak] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const questionStartTime = useRef(Date.now());

  // Resolve media pointer to renderable content
  const resolveMedia = (imageUrl: string | undefined, emoji: string | undefined): string | null => {
    if (imageUrl) {
      if (imageUrl.startsWith("emoji:")) return imageUrl.slice(6);
      if (imageUrl.startsWith("svg:")) return null; // SVG assets not yet resolved — fall back to text
    }
    return emoji || null;
  };

  const speak = useCallback((text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.82;
      utterance.pitch = 1.1;
      utterance.volume = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (!childId || !subject) router.push("/dashboard");
  }, [status, childId, subject, router]);

  useEffect(() => {
    if (status === "authenticated" && childId && subject) {
      loadData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, childId, subject]);

  useEffect(() => {
    questionStartTime.current = Date.now();
    setTimer(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer(Math.floor((Date.now() - questionStartTime.current) / 1000));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex]);

  const loadData = async () => {
    try {
      const questionsRes = await fetch(`/api/questions?subject=${subject}&childId=${childId}`);
      const questionsData = await questionsRes.json();

      setCurrentDifficulty(questionsData.difficulty || 1);
      setQuestions(questionsData.questions || []);
    } catch {
      toast.error("Failed to load. Please try again!");
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = useCallback((answerId: string, isCorrect: boolean) => {
    if (isAnswered) return;

    if (timerRef.current) clearInterval(timerRef.current);
    const timeSpent = Math.floor((Date.now() - questionStartTime.current) / 1000);

    setSelectedAnswer(answerId);
    setIsAnswered(true);
    setShowHint(false);
    setShowExplanation(true);

    const currentQuestion = questions[currentIndex];
    setResults(prev => [...prev, {
      questionId: currentQuestion.questionId,
      correct: isCorrect,
      timeSpent,
      difficulty: currentDifficulty,
      topic: currentQuestion.topics[0] || "general",
    }]);

    if (isCorrect) {
      const newConsecutive = consecutiveCorrect + 1;
      setConsecutiveCorrect(newConsecutive);
      setConsecutiveWrong(0);
      setStreak(prev => prev + 1);
      const coinsGained = 10 + Math.floor(currentDifficulty * 2);
      setCoins(prev => prev + coinsGained);

      if (newConsecutive >= 3) {
        setCurrentDifficulty(prev => Math.min(10, prev + 1));
        setConsecutiveCorrect(0);
      }

      // Big confetti for correct answers
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.55 },
        colors: ["#FFD700", "#FF6B6B", "#4ECDC4", "#a855f7", "#22c55e"],
        startVelocity: 35,
      });

      const msgs = ["Amazing! ⭐", "Correct! 🎉", "You got it! 💪", "Brilliant! 🌟", "Awesome! 🔥", "Perfect! 🏆"];
      setMascotMood("excited");
      setMascotMessage(msgs[Math.floor(Math.random() * msgs.length)]);
    } else {
      const newWrong = consecutiveWrong + 1;
      setConsecutiveWrong(newWrong);
      setConsecutiveCorrect(0);
      setStreak(0);

      if (newWrong >= 2) {
        setCurrentDifficulty(prev => Math.max(1, prev - 1));
        setConsecutiveWrong(0);
      }

      setMascotMood("sad");
      const msgs = ["Try again next time! 💫", "Don't give up! 🌈", "Almost! Keep going! 🎯", "You'll get the next one! 💪"];
      setMascotMessage(msgs[Math.floor(Math.random() * msgs.length)]);
    }
  }, [isAnswered, questions, currentIndex, consecutiveCorrect, consecutiveWrong, currentDifficulty]);

  const handleNext = useCallback(async () => {
    if (currentIndex >= questions.length - 1) {
      await submitSession();
      return;
    }
    setCurrentIndex(prev => prev + 1);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setShowHint(false);
    setShowExplanation(false);
    setMascotMood("happy");
    setMascotMessage(undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, questions.length]);

  const handleSkip = useCallback(() => {
    if (isAnswered) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const timeSpent = Math.floor((Date.now() - questionStartTime.current) / 1000);
    const q = questions[currentIndex];
    setResults(prev => [...prev, { questionId: q.questionId, correct: false, timeSpent, difficulty: currentDifficulty, topic: q.topics[0] || "general" }]);
    setCurrentIndex(prev => prev + 1);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setShowHint(false);
    setShowExplanation(false);
  }, [isAnswered, questions, currentIndex, currentDifficulty]);

  const submitSession = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, subject, questions: results }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      confetti({ particleCount: 250, spread: 100, origin: { y: 0.4 } });
      const resultData = encodeURIComponent(JSON.stringify(data.result));
      router.push(`/results?data=${resultData}`);
    } catch {
      toast.error("Failed to save. Try again!");
      setSubmitting(false);
    }
  };

  if (status === "loading" || loading) {
    const loadingGradient = subject === "maths"
      ? "bg-gradient-to-br from-pink-500 to-rose-600"
      : subject === "science"
      ? "bg-gradient-to-br from-emerald-500 to-teal-600"
      : "bg-gradient-to-br from-blue-500 to-cyan-600";
    return (
      <div className={`min-h-screen flex items-center justify-center ${loadingGradient}`}>
        <div className="text-center">
          <Mascot mood="thinking" size="md" className="mb-4" />
          <div className="text-white font-black text-2xl animate-pulse">Loading questions... ✨</div>
        </div>
      </div>
    );
  }

  if (!questions.length) {
    const emptyGrad = subject === "maths" ? "from-pink-500 to-rose-600" : subject === "science" ? "from-emerald-500 to-teal-600" : "from-blue-500 to-cyan-600";
    return (
      <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${emptyGrad}`}>
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-kid mx-4">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">No questions yet!</h2>
          <p className="text-gray-500 font-semibold mb-6">Questions for this subject are being added soon. Try Maths or English!</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="btn-primary w-full"
          >
            🏠 Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const q = questions[currentIndex];
  const correct = results.filter(r => r.correct).length;
  const progressPct = ((currentIndex + (isAnswered ? 1 : 0)) / questions.length) * 100;

  const bgGradient = subject === "maths"
    ? "from-pink-500 via-rose-500 to-orange-400"
    : subject === "science"
    ? "from-emerald-500 via-teal-500 to-cyan-400"
    : "from-blue-600 via-cyan-500 to-teal-400";

  const difficultyStars = Array.from({ length: 10 }, (_, i) => i < currentDifficulty ? "⭐" : "☆");

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgGradient} flex flex-col`}>
      {/* ===== TOP BAR ===== */}
      <div className="sticky top-0 z-20 bg-black/20 backdrop-blur-md px-4 py-3">
        <div className="max-w-2xl mx-auto">
          {/* Row 1: back + subject + stats */}
          <div className="flex items-center justify-between mb-2">
            <motion.button
              onClick={() => router.push("/dashboard")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="glass rounded-xl px-3 py-1.5 text-white font-bold text-sm flex items-center gap-1"
            >
              ← Exit
            </motion.button>

            <div className="flex items-center gap-2">
              <span className="text-white font-black text-lg drop-shadow">
                {subject === "maths" ? "🔢 Maths" : subject === "science" ? "🔬 Science" : "📖 English"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {streak > 1 && (
                <div className="streak-badge">
                  🔥 {streak}
                </div>
              )}
              <div className="reward-counter">
                🪙 {coins}
              </div>
            </div>
          </div>

          {/* Row 2: progress bar */}
          <div className="flex items-center gap-2">
            <span className="text-white/80 text-xs font-bold w-16 shrink-0">
              {currentIndex + 1}/{questions.length}
            </span>
            <div className="flex-1 bg-white/20 rounded-full h-5 overflow-hidden border-2 border-white/30">
              <div className="progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="text-white/80 text-xs font-bold w-12 text-right shrink-0">
              ✅ {correct}
            </span>
          </div>

          {/* Difficulty */}
          <div className="flex items-center justify-center mt-1 gap-0.5">
            {difficultyStars.slice(0, 5).map((s, i) => (
              <span key={i} className="text-xs leading-none">{s}</span>
            ))}
            <span className="text-white/50 text-xs mx-1">|</span>
            {difficultyStars.slice(5).map((s, i) => (
              <span key={i} className="text-xs leading-none">{s}</span>
            ))}
            <span className="text-white/70 text-xs font-bold ml-1">Lv {currentDifficulty}</span>
          </div>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-4 flex flex-col gap-4">
        {/* Timer pill */}
        <div className="flex justify-center">
          <div className={`glass rounded-full px-4 py-1 text-white font-black text-sm ${timer > 30 ? "bg-red-500/30" : ""}`}>
            ⏱️ {timer}s
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -60, scale: 0.95 }}
            transition={{ duration: 0.3, type: "spring", bounce: 0.2 }}
            className="flex flex-col gap-4"
          >
            {/* Question Card */}
            <div className="bg-white rounded-4xl shadow-kid overflow-hidden">
              {/* Question header with topic pills */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-6 pt-5 pb-3">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {q.topics.map(topic => (
                    <span key={topic} className="topic-pill capitalize">{topic.replace(/-/g, " ")}</span>
                  ))}
                </div>

                {/* Question text + TTS */}
                <div className="flex items-start gap-3">
                  <p className="question-text flex-1">{q.questionText}</p>
                  <motion.button
                    onClick={() => speak(q.ttsText || q.questionText)}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.9 }}
                    className="flex-shrink-0 w-12 h-12 bg-blue-100 hover:bg-blue-200 rounded-2xl flex items-center justify-center text-2xl transition-colors shadow-sm"
                    title="Read aloud"
                    aria-label="Read question aloud"
                  >
                    🔊
                  </motion.button>
                </div>
              </div>

              {/* Hint (expandable) */}
              <AnimatePresence>
                {showHint && q.hint && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mx-4 mb-0"
                  >
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-xl p-3 my-2">
                      <p className="text-yellow-800 font-bold text-sm">💡 Hint: {q.hint}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Answer Options */}
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {q.answerOptions.map((option, idx) => {
                  const isSelected = selectedAnswer === option.id;
                  let cardClass = "answer-card";
                  let bgClass = "";

                  if (isAnswered) {
                    if (option.isCorrect) {
                      cardClass += " answer-reveal-correct";
                      bgClass = "border-green-400 bg-gradient-to-br from-green-50 to-emerald-50";
                    } else if (isSelected && !option.isCorrect) {
                      cardClass += " answer-wrong";
                      bgClass = "border-red-400 bg-gradient-to-br from-red-50 to-pink-50";
                    } else {
                      cardClass += " answer-dimmed";
                    }
                  }

                  const optionLetters = ["A", "B", "C", "D"];

                  return (
                    <motion.button
                      key={option.id}
                      onClick={() => handleAnswerSelect(option.id, option.isCorrect)}
                      disabled={isAnswered}
                      whileHover={!isAnswered ? { scale: 1.04, y: -2 } : {}}
                      whileTap={!isAnswered ? { scale: 0.97 } : {}}
                      className={`${cardClass} ${bgClass} text-left w-full`}
                      aria-label={`Answer option ${optionLetters[idx]}: ${option.text}`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Letter badge */}
                        <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-black text-lg
                          ${isAnswered && option.isCorrect ? "bg-green-400 text-white" :
                            isAnswered && isSelected && !option.isCorrect ? "bg-red-400 text-white" :
                            "bg-gray-100 text-gray-600"}`}
                        >
                          {optionLetters[idx]}
                        </div>

                        {/* Emoji / media */}
                        {resolveMedia(option.imageUrl, option.emoji) && (
                          <span className="text-3xl flex-shrink-0 leading-none">
                            {resolveMedia(option.imageUrl, option.emoji)}
                          </span>
                        )}

                        {/* Text */}
                        <p className="font-black text-gray-800 text-lg flex-1 leading-snug">{option.text}</p>

                        {/* Result icons */}
                        {isAnswered && option.isCorrect && (
                          <motion.span
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className="text-3xl flex-shrink-0"
                          >
                            ✅
                          </motion.span>
                        )}
                        {isAnswered && isSelected && !option.isCorrect && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="text-3xl flex-shrink-0"
                          >
                            ❌
                          </motion.span>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Explanation (after answering) */}
              <AnimatePresence>
                {showExplanation && q.explanation && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-4 pb-4"
                  >
                    <div className={`rounded-2xl p-3 border-l-4 ${isAnswered && results[results.length - 1]?.correct
                      ? "bg-green-50 border-green-400"
                      : "bg-blue-50 border-blue-400"
                    }`}>
                      <p className={`font-bold text-sm ${isAnswered && results[results.length - 1]?.correct ? "text-green-800" : "text-blue-800"}`}>
                        💡 {q.explanation}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              {!isAnswered ? (
                <>
                  <motion.button
                    onClick={() => setShowHint(!showHint)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-gray-800 font-black py-3.5 px-4 rounded-2xl shadow-md transition-all text-base"
                    aria-label="Show hint"
                  >
                    💡 {showHint ? "Hide Hint" : "Get Hint"}
                  </motion.button>
                  <motion.button
                    onClick={handleSkip}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 glass text-white font-bold py-3.5 px-4 rounded-2xl transition-all text-base hover:bg-white/30"
                    aria-label="Skip question"
                  >
                    ⏭️ Skip
                  </motion.button>
                </>
              ) : (
                <motion.button
                  onClick={handleNext}
                  disabled={submitting}
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full bg-white text-purple-700 font-black text-xl py-4 rounded-3xl shadow-kid hover:bg-yellow-50 transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <div className="w-6 h-6 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
                  ) : currentIndex >= questions.length - 1 ? (
                    <><span>🏆 See My Results!</span></>
                  ) : (
                    <><span>Next Question</span> <span>→</span></>
                  )}
                </motion.button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Mascot */}
        <div className="flex justify-center mt-2">
          <Mascot mood={mascotMood} message={mascotMessage} size="sm" />
        </div>
      </div>
    </div>
  );
}

export default function LearnPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="spinner" />
      </div>
    }>
      <LearnContent />
    </Suspense>
  );
}
