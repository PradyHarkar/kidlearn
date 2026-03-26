"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import toast from "react-hot-toast";
import { Mascot } from "@/components/mascot/Mascot";
import type { DiagnosticQuestion, DiagnosticResult } from "@/types";

const DIAGNOSTIC_SIZE = 5;

interface DiagnosticGetResponse {
  diagnosticComplete?: boolean;
  childId?: string;
  baselineDifficulty?: number;
  calibratedDifficulty?: number;
  nextUrl?: string;
  questions?: DiagnosticQuestion[];
}

interface DiagnosticSubmitResponse {
  success?: boolean;
  error?: string;
  result?: DiagnosticResult;
}

function DiagnosticContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const childId = searchParams.get("childId") || searchParams.get("child");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [diagnosticComplete, setDiagnosticComplete] = useState(false);
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [baselineDifficulty, setBaselineDifficulty] = useState<number | null>(null);
  const [calibratedDifficulty, setCalibratedDifficulty] = useState<number | null>(null);
  const [nextUrl, setNextUrl] = useState<string>("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [finishedResult, setFinishedResult] = useState<DiagnosticResult | null>(null);

  const currentQuestion = questions[currentIndex];
  const selectedAnswer = selectedAnswers[currentIndex];

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!childId) {
      router.push("/dashboard");
      return;
    }

    const loadDiagnostic = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/diagnostic?childId=${encodeURIComponent(childId)}`);
        const data = (await res.json()) as DiagnosticGetResponse & { error?: string };

        if (res.status === 401) {
          router.push("/login");
          return;
        }

        if (!res.ok) {
          toast.error(data.error || "Failed to load diagnostic");
          router.push("/dashboard");
          return;
        }

        setDiagnosticComplete(Boolean(data.diagnosticComplete));
        setBaselineDifficulty(data.baselineDifficulty ?? null);
        setCalibratedDifficulty(data.calibratedDifficulty ?? null);
        setNextUrl(data.nextUrl || `/learn?child=${childId}&subject=maths`);

        if (data.diagnosticComplete) {
          setFinishedResult({
            childId,
            subject: "maths",
            totalQuestions: DIAGNOSTIC_SIZE,
            correctAnswers: DIAGNOSTIC_SIZE,
            baselineDifficulty: data.baselineDifficulty ?? 1,
            calibratedDifficulty: data.calibratedDifficulty ?? data.baselineDifficulty ?? 1,
            difficultyDelta: (data.calibratedDifficulty ?? data.baselineDifficulty ?? 1) - (data.baselineDifficulty ?? 1),
            diagnosticComplete: true,
            nextUrl: data.nextUrl || `/learn?child=${childId}&subject=maths`,
          });
          setQuestions([]);
          return;
        }

        setQuestions(data.questions || []);
        setCurrentIndex(0);
        setSelectedAnswers({});
        setFinishedResult(null);
      } catch {
        toast.error("Could not load diagnostic");
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    void loadDiagnostic();
  }, [status, childId, router]);

  const progress = useMemo(() => {
    if (!questions.length) return 0;
    return Math.round(((currentIndex + (selectedAnswer ? 1 : 0)) / questions.length) * 100);
  }, [currentIndex, questions.length, selectedAnswer]);

  const handleChoose = (answerId: string) => {
    if (!currentQuestion) return;
    setSelectedAnswers((current) => ({ ...current, [currentIndex]: answerId }));
  };

  const goNext = async () => {
    if (!currentQuestion) return;

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((index) => index + 1);
      return;
    }

    const answers = questions.map((question, index) => ({
      questionId: question.questionId,
      answerId: selectedAnswers[index] || question.answerOptions[0]?.id || "",
    }));

    setSubmitting(true);
    try {
      const res = await fetch("/api/diagnostic/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, answers }),
      });
      const data = (await res.json()) as DiagnosticSubmitResponse;

      if (!res.ok) {
        if (res.status === 409 && data.result) {
          setFinishedResult(data.result);
          setDiagnosticComplete(true);
          setCalibratedDifficulty(data.result.calibratedDifficulty);
          setNextUrl(data.result.nextUrl);
          return;
        }
        throw new Error(data.error || "Failed to submit diagnostic");
      }

      if (data.result) {
        setFinishedResult(data.result);
        setDiagnosticComplete(true);
        setCalibratedDifficulty(data.result.calibratedDifficulty);
        setNextUrl(data.result.nextUrl);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit diagnostic");
    } finally {
      setSubmitting(false);
    }
  };

  const backToDashboard = () => router.push("/dashboard");

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600">
        <div className="text-center text-white">
          <div className="spinner mx-auto mb-4" />
          <p className="font-black text-xl">Loading diagnostic...</p>
        </div>
      </div>
    );
  }

  if (!childId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600 p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-kid text-center">
          <div className="text-6xl mb-3">🧪</div>
          <h1 className="text-2xl font-black text-gray-800 mb-2">Missing child link</h1>
          <p className="text-gray-500 font-semibold mb-6">Open a child card from the dashboard to start the diagnostic.</p>
          <button onClick={backToDashboard} className="btn-primary w-full">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (finishedResult || diagnosticComplete) {
    const result = finishedResult;
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-500 p-4 flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md bg-white rounded-4xl shadow-kid overflow-hidden"
        >
          <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-6 text-center text-white">
            <div className="text-6xl mb-2">🎉</div>
            <h1 className="text-3xl font-black">Diagnostic complete</h1>
            <p className="text-white/80 font-semibold mt-1">Your child is ready for the next learning set.</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-purple-50 rounded-2xl p-3 text-center">
                <p className="text-xs font-bold text-purple-600">Baseline</p>
                <p className="text-2xl font-black text-purple-800">{baselineDifficulty ?? result?.baselineDifficulty ?? 1}</p>
              </div>
              <div className="bg-indigo-50 rounded-2xl p-3 text-center">
                <p className="text-xs font-bold text-indigo-600">Calibrated</p>
                <p className="text-2xl font-black text-indigo-800">{calibratedDifficulty ?? result?.calibratedDifficulty ?? 1}</p>
              </div>
            </div>

            {result && (
              <div className="bg-emerald-50 rounded-2xl p-4">
                <p className="text-sm font-bold text-emerald-700">Score</p>
                <p className="text-3xl font-black text-emerald-800">
                  {result.correctAnswers}/{result.totalQuestions}
                </p>
                <p className="text-xs font-semibold text-emerald-700/80">
                  Difficulty shift: {result.difficultyDelta > 0 ? "+" : ""}
                  {result.difficultyDelta}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Link href={nextUrl || `/learn?child=${childId}&subject=maths`} className="btn-primary flex-1 text-center">
                Start Learning
              </Link>
              <button onClick={backToDashboard} className="btn-secondary flex-1">
                Dashboard
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-500 flex flex-col">
      <header className="bg-black/20 backdrop-blur-md px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button onClick={backToDashboard} className="glass rounded-xl px-3 py-1.5 text-white font-bold text-sm">
            ← Dashboard
          </button>
          <div className="text-white font-black text-lg">🧪 Diagnostic Check</div>
          <div className="text-white/80 font-bold text-sm">Maths</div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-5 flex flex-col gap-4">
        <div className="flex justify-center">
          <Mascot mood="thinking" size="sm" />
        </div>

        <div className="glass rounded-full px-4 py-1 text-white font-black text-sm self-center">
          Question {Math.min(currentIndex + 1, questions.length)}/{questions.length || DIAGNOSTIC_SIZE}
        </div>

        <div className="w-full bg-white/20 rounded-full h-4 overflow-hidden border-2 border-white/30">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <AnimatePresence mode="wait">
          {currentQuestion && (
            <motion.section
              key={currentQuestion.questionId}
              initial={{ opacity: 0, x: 30, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -30, scale: 0.97 }}
              className="bg-white rounded-4xl shadow-kid overflow-hidden"
            >
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 pt-5 pb-3">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(currentQuestion.topics || []).map((topic) => (
                    <span key={topic} className="topic-pill capitalize">
                      {topic.replace(/-/g, " ")}
                    </span>
                  ))}
                </div>
                <p className="question-text">{currentQuestion.questionText}</p>
                {currentQuestion.hint && (
                  <div className="mt-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-xl p-3">
                    <p className="text-yellow-800 font-bold text-sm">💡 Hint: {currentQuestion.hint}</p>
                  </div>
                )}
              </div>

              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentQuestion.answerOptions.map((option, index) => {
                  const optionLetters = ["A", "B", "C", "D"];
                  const isSelected = selectedAnswer === option.id;
                  return (
                    <motion.button
                      key={option.id}
                      onClick={() => handleChoose(option.id)}
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      className={`answer-card text-left w-full ${isSelected ? "border-purple-400 bg-purple-50" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-black text-lg ${isSelected ? "bg-purple-500 text-white" : "bg-gray-100 text-gray-600"}`}>
                          {optionLetters[index]}
                        </div>
                        <p className="font-black text-gray-800 text-lg flex-1 leading-snug">{option.text}</p>
                        {isSelected && <span className="text-2xl">✅</span>}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <div className="bg-white/15 rounded-3xl p-4 text-white">
          <p className="font-black text-lg">How it works</p>
          <p className="text-white/85 text-sm font-semibold mt-1">
            Answer 5 maths questions to calibrate the starting level for learning.
          </p>
          <p className="text-white/70 text-xs font-semibold mt-2">
            Current baseline: {baselineDifficulty ?? 1} · After submit, the child will go back into learning at the calibrated level.
          </p>
        </div>

        <div className="flex gap-3">
          <button onClick={backToDashboard} className="btn-secondary flex-1">
            Exit
          </button>
          <button
            onClick={goNext}
            disabled={!selectedAnswer || submitting || !currentQuestion}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {submitting ? "Saving..." : currentIndex < questions.length - 1 ? "Next Question" : "Finish Diagnostic"}
          </button>
        </div>
      </main>
    </div>
  );
}

export default function DiagnosticPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600">
          <div className="spinner" />
        </div>
      }
    >
      <DiagnosticContent />
    </Suspense>
  );
}
