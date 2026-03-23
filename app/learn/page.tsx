"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mascot } from "@/components/mascot/Mascot";
import { Question, Subject, Child } from "@/types";
import toast from "react-hot-toast";
import confetti from "canvas-confetti";
import { Suspense } from "react";

interface QuestionResult {
  questionId: string;
  correct: boolean;
  timeSpent: number;
  difficulty: number;
  topic: string;
}

function LearnContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const childId = searchParams.get("child");
  const subject = searchParams.get("subject") as Subject;

  const [child, setChild] = useState<Child | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionDifficulty, setSessionDifficulty] = useState(1);
  const [mascotMood, setMascotMood] = useState<"happy" | "excited" | "thinking" | "sad" | "celebrating">("happy");
  const [mascotMessage, setMascotMessage] = useState<string | undefined>();
  const [showHint, setShowHint] = useState(false);
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [consecutiveWrong, setConsecutiveWrong] = useState(0);
  const [currentDifficulty, setCurrentDifficulty] = useState(1);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout>();
  const questionStartTime = useRef(Date.now());
  const [submitting, setSubmitting] = useState(false);

  // Text to speech
  const speak = useCallback((text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85;
      utterance.pitch = 1.1;
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
  }, [status, childId, subject]);

  useEffect(() => {
    // Timer for current question
    questionStartTime.current = Date.now();
    timerRef.current = setInterval(() => {
      setTimer(Math.floor((Date.now() - questionStartTime.current) / 1000));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [currentIndex]);

  const loadData = async () => {
    try {
      const [childRes, questionsRes] = await Promise.all([
        fetch(`/api/children/${childId}`),
        fetch(`/api/questions?subject=${subject}&childId=${childId}`),
      ]);

      const childData = await childRes.json();
      const questionsData = await questionsRes.json();

      setChild(childData.child);
      setCurrentDifficulty(questionsData.difficulty || 1);
      setSessionDifficulty(questionsData.difficulty || 1);

      if (questionsData.questions?.length === 0) {
        toast.error("No questions available. Please try again later.");
        router.push("/dashboard");
        return;
      }

      setQuestions(questionsData.questions || []);
    } catch {
      toast.error("Failed to load questions");
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = useCallback((answerId: string, isCorrect: boolean) => {
    if (isAnswered) return;

    clearInterval(timerRef.current);
    const timeSpent = Math.floor((Date.now() - questionStartTime.current) / 1000);

    setSelectedAnswer(answerId);
    setIsAnswered(true);
    setShowHint(false);

    const currentQuestion = questions[currentIndex];
    const result: QuestionResult = {
      questionId: currentQuestion.questionId,
      correct: isCorrect,
      timeSpent,
      difficulty: currentDifficulty,
      topic: currentQuestion.topics[0] || "general",
    };

    setResults((prev) => [...prev, result]);

    if (isCorrect) {
      const newConsecutive = consecutiveCorrect + 1;
      setConsecutiveCorrect(newConsecutive);
      setConsecutiveWrong(0);

      // Adjust difficulty
      if (newConsecutive >= 3) {
        const newDiff = Math.min(10, currentDifficulty + 1);
        setCurrentDifficulty(newDiff);
        setConsecutiveCorrect(0);
      }

      // Confetti for correct answer
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4"],
      });

      setMascotMood("excited");
      const msgs = ["Amazing! ⭐", "Correct! 🎉", "You got it! 💪", "Brilliant! 🌟"];
      setMascotMessage(msgs[Math.floor(Math.random() * msgs.length)]);
    } else {
      const newConsecutiveWrong = consecutiveWrong + 1;
      setConsecutiveWrong(newConsecutiveWrong);
      setConsecutiveCorrect(0);

      if (newConsecutiveWrong >= 2) {
        const newDiff = Math.max(1, currentDifficulty - 1);
        setCurrentDifficulty(newDiff);
        setConsecutiveWrong(0);
      }

      setMascotMood("sad");
      const msgs = ["Try again! 💫", "Don't give up! 🌈", "Almost there! 🎯"];
      setMascotMessage(msgs[Math.floor(Math.random() * msgs.length)]);
    }

    // Read explanation aloud
    if (isCorrect) {
      speak("Correct! " + (currentQuestion.explanation || ""));
    }
  }, [isAnswered, questions, currentIndex, consecutiveCorrect, consecutiveWrong, currentDifficulty, speak]);

  const handleNext = useCallback(async () => {
    if (currentIndex >= questions.length - 1) {
      // Session complete!
      await submitSession();
      return;
    }

    setCurrentIndex((prev) => prev + 1);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setShowHint(false);
    setMascotMood("happy");
    setMascotMessage(undefined);
    setTimer(0);
  }, [currentIndex, questions.length, results]);

  const handleSkip = useCallback(() => {
    if (isAnswered) return;
    clearInterval(timerRef.current);
    const timeSpent = Math.floor((Date.now() - questionStartTime.current) / 1000);

    const currentQuestion = questions[currentIndex];
    setResults((prev) => [
      ...prev,
      {
        questionId: currentQuestion.questionId,
        correct: false,
        timeSpent,
        difficulty: currentDifficulty,
        topic: currentQuestion.topics[0] || "general",
      },
    ]);

    setCurrentIndex((prev) => prev + 1);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setShowHint(false);
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

      // Celebrate completion
      confetti({
        particleCount: 200,
        spread: 90,
        origin: { y: 0.5 },
      });

      // Navigate to results
      const resultData = encodeURIComponent(JSON.stringify(data.result));
      router.push(`/results?data=${resultData}`);
    } catch {
      toast.error("Failed to save progress. Please try again.");
      setSubmitting(false);
    }
  };

  const readQuestionAloud = () => {
    if (questions[currentIndex]) {
      speak(questions[currentIndex].questionText);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="text-center text-white">
          <Mascot mood="thinking" size="md" className="mb-4" />
          <p className="font-black text-2xl animate-pulse">Loading questions... 🔮</p>
        </div>
      </div>
    );
  }

  if (!questions.length) return null;

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex) / questions.length) * 100;
  const correct = results.filter((r) => r.correct).length;

  const subjectGradient = subject === "maths"
    ? "from-pink-500 via-rose-500 to-red-500"
    : "from-blue-500 via-cyan-500 to-teal-500";

  return (
    <div className={`min-h-screen bg-gradient-to-br ${subjectGradient} relative`}>
      {/* Header */}
      <div className="bg-white/10 backdrop-blur px-4 py-3">
        <div className="max-w-2xl mx-auto">
          {/* Top row */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-white font-bold hover:opacity-80 transition-opacity"
            >
              ← Back
            </button>
            <div className="flex items-center gap-3 text-white">
              <span className="font-black text-lg">
                {subject === "maths" ? "🔢 Maths" : "📖 English"}
              </span>
              <span className="bg-white/20 rounded-xl px-2 py-1 text-sm font-bold">
                Level {currentDifficulty}
              </span>
            </div>
            <div className="flex items-center gap-2 text-white font-bold">
              <span>✅ {correct}/{currentIndex}</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="bg-white/20 rounded-full h-4 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-white"
              initial={{ width: 0 }}
              animate={{ width: `${((currentIndex + (isAnswered ? 1 : 0)) / questions.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          <div className="flex justify-between text-white/80 text-sm font-semibold mt-1">
            <span>Question {currentIndex + 1} of {questions.length}</span>
            <span>⏱️ {timer}s</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            {/* Question Card */}
            <div className="bg-white rounded-4xl shadow-kid mb-4 overflow-hidden">
              {/* Question text */}
              <div className="p-6">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-xl sm:text-2xl font-black text-gray-800 leading-relaxed">
                      {currentQuestion.questionText}
                    </p>
                  </div>
                  {/* TTS button */}
                  <motion.button
                    onClick={readQuestionAloud}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="flex-shrink-0 w-12 h-12 bg-blue-100 hover:bg-blue-200 rounded-2xl flex items-center justify-center text-2xl transition-colors"
                    title="Read aloud"
                  >
                    🔊
                  </motion.button>
                </div>

                {/* Hint */}
                {showHint && currentQuestion.hint && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-3 bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-3"
                  >
                    <p className="text-yellow-800 font-bold text-sm">💡 Hint: {currentQuestion.hint}</p>
                  </motion.div>
                )}
              </div>

              {/* Answer options */}
              <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentQuestion.answerOptions.map((option) => {
                  let cardClass = "answer-card";
                  if (isAnswered) {
                    if (option.isCorrect) {
                      cardClass += " selected-correct border-green-400 bg-green-50";
                    } else if (selectedAnswer === option.id && !option.isCorrect) {
                      cardClass += " selected-wrong border-red-400 bg-red-50";
                    } else {
                      cardClass += " opacity-60";
                    }
                  }

                  return (
                    <motion.button
                      key={option.id}
                      onClick={() => handleAnswerSelect(option.id, option.isCorrect)}
                      whileHover={isAnswered ? {} : { scale: 1.03 }}
                      whileTap={isAnswered ? {} : { scale: 0.97 }}
                      className={`${cardClass} text-left w-full`}
                      disabled={isAnswered}
                    >
                      <div className="flex items-center gap-3">
                        {option.emoji && (
                          <span className="text-3xl flex-shrink-0">{option.emoji}</span>
                        )}
                        <div className="flex-1">
                          <p className="font-black text-gray-800 text-lg">{option.text}</p>
                        </div>
                        {isAnswered && option.isCorrect && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="text-3xl"
                          >
                            ✅
                          </motion.span>
                        )}
                        {isAnswered && selectedAnswer === option.id && !option.isCorrect && (
                          <span className="text-3xl">❌</span>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Explanation (shown after answering) */}
              <AnimatePresence>
                {isAnswered && currentQuestion.explanation && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-6 pb-4"
                  >
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-3">
                      <p className="text-blue-800 font-bold text-sm">
                        💡 {currentQuestion.explanation}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              {!isAnswered && (
                <>
                  <motion.button
                    onClick={() => setShowHint(!showHint)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-gray-800 font-bold py-3 px-4 rounded-2xl shadow-md transition-all"
                  >
                    💡 {showHint ? "Hide" : "Hint"}
                  </motion.button>
                  <motion.button
                    onClick={handleSkip}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex-1 bg-white/20 hover:bg-white/30 text-white font-bold py-3 px-4 rounded-2xl transition-all"
                  >
                    ⏭️ Skip
                  </motion.button>
                </>
              )}

              {isAnswered && (
                <motion.button
                  onClick={handleNext}
                  disabled={submitting}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full bg-white text-purple-600 font-black text-xl py-4 rounded-3xl shadow-kid hover:bg-yellow-50 transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                  ) : currentIndex >= questions.length - 1 ? (
                    "🏆 See Results!"
                  ) : (
                    "Next Question →"
                  )}
                </motion.button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Mascot */}
        <div className="flex justify-center mt-6">
          <Mascot mood={mascotMood} message={mascotMessage} size="sm" />
        </div>
      </div>
    </div>
  );
}

export default function LearnPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
          <div className="spinner" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} />
        </div>
      }
    >
      <LearnContent />
    </Suspense>
  );
}
