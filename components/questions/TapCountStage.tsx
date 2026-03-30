"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Question, ChildThemeKey } from "@/types";
import type { ThemeJourneyTokens } from "@/lib/services/tile-themes";
import { buildQuestionVisualProfile } from "@/lib/services/question-visuals";

interface TapCountStageProps {
  question: Question;
  theme: ThemeJourneyTokens;
  themeKey: ChildThemeKey;
  favoriteTags?: string[];
  onCountConfirmed: (count: number) => void;
}

function extractNumbers(text: string): number[] {
  return (text.match(/\b\d+\b/g) ?? []).map(Number).filter(Number.isFinite);
}

export function TapCountStage({ question, theme, themeKey, favoriteTags, onCountConfirmed }: TapCountStageProps) {
  const profile = buildQuestionVisualProfile(question, { themeKey, favoriteTags });
  const numbers = extractNumbers(question.questionText);
  const group1 = numbers[0] ?? 2;
  const group2 = numbers[1] ?? 3;
  const totalObjects = Math.min(group1 + group2, 12);

  const [tapped, setTapped] = useState<Set<number>>(new Set());
  const [confirmed, setConfirmed] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const toggle = useCallback((i: number) => {
    if (confirmed) return;
    setTapped(prev => {
      const next = new Set(prev);
      if (next.has(i)) { next.delete(i); } else { next.add(i); }
      return next;
    });
  }, [confirmed]);

  useEffect(() => {
    if (tapped.size === totalObjects && !confirmed) {
      setConfirmed(true);
      setShowCelebration(true);
      const timer = setTimeout(() => {
        onCountConfirmed(tapped.size);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [tapped.size, totalObjects, confirmed, onCountConfirmed]);

  const objects = Array.from({ length: totalObjects }, (_, i) => i);
  const isTapped = (i: number) => tapped.has(i);
  const countLabel = tapped.size === 0
    ? "Tap each one to count!"
    : tapped.size === totalObjects
    ? `You counted ${tapped.size}! 🎉`
    : `${tapped.size} of ${totalObjects} counted`;

  return (
    <div className={`relative overflow-hidden rounded-[2rem] border ${theme.questionStageShell} mb-4 p-4 sm:p-5`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{profile.accentEmoji}</span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] opacity-70">Touch &amp; Count</p>
          <p className="text-sm font-semibold opacity-85 mt-0.5">Tap every {profile.accentEmoji} to count them all</p>
        </div>
        <div className="ml-auto">
          <motion.div
            animate={{ scale: confirmed ? [1, 1.15, 1] : 1 }}
            transition={{ duration: 0.4 }}
            className={`rounded-full px-3 py-1.5 text-sm font-black ${theme.questionStageChip}`}
          >
            {tapped.size} / {totalObjects}
          </motion.div>
        </div>
      </div>

      {/* Object grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 sm:gap-3">
        {objects.map((i) => (
          <motion.button
            key={i}
            onClick={() => toggle(i)}
            whileTap={{ scale: 0.88 }}
            animate={isTapped(i)
              ? { scale: [1, 1.28, 1], backgroundColor: "rgba(99,102,241,0.18)" }
              : { scale: 1, backgroundColor: "rgba(255,255,255,0.75)" }
            }
            transition={{ duration: 0.25 }}
            aria-label={`Object ${i + 1}${isTapped(i) ? ", counted" : ""}`}
            aria-pressed={isTapped(i)}
            className="relative flex items-center justify-center rounded-2xl border border-white/80 shadow-md"
            style={{ minHeight: 56, minWidth: 44 }}
          >
            <span className="text-2xl sm:text-3xl select-none leading-none">
              {profile.accentEmoji}
            </span>
            <AnimatePresence>
              {isTapped(i) && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] font-black flex items-center justify-center shadow"
                >
                  ✓
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </div>

      {/* Counter label */}
      <motion.p
        animate={{ opacity: 1 }}
        key={countLabel}
        initial={{ opacity: 0, y: 4 }}
        className="mt-4 text-center text-sm font-black opacity-80"
      >
        {countLabel}
      </motion.p>

      {/* Progress bar */}
      <div className="mt-3 h-2 rounded-full bg-white/30 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${theme.progressFill}`}
          animate={{ width: `${(tapped.size / totalObjects) * 100}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
        />
      </div>

      {/* Celebration overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center rounded-[2rem] bg-white/40 backdrop-blur-sm"
          >
            <div className="text-center">
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6 }}
                className="text-5xl"
              >
                🎉
              </motion.div>
              <p className="mt-2 text-lg font-black text-indigo-700">
                {totalObjects} — well done!
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
