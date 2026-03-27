"use client";

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mascot } from "@/components/mascot/Mascot";
import { AgeGroup, ChildPreferences, Country, Question, Subject, YearLevel } from "@/types";
import { getThemeJourneyTokens } from "@/lib/services/tile-themes";
import toast from "react-hot-toast";
import confetti from "canvas-confetti";

const SESSION_SIZE = 20;

const REPORT_REASONS = [
  "Wrong answer marked",
  "Question is incorrect",
  "Too difficult",
  "Too easy",
  "Confusing wording",
  "Other",
];

interface QuestionResult {
  questionId: string;
  correct: boolean;
  timeSpent: number;
  difficulty: number;
  topic: string;
}

interface SavedLearnSessionState {
  questions: Question[];
  currentIndex: number;
  selectedAnswer: string | null;
  isAnswered: boolean;
  results: QuestionResult[];
  currentDifficulty: number;
  ageGroup?: string;
  journeyTheme?: {
    tileThemeId: string;
    tileFavoriteTags: string[];
    preferences?: ChildPreferences;
  };
  timer: number;
  coins: number;
  streak: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  showHint: boolean;
  showExplanation: boolean;
  mascotMood: "happy" | "excited" | "thinking" | "sad" | "celebrating";
  mascotMessage?: string;
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
  const [ageGroup, setAgeGroup] = useState<string | undefined>();
  const [journeyThemeId, setJourneyThemeId] = useState("");
  const [journeyThemeTags, setJourneyThemeTags] = useState<string[]>([]);
  const [journeyAvatar, setJourneyAvatar] = useState("🧒");
  const [journeyButtonStyle, setJourneyButtonStyle] = useState<"gradient" | "cartoon">("gradient");
  const [journeyCardStyle, setJourneyCardStyle] = useState<"soft" | "bold">("soft");
  const [journeyRewardStyle, setJourneyRewardStyle] = useState<"coins" | "stars" | "gems">("coins");
  const [journeyCountry, setJourneyCountry] = useState<"AU" | "US" | "IN" | "UK">("AU");
  const [timer, setTimer] = useState(0);
  const [coins, setCoins] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [streak, setStreak] = useState(0);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();

  // Report question modal
  const [reportingQuestion, setReportingQuestion] = useState<Question | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // AI Tutor explanation
  const [tutorExplanation, setTutorExplanation] = useState<string | null>(null);
  const [tutorLoading, setTutorLoading] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const questionStartTime = useRef(Date.now());
  const restoredTimerRef = useRef<number | null>(null);

  // Reward points = number of questions answered
  const pointsEarned = results.length;
  const journeyTheme = useMemo(() => {
    const resolvedAgeGroup = (ageGroup || "year3") as AgeGroup;
    const resolvedYearLevel: YearLevel = resolvedAgeGroup === "foundation" ? "prep" : resolvedAgeGroup;
    return getThemeJourneyTokens(journeyThemeId || undefined, {
      ageGroup: resolvedAgeGroup,
      yearLevel: resolvedYearLevel,
      country: journeyCountry as Country,
    });
  }, [ageGroup, journeyCountry, journeyThemeId]);

  const rewardGlyph = journeyRewardStyle === "stars" ? "⭐" : journeyRewardStyle === "gems" ? "💎" : "🪙";
  const isCartoonStyle = journeyButtonStyle === "cartoon";
  const isBoldCard = journeyCardStyle === "bold";
  const questionCardClass = isBoldCard
    ? `rounded-[2.35rem] border-4 shadow-2xl ${journeyTheme.surfaceCard} ${journeyTheme.surfaceBorder}`
    : `rounded-4xl border shadow-kid ${journeyTheme.surfaceCard} ${journeyTheme.surfaceBorder}`;
  const actionButtonClass = isCartoonStyle
    ? "rounded-full shadow-lg border-2 border-white/50 uppercase tracking-wide"
    : "rounded-2xl shadow-md";
  const questionCardBackground = {
    backgroundImage: `linear-gradient(rgba(255,255,255,0.74), rgba(255,255,255,0.88)), url(${journeyTheme.cardImageUrl})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  } as const;

  // Resolve media pointer to renderable content
  const resolveMedia = (imageUrl: string | undefined, emoji: string | undefined): string | null => {
    if (imageUrl) {
      if (imageUrl.startsWith("emoji:")) return imageUrl.slice(6);
      if (imageUrl.startsWith("svg:")) return null;
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
    const elapsed = restoredTimerRef.current ?? 0;
    restoredTimerRef.current = null;
    questionStartTime.current = Date.now() - (elapsed * 1000);
    setTimer(elapsed);
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
      const sessionRes = await fetch(`/api/learn/session?childId=${encodeURIComponent(childId ?? "")}&subject=${subject}`);
      const sessionData = await sessionRes.json();
      if (sessionRes.ok && sessionData.session?.questions?.length) {
        const saved = sessionData.session as SavedLearnSessionState & { sessionId?: string };
        setActiveSessionId(saved.sessionId);
        setQuestions(saved.questions);
        setCurrentIndex(saved.currentIndex);
        setSelectedAnswer(saved.selectedAnswer);
        setIsAnswered(saved.isAnswered);
        setResults(saved.results || []);
        setCurrentDifficulty(saved.currentDifficulty || 1);
        setAgeGroup(saved.ageGroup);
        setCoins(saved.coins || 0);
        setStreak(saved.streak || 0);
        setConsecutiveCorrect(saved.consecutiveCorrect || 0);
        setConsecutiveWrong(saved.consecutiveWrong || 0);
        setShowHint(saved.showHint || false);
        setShowExplanation(saved.showExplanation || false);
        setMascotMood(saved.mascotMood || "happy");
        setMascotMessage(saved.mascotMessage);
        setJourneyThemeId(saved.journeyTheme?.preferences?.theme || saved.journeyTheme?.tileThemeId || "");
        setJourneyThemeTags(saved.journeyTheme?.tileFavoriteTags || []);
        setJourneyAvatar(saved.journeyTheme?.preferences?.avatar || "🧒");
        setJourneyButtonStyle(saved.journeyTheme?.preferences?.buttonStyle || "gradient");
        setJourneyCardStyle(saved.journeyTheme?.preferences?.cardStyle || "soft");
        setJourneyRewardStyle(saved.journeyTheme?.preferences?.rewardStyle || "coins");
        restoredTimerRef.current = saved.timer || 0;
        return;
        }

      const questionsRes = await fetch(`/api/questions?subject=${subject}&childId=${childId}`);
      const questionsData = await questionsRes.json();
      const fetchedQuestions = (questionsData.questions || []).slice(0, SESSION_SIZE);

      setCurrentDifficulty(questionsData.difficulty || 1);
      setAgeGroup(questionsData.ageGroup);
      setJourneyCountry((questionsData.country || "AU") as Country);
      setJourneyThemeId(questionsData.appearance?.preferences?.theme || questionsData.appearance?.tileThemeId || "");
      setJourneyThemeTags(questionsData.appearance?.tileFavoriteTags || []);
      setJourneyAvatar(questionsData.appearance?.preferences?.avatar || "🧒");
      setJourneyButtonStyle(questionsData.appearance?.preferences?.buttonStyle || "gradient");
      setJourneyCardStyle(questionsData.appearance?.preferences?.cardStyle || "soft");
      setJourneyRewardStyle(questionsData.appearance?.preferences?.rewardStyle || "coins");
      setQuestions(fetchedQuestions);
      restoredTimerRef.current = 0;

      if (fetchedQuestions.length) {
        const saveRes = await fetch("/api/learn/session", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            childId,
            subject,
            questions: fetchedQuestions,
            currentIndex: 0,
            selectedAnswer: null,
            isAnswered: false,
            results: [],
            currentDifficulty: questionsData.difficulty || 1,
            ageGroup: questionsData.ageGroup,
            timer: 0,
            coins: 0,
            streak: 0,
            consecutiveCorrect: 0,
            consecutiveWrong: 0,
            showHint: false,
            showExplanation: false,
            mascotMood: "happy",
            journeyTheme: {
              tileThemeId: questionsData.appearance?.tileThemeId || "",
              tileFavoriteTags: questionsData.appearance?.tileFavoriteTags || [],
              preferences: questionsData.appearance?.preferences || {
                theme: questionsData.appearance?.preferences?.theme || "fantasy",
                avatar: questionsData.appearance?.preferences?.avatar || "🧒",
                buttonStyle: questionsData.appearance?.preferences?.buttonStyle || "gradient",
                cardStyle: questionsData.appearance?.preferences?.cardStyle || "soft",
                rewardStyle: questionsData.appearance?.preferences?.rewardStyle || "coins",
              },
            },
          }),
        });
        const saveData = await saveRes.json();
        if (saveRes.ok && saveData.session?.sessionId) {
          setActiveSessionId(saveData.session.sessionId);
        }
      }
    } catch {
      toast.error("Failed to load. Please try again!");
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const persistSession = useCallback(async (snapshot: SavedLearnSessionState) => {
    if (!childId || !subject) return;

    try {
      const res = await fetch("/api/learn/session", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...snapshot,
            sessionId: activeSessionId,
            childId,
            subject,
            journeyTheme: {
              tileThemeId: journeyThemeId,
              tileFavoriteTags: journeyThemeTags,
              preferences: {
                theme: (journeyThemeId || "fantasy") as "fantasy" | "unicorn" | "space" | "soccer" | "jungle" | "ocean",
                avatar: journeyAvatar,
                buttonStyle: journeyButtonStyle,
                cardStyle: journeyCardStyle,
                rewardStyle: journeyRewardStyle,
              },
            },
          }),
        });
      const data = await res.json();
      if (res.ok && data.session?.sessionId) {
        setActiveSessionId(data.session.sessionId);
      }
    } catch {
      // Non-fatal: progress submission still persists the final state.
    }
  }, [activeSessionId, childId, journeyThemeId, journeyThemeTags, subject]);

  const handleAnswerSelect = useCallback((answerId: string, isCorrect: boolean) => {
    if (isAnswered) return;

    if (timerRef.current) clearInterval(timerRef.current);
    const timeSpent = Math.floor((Date.now() - questionStartTime.current) / 1000);

    setSelectedAnswer(answerId);
    setIsAnswered(true);
    setShowHint(false);
    setShowExplanation(true);

    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;
    const nextResults = [...results, {
      questionId: currentQuestion.questionId,
      correct: isCorrect,
      timeSpent,
      difficulty: currentDifficulty,
      topic: currentQuestion.topics?.[0] || "general",
    }];
    setResults(nextResults);

    if (isCorrect) {
      const newConsecutive = consecutiveCorrect + 1;
      const nextStreak = streak + 1;
      const coinsGained = 10 + Math.floor(currentDifficulty * 2);
      const nextCoins = coins + coinsGained;
      const nextDifficulty = newConsecutive >= 3 ? Math.min(10, currentDifficulty + 1) : currentDifficulty;
      const nextConsecutiveCorrect = newConsecutive >= 3 ? 0 : newConsecutive;
      setConsecutiveCorrect(nextConsecutiveCorrect);
      setConsecutiveWrong(0);
      setStreak(nextStreak);
      setCoins(nextCoins);

      if (newConsecutive >= 3) {
        setCurrentDifficulty(nextDifficulty);
      }

      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.55 },
        colors: ["#FFD700", "#FF6B6B", "#4ECDC4", "#a855f7", "#22c55e"],
        startVelocity: 35,
      });

      const msgs = ["Amazing! ⭐", "Correct! 🎉", "You got it! 💪", "Brilliant! 🌟", "Awesome! 🔥", "Perfect! 🏆"];
      const message = msgs[Math.floor(Math.random() * msgs.length)];
      setMascotMood("excited");
      setMascotMessage(message);
      void persistSession({
        questions,
        currentIndex,
        selectedAnswer: answerId,
        isAnswered: true,
        results: nextResults,
        currentDifficulty: nextDifficulty,
        ageGroup,
        timer,
        coins: nextCoins,
        streak: nextStreak,
        consecutiveCorrect: nextConsecutiveCorrect,
        consecutiveWrong: 0,
        showHint: false,
        showExplanation: true,
        mascotMood: "excited",
        mascotMessage: message,
      });
    } else {
      const newWrong = consecutiveWrong + 1;
      const nextDifficulty = newWrong >= 2 ? Math.max(1, currentDifficulty - 1) : currentDifficulty;
      const nextConsecutiveWrong = newWrong >= 2 ? 0 : newWrong;
      setConsecutiveWrong(nextConsecutiveWrong);
      setConsecutiveCorrect(0);
      setStreak(0);

      if (newWrong >= 2) {
        setCurrentDifficulty(nextDifficulty);
      }

      setMascotMood("sad");
      const msgs = ["Try again next time! 💫", "Don't give up! 🌈", "Almost! Keep going! 🎯", "You'll get the next one! 💪"];
      const message = msgs[Math.floor(Math.random() * msgs.length)];
      setMascotMessage(message);
      void persistSession({
        questions,
        currentIndex,
        selectedAnswer: answerId,
        isAnswered: true,
        results: nextResults,
        currentDifficulty: nextDifficulty,
        ageGroup,
        timer,
        coins,
        streak: 0,
        consecutiveCorrect: 0,
        consecutiveWrong: nextConsecutiveWrong,
        showHint: false,
        showExplanation: true,
        mascotMood: "sad",
        mascotMessage: message,
      });
    }
  }, [isAnswered, questions, currentIndex, consecutiveCorrect, consecutiveWrong, currentDifficulty]);

  const handleNext = useCallback(async () => {
    if (currentIndex >= questions.length - 1) {
      await submitSession();
      return;
    }
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setShowHint(false);
    setShowExplanation(false);
    setMascotMood("happy");
    setMascotMessage(undefined);
    setTutorExplanation(null);
    setTutorLoading(false);
    void persistSession({
      questions,
      currentIndex: nextIndex,
      selectedAnswer: null,
      isAnswered: false,
      results,
      currentDifficulty,
      ageGroup,
      timer: 0,
      coins,
      streak,
      consecutiveCorrect,
      consecutiveWrong,
      showHint: false,
      showExplanation: false,
      mascotMood: "happy",
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, questions.length, questions, results, currentDifficulty, ageGroup, coins, streak, consecutiveCorrect, consecutiveWrong, persistSession]);

  const handleSkip = useCallback(() => {
    if (isAnswered) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const timeSpent = Math.floor((Date.now() - questionStartTime.current) / 1000);
    const q = questions[currentIndex];
    if (!q) return;
    const nextResults = [...results, { questionId: q.questionId, correct: false, timeSpent, difficulty: currentDifficulty, topic: q.topics?.[0] || "general" }];
    setResults(nextResults);

    if (currentIndex >= questions.length - 1) {
      // Last question skipped — show "See My Results!" button rather than going past the array end
      setIsAnswered(true);
      setShowHint(false);
      setShowExplanation(false);
      void persistSession({
        questions,
        currentIndex,
        selectedAnswer: null,
        isAnswered: true,
        results: nextResults,
        currentDifficulty,
        ageGroup,
        timer,
        coins,
        streak,
        consecutiveCorrect,
        consecutiveWrong,
        showHint: false,
        showExplanation: false,
        mascotMood,
        mascotMessage,
      });
      return;
    }

    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setShowHint(false);
    setShowExplanation(false);
    void persistSession({
      questions,
      currentIndex: nextIndex,
      selectedAnswer: null,
      isAnswered: false,
      results: nextResults,
      currentDifficulty,
      ageGroup,
      timer: 0,
      coins,
      streak,
      consecutiveCorrect,
      consecutiveWrong,
      showHint: false,
      showExplanation: false,
      mascotMood,
      mascotMessage,
    });
  }, [isAnswered, questions, currentIndex, currentDifficulty, results, ageGroup, coins, streak, consecutiveCorrect, consecutiveWrong, mascotMood, mascotMessage, persistSession]);

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

  const openReport = (q: Question) => {
    setReportingQuestion(q);
    setReportReason("");
    setReportDetails("");
  };

  const closeReport = () => {
    setReportingQuestion(null);
  };

  const askTutor = async (question: Question, chosenAnswerId: string) => {
    const correctOption = question.answerOptions.find(o => o.isCorrect);
    const chosenOption  = question.answerOptions.find(o => o.id === chosenAnswerId);
    if (!correctOption || !chosenOption) return;

    setTutorLoading(true);
    setTutorExplanation(null);
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionText:  question.questionText,
          correctAnswer: correctOption.text,
          chosenAnswer:  chosenOption.text,
          subject,
          topics:   question.topics,
          childId:  childId ?? undefined,
          ageGroup,
        }),
      });
      const data = await res.json();
      if (res.ok) setTutorExplanation(data.explanation);
      else setTutorExplanation("I couldn't explain that one right now. Try the next question!");
    } catch {
      setTutorExplanation("I couldn't explain that one right now. Try the next question!");
    } finally {
      setTutorLoading(false);
    }
  };

  const submitReport = async () => {
    if (!reportingQuestion || !reportReason) return;
    setReportSubmitting(true);
    try {
      await fetch("/api/questions/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: reportingQuestion.questionId,
          childId: childId ?? undefined,
          subject,
          topics: reportingQuestion.topics,
          reason: reportReason,
          details: reportDetails || undefined,
        }),
      });
      toast.success("Thanks for the feedback! 👍");
      closeReport();
    } catch {
      toast.error("Could not send report. Try again!");
    } finally {
      setReportSubmitting(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${journeyTheme.pageGradient}`}>
        <div className="text-center">
          <Mascot mood="thinking" size="md" className="mb-4" />
          <div className="text-slate-900 font-black text-2xl animate-pulse">Loading questions... ✨</div>
        </div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${journeyTheme.pageGradient}`}>
        <div className={`${journeyTheme.surfaceCard} rounded-3xl p-8 max-w-sm w-full text-center shadow-kid mx-4 border ${journeyTheme.surfaceBorder}`}>
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">No questions yet!</h2>
          <p className="text-gray-500 font-semibold mb-6">Questions for this subject are being added soon. Try Maths or English!</p>
          <button
            onClick={() => router.push("/dashboard")}
            className={`${journeyTheme.primaryButton} w-full`}
          >
            🏠 Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const q = questions[currentIndex];

  // Guard: missing or malformed question — auto-advance past it
  if (!q || !q.questionText || !q.answerOptions?.length) {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
    // If last question is bad, just show nothing — handleNext/handleSkip will submit
    return null;
  }

  const correct = results.filter(r => r.correct).length;
  const attempted = results.length;
  const accuracyPct = attempted ? Math.round((correct / attempted) * 100) : 0;
  const progressPct = ((currentIndex + (isAnswered ? 1 : 0)) / questions.length) * 100;
  const currentQuestionNumber = currentIndex + 1;
  const subjectLabel = subject === "maths" ? "Maths" : subject === "science" ? "Science" : "English";
  const themePreviewLabel = journeyTheme.preset.label;

  const difficultyStars = Array.from({ length: 10 }, (_, i) => i < currentDifficulty ? "⭐" : "☆");

  return (
    <div className={`min-h-screen ${journeyTheme.pageGradient} flex flex-col relative overflow-hidden`}>
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.55),transparent_35%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.35),transparent_28%)]" />
      <div className="absolute inset-0 pointer-events-none opacity-35" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.12), rgba(255,255,255,0.12)), url(${journeyTheme.backgroundImageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundRepeat: "no-repeat",
      }} />
      <div className="relative z-10 max-w-7xl w-full mx-auto px-4 pt-4 sm:pt-5">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative overflow-hidden rounded-[2.2rem] border shadow-2xl ${journeyTheme.surfaceBorder} ${journeyTheme.heroPanel}`}
        >
          <div
            className="absolute inset-0 bg-cover bg-center pointer-events-none"
            style={{ backgroundImage: `url(${journeyTheme.backgroundImageUrl})` }}
          />
          <div className="absolute inset-0 bg-slate-950/68 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/25 via-transparent to-black/20 pointer-events-none" />
          <div className="relative z-10 grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-5 p-5 sm:p-6 lg:p-8 items-center">
            <div className={`flex flex-col sm:flex-row gap-4 sm:gap-5 items-center sm:items-start rounded-[2rem] ${journeyTheme.bannerShell} px-4 py-4 sm:px-5 sm:py-5`}>
              <div className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-[1.75rem] bg-white/20 border border-white/25 shadow-xl flex items-center justify-center text-4xl sm:text-5xl">
                {journeyAvatar}
              </div>
              <div className="flex-1 text-center sm:text-left">
                <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] sm:text-xs font-black uppercase tracking-[0.22em] shadow-sm ${journeyTheme.bannerAccent}`}>
                  {journeyTheme.themeEmoji} {journeyTheme.themeLabel} world
                </div>
                <h1 className={`mt-4 text-3xl sm:text-4xl lg:text-5xl font-black leading-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)] ${journeyTheme.bannerTitle}`}>
                  {subjectLabel} Adventure
                </h1>
                <p className={`mt-2 text-base sm:text-lg font-semibold max-w-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)] ${journeyTheme.bannerText}`}>
                  {journeyTheme.preset.subtitle}. Answer {SESSION_SIZE} questions, collect rewards, and keep the streak alive.
                </p>
                <div className="mt-5 flex flex-wrap gap-2 justify-center sm:justify-start">
                  <span className={`rounded-full px-3 py-1.5 text-sm font-black ${journeyTheme.bannerPill}`}>🎯 {currentQuestionNumber}/{questions.length}</span>
                  <span className={`rounded-full px-3 py-1.5 text-sm font-black ${journeyTheme.bannerPill}`}>📘 {subjectLabel}</span>
                  <span className={`rounded-full px-3 py-1.5 text-sm font-black ${journeyTheme.bannerPill}`}>🔥 {streak} streak</span>
                  <span className={`rounded-full px-3 py-1.5 text-sm font-black ${journeyTheme.bannerPill}`}>{rewardGlyph} {coins}</span>
                </div>
                <div className="mt-6 flex flex-wrap gap-3 justify-center sm:justify-start">
                  <motion.button
                    onClick={() => router.push("/dashboard")}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`rounded-full px-6 py-3.5 text-sm sm:text-base font-black transition-colors ${journeyTheme.bannerPill}`}
                  >
                    ← Exit Adventure
                  </motion.button>
                  <button
                    onClick={() => setShowHint(true)}
                    className={`rounded-full px-6 py-3.5 text-sm sm:text-base font-black shadow-lg hover:scale-[1.01] transition-transform ${journeyTheme.bannerSecondaryButton}`}
                  >
                    💡 Get a Hint
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-[1.9rem] bg-white/90 backdrop-blur-md border border-white/75 shadow-2xl overflow-hidden">
              <div className="grid grid-cols-2 gap-3 p-4">
                <div className="rounded-[1.3rem] bg-sky-50/90 p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-600">This question</p>
                  <p className="mt-1 text-2xl font-black text-slate-800">{currentQuestionNumber}</p>
                  <p className="text-xs font-semibold text-slate-500">of {questions.length}</p>
                </div>
                <div className="rounded-[1.3rem] bg-emerald-50/90 p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-600">Accuracy</p>
                  <p className="mt-1 text-2xl font-black text-slate-800">{accuracyPct}%</p>
                  <p className="text-xs font-semibold text-slate-500">So far</p>
                </div>
                <div className="rounded-[1.3rem] bg-amber-50/90 p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-600">Points</p>
                  <p className="mt-1 text-2xl font-black text-slate-800">{pointsEarned}</p>
                  <p className="text-xs font-semibold text-slate-500">earned</p>
                </div>
                <div className="rounded-[1.3rem] bg-fuchsia-50/90 p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-fuchsia-600">Theme</p>
                  <p className="mt-1 text-lg font-black text-slate-800 leading-tight">{themePreviewLabel}</p>
                  <p className="text-xs font-semibold text-slate-500">style</p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
      {/* ===== TOP BAR ===== */}
      <div className="hidden">
        <div className="max-w-2xl mx-auto">
          {/* Row 1: back + subject + stats */}
          <div className="flex items-center justify-between mb-2 gap-2">
            <motion.button
              onClick={() => router.push("/dashboard")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`${journeyTheme.secondaryButton} rounded-xl px-3 py-1.5 font-bold text-sm flex items-center gap-1 border`}
            >
              ← Exit
            </motion.button>

            <div className="flex items-center gap-2 flex-wrap justify-center px-2">
              <span className="flex items-center gap-2 rounded-full bg-white/75 px-3 py-1 text-xs font-black text-slate-800 shadow-sm border border-white/70">
                <span className="text-lg">{journeyAvatar}</span>
                {journeyTheme.themeLabel}
              </span>
              <span className="text-slate-900 font-black text-lg drop-shadow-sm">
                {subject === "maths" ? "🔢 Maths" : subject === "science" ? "🔬 Science" : "📖 English"}
              </span>
              <span className={`${journeyTheme.badge} rounded-full px-3 py-1 text-xs font-black`}>
                {journeyTheme.preset.emoji} {journeyTheme.preset.label}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Reward points */}
              <div className="rounded-xl px-2.5 py-1 text-slate-900 font-bold text-sm flex items-center gap-1 bg-white/70">
                {rewardGlyph} {pointsEarned}pts
              </div>
              {streak > 1 && (
                <div className="streak-badge">
                  🔥 {streak}
                </div>
              )}
              <div className={`${journeyTheme.badge} reward-counter`}>
                {rewardGlyph} {coins}
              </div>
            </div>
          </div>

          {/* Row 2: progress bar */}
          <div className="flex items-center gap-2">
            <span className="text-slate-700 text-xs font-bold w-16 shrink-0">
              {currentIndex + 1}/{questions.length}
            </span>
            <div className={`flex-1 ${journeyTheme.progressTrack} rounded-full h-5 overflow-hidden border-2 border-white/60`}>
              <div className={journeyTheme.progressFill} style={{ width: `${progressPct}%`, height: "100%" }} />
            </div>
            <span className="text-slate-700 text-xs font-bold w-12 text-right shrink-0">
              ✅ {correct}
            </span>
          </div>

          {/* Difficulty */}
          <div className="flex items-center justify-center mt-1 gap-0.5">
            {difficultyStars.slice(0, 5).map((s, i) => (
              <span key={i} className="text-xs leading-none">{s}</span>
            ))}
            <span className="text-slate-400 text-xs mx-1">|</span>
            {difficultyStars.slice(5).map((s, i) => (
              <span key={i} className="text-xs leading-none">{s}</span>
            ))}
            <span className="text-slate-700 text-xs font-bold ml-1">Lv {currentDifficulty}</span>
          </div>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.9fr)] items-start">
          <div className="flex flex-col gap-4">
        {/* Timer pill */}
        <div className="flex justify-center">
          <div className={`rounded-full px-4 py-1 text-slate-900 font-black text-sm bg-white/75 ${timer > 30 ? "bg-red-200/80" : ""}`}>
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
            <div className={`rounded-[2.9rem] p-1.5 sm:p-2 ${journeyTheme.questionStageShell}`}>
              <div className={`${questionCardClass} overflow-hidden`} style={questionCardBackground}>
              {/* Question header with topic pills */}
              <div className={`${journeyTheme.heroPanelSoft} px-6 pt-5 pb-3`}>
                <div className="flex flex-wrap gap-1.5 mb-3 items-center justify-between">
                  <div className="flex flex-wrap gap-1.5">
                    {(q.topics || []).map(topic => (
                      <span key={topic} className={`topic-pill capitalize ${journeyTheme.questionStageChip}`}>{topic.replace(/-/g, " ")}</span>
                    ))}
                  </div>
                  {/* Report button */}
                  <motion.button
                    onClick={() => openReport(q)}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    className={`flex-shrink-0 text-xs font-semibold flex items-center gap-1 transition-colors ${journeyTheme.questionStageText} hover:text-red-400`}
                    title="Report this question"
                    aria-label="Report question"
                  >
                    🚩 Flag
                  </motion.button>
                </div>

                {/* Question text + TTS */}
                <div className="flex items-start gap-3">
                  <p className={`question-text flex-1 ${journeyTheme.questionStageTitle}`}>{q.questionText}</p>
                  <motion.button
                    onClick={() => speak(q.ttsText || q.questionText)}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.9 }}
                    className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-colors shadow-sm ${journeyTheme.questionStageButton}`}
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
                    <div className={`${journeyTheme.questionStageShell} border-l-4 border-amber-400 rounded-xl p-3 my-2`}>
                      <p className={`${journeyTheme.questionStageText} font-bold text-sm`}>💡 Hint: {q.hint}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Answer Options */}
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(q.answerOptions || []).map((option, idx) => {
                  const isSelected = selectedAnswer === option.id;
                  let cardClass = `answer-card ${journeyTheme.answerOption} ${actionButtonClass}`;
                  let bgClass = "";

                  if (isAnswered) {
                    if (option.isCorrect) {
                      cardClass += " answer-reveal-correct";
                      bgClass = journeyTheme.answerOptionCorrect;
                    } else if (isSelected && !option.isCorrect) {
                      cardClass += " answer-wrong";
                      bgClass = "border-red-400 bg-red-50";
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
                        <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-black text-lg
                          ${isAnswered && option.isCorrect ? "bg-green-400 text-white" :
                            isAnswered && isSelected && !option.isCorrect ? "bg-red-400 text-white" :
                            "bg-gray-100 text-gray-600"}`}
                        >
                          {optionLetters[idx]}
                        </div>

                        {resolveMedia(option.imageUrl, option.emoji) && (
                          <span className="text-3xl flex-shrink-0 leading-none">
                            {resolveMedia(option.imageUrl, option.emoji)}
                          </span>
                        )}

                        <p className={`font-black text-lg flex-1 leading-snug ${journeyTheme.questionStageOptionText}`}>{option.text}</p>

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
                    className="px-4 pb-2"
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

              {/* AI Tutor — "Why?" button (wrong answer only) */}
              <AnimatePresence>
                {isAnswered && !results[results.length - 1]?.correct && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-4 pb-4"
                  >
                    {!tutorExplanation && (
                      <motion.button
                        onClick={() => askTutor(q, selectedAnswer || "")}
                        disabled={tutorLoading || !selectedAnswer}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-200 text-indigo-700 font-black text-sm transition-all disabled:opacity-50"
                      >
                        {tutorLoading ? (
                          <><div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /> Thinking...</>
                        ) : (
                          <>💬 Why is that the answer?</>
                        )}
                      </motion.button>
                    )}

                    {tutorExplanation && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-3"
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-2xl flex-shrink-0">🤖</span>
                          <p className="text-indigo-800 font-semibold text-sm leading-relaxed">{tutorExplanation}</p>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              {!isAnswered ? (
                <>
                  <motion.button
                    onClick={() => setShowHint(!showHint)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.95 }}
                    className={`${journeyTheme.primaryButton} ${actionButtonClass} flex-1 font-black py-3.5 px-4 transition-all text-base`}
                    aria-label="Show hint"
                  >
                    💡 {showHint ? "Hide Hint" : "Get Hint"}
                  </motion.button>
                  <motion.button
                    onClick={handleSkip}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.95 }}
                    className={`${journeyTheme.secondaryButton} ${actionButtonClass} flex-1 font-bold py-3.5 px-4 transition-all text-base border`}
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
                  className={`${journeyTheme.primaryButton} ${actionButtonClass} w-full font-black text-xl py-4 transition-all flex items-center justify-center gap-2`}
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

          <aside className="space-y-4 xl:sticky xl:top-28">
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-[2rem] p-5 sm:p-6 border shadow-kid ${journeyTheme.surfaceCard} ${journeyTheme.surfaceBorder}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Journey guide</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-800">Your learning world</h2>
                </div>
                <span className={`${journeyTheme.badge} rounded-full px-3 py-1 text-xs font-black`}>
                  {journeyTheme.preset.emoji} {themePreviewLabel}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-sky-50 p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-600">Streak</p>
                  <p className="mt-1 text-2xl font-black text-slate-800">{streak}</p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-600">Coins</p>
                  <p className="mt-1 text-2xl font-black text-slate-800">{coins}</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-600">Correct</p>
                  <p className="mt-1 text-2xl font-black text-slate-800">{correct}</p>
                </div>
                <div className="rounded-2xl bg-fuchsia-50 p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-fuchsia-600">Lv</p>
                  <p className="mt-1 text-2xl font-black text-slate-800">{currentDifficulty}</p>
                </div>
              </div>
              <div className="mt-4 rounded-[1.5rem] overflow-hidden border border-white/70">
                <div
                  className="h-40 bg-cover bg-center"
                  style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.2), rgba(255,255,255,0.2)), url(${journeyTheme.backgroundImageUrl})`,
                  }}
                />
                <div className={`p-4 ${journeyTheme.heroPanelSoft}`}>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Theme choices</p>
                  <p className="mt-1 text-lg font-black text-slate-800">{journeyTheme.preset.subtitle}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-600">This world also flows into the question card, buttons, and progress strip.</p>
                </div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-[2rem] p-5 sm:p-6 border shadow-kid ${journeyTheme.surfaceCard} ${journeyTheme.surfaceBorder}`}
            >
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Helpful actions</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(q.topics || []).map(topic => (
                  <span key={topic} className={`rounded-full px-3 py-1.5 text-sm font-black capitalize ${journeyTheme.chip}`}>
                    {topic.replace(/-/g, " ")}
                  </span>
                ))}
              </div>
              <div className="mt-4 grid gap-3">
                <button
                  onClick={() => openReport(q)}
                  className="w-full rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-left font-black text-red-700 hover:bg-red-100 transition-colors"
                >
                  🚩 Flag this question
                </button>
                <button
                  onClick={() => speak(q.ttsText || q.questionText)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left font-black ${journeyTheme.secondaryButton}`}
                >
                  🔊 Read aloud again
                </button>
                <button
                  onClick={() => router.push("/dashboard")}
                  className={`w-full rounded-2xl border px-4 py-3 text-left font-black ${journeyTheme.secondaryButton}`}
                >
                  🏠 Back to dashboard
                </button>
              </div>
            </motion.section>
          </aside>
        </div>
      </div>

      {/* ===== REPORT QUESTION MODAL ===== */}
      <AnimatePresence>
        {reportingQuestion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={closeReport}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.3 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-kid"
            >
              <h3 className="text-xl font-black text-gray-800 mb-1">🚩 Report Question</h3>
              <p className="text-gray-400 text-sm font-semibold mb-4 line-clamp-2">
                &ldquo;{reportingQuestion.questionText.slice(0, 80)}&rdquo;
              </p>

              {/* Reason buttons */}
              <div className="flex flex-col gap-2 mb-4">
                {REPORT_REASONS.map(reason => (
                  <button
                    key={reason}
                    onClick={() => setReportReason(reason)}
                    className={`text-left px-4 py-2.5 rounded-2xl font-bold text-sm transition-all border-2 ${
                      reportReason === reason
                        ? "border-red-400 bg-red-50 text-red-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              {/* Optional details */}
              <textarea
                value={reportDetails}
                onChange={e => setReportDetails(e.target.value)}
                placeholder="Extra details (optional)..."
                rows={2}
                className="w-full border-2 border-gray-200 rounded-2xl px-3 py-2 text-sm font-semibold text-gray-700 resize-none focus:outline-none focus:border-purple-300 mb-4"
              />

              <div className="flex gap-3">
                <button
                  onClick={closeReport}
                  className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={submitReport}
                  disabled={!reportReason || reportSubmitting}
                  className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 disabled:opacity-40 font-black text-white transition-all"
                >
                  {reportSubmitting ? "Sending..." : "Send Report"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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

