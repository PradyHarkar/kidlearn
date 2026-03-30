"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Question, ChildThemeKey, MatchPairsData } from "@/types";
import type { ThemeJourneyTokens } from "@/lib/services/tile-themes";

interface MatchPairsStageProps {
  question: Question;
  theme: ThemeJourneyTokens;
  themeKey: ChildThemeKey;
  onAllMatched: () => void;
}

interface Pair {
  left: string;
  right: string;
  leftEmoji?: string;
  rightEmoji?: string;
}

function parsePairs(question: Question): { pairs: Pair[]; instruction: string } {
  const raw = question.generationMetadata?.interactionData as MatchPairsData | undefined;
  if (raw?.type === "match-pairs" && raw.pairs?.length) {
    return {
      pairs: raw.pairs,
      instruction: raw.instruction ?? "Match each item on the left to the right",
    };
  }
  // Fallback: build pairs from answer options (treat correct option as the single match)
  return {
    pairs: [],
    instruction: "Match the following",
  };
}

/** Fisher-Yates shuffle (client-side) so the right column order varies */
function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function MatchPairsStage({ question, theme, onAllMatched }: MatchPairsStageProps) {
  const { pairs, instruction } = parsePairs(question);

  // Shuffled right-side items with stable indices
  const [rightOrder] = useState<number[]>(() => shuffleArr(pairs.map((_, i) => i)));

  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [selectedRight, setSelectedRight] = useState<number | null>(null);
  // matched[leftIndex] = rightIndex
  const [matched, setMatched] = useState<Record<number, number>>({});
  const [wrong, setWrong] = useState<{ left: number; right: number } | null>(null);
  const [done, setDone] = useState(false);

  const matchedLeftSet = new Set(Object.keys(matched).map(Number));
  const matchedRightSet = new Set(Object.values(matched));

  const handleLeftTap = useCallback((leftIdx: number) => {
    if (matchedLeftSet.has(leftIdx)) return;
    setSelectedLeft(leftIdx);
    setWrong(null);
  }, [matchedLeftSet]);

  const handleRightTap = useCallback((rightOrigIdx: number) => {
    if (matchedRightSet.has(rightOrigIdx)) return;
    if (selectedLeft === null) {
      // select right first — allow it
      setSelectedRight(rightOrigIdx);
      return;
    }

    const leftIdx = selectedLeft;
    const rightIdx = rightOrigIdx;

    if (leftIdx === rightIdx) {
      // Correct match!
      const next = { ...matched, [leftIdx]: rightIdx };
      setMatched(next);
      setSelectedLeft(null);
      setSelectedRight(null);
      setWrong(null);

      if (Object.keys(next).length === pairs.length) {
        setDone(true);
        setTimeout(() => onAllMatched(), 900);
      }
    } else {
      // Wrong
      setWrong({ left: leftIdx, right: rightIdx });
      setTimeout(() => {
        setWrong(null);
        setSelectedLeft(null);
        setSelectedRight(null);
      }, 700);
    }
  }, [selectedLeft, matched, matchedRightSet, pairs.length, onAllMatched]);

  // Also handle when right is selected first
  const handleRightFirst = useCallback((rightOrigIdx: number) => {
    if (matchedRightSet.has(rightOrigIdx)) return;
    if (selectedLeft !== null) {
      handleRightTap(rightOrigIdx);
    } else {
      setSelectedRight(rightOrigIdx);
      setWrong(null);
    }
  }, [matchedRightSet, selectedLeft, handleRightTap]);

  const handleLeftAfterRight = useCallback((leftIdx: number) => {
    if (matchedLeftSet.has(leftIdx)) return;
    if (selectedRight !== null) {
      // treat selectedRight as the right tap
      const leftI = leftIdx;
      const rightI = selectedRight;
      if (leftI === rightI) {
        const next = { ...matched, [leftI]: rightI };
        setMatched(next);
        setSelectedLeft(null);
        setSelectedRight(null);
        setWrong(null);
        if (Object.keys(next).length === pairs.length) {
          setDone(true);
          setTimeout(() => onAllMatched(), 900);
        }
      } else {
        setWrong({ left: leftI, right: rightI });
        setTimeout(() => {
          setWrong(null);
          setSelectedLeft(null);
          setSelectedRight(null);
        }, 700);
      }
    } else {
      setSelectedLeft(leftIdx);
      setWrong(null);
    }
  }, [matchedLeftSet, selectedRight, matched, pairs.length, onAllMatched]);

  if (!pairs.length) return null;

  return (
    <div className={`relative overflow-hidden rounded-[2rem] border ${theme.questionStageShell} mb-4 p-4 sm:p-5`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-3xl">🔗</span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] opacity-70">Match It Up</p>
          <p className="text-sm font-semibold opacity-85 mt-0.5">{instruction}</p>
        </div>
        <div className="ml-auto rounded-full bg-white/80 px-3 py-1 text-xs font-black text-gray-600">
          {Object.keys(matched).length}/{pairs.length} matched
        </div>
      </div>

      {/* Pairs grid */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
        {/* Left column */}
        <div className="flex flex-col gap-2.5">
          {pairs.map((pair, leftIdx) => {
            const isMatched = matchedLeftSet.has(leftIdx);
            const isSelected = selectedLeft === leftIdx;
            const isWrong = wrong?.left === leftIdx;

            return (
              <motion.button
                key={`left-${leftIdx}`}
                onClick={() => selectedRight !== null ? handleLeftAfterRight(leftIdx) : handleLeftTap(leftIdx)}
                disabled={isMatched}
                whileHover={!isMatched ? { scale: 1.03 } : {}}
                whileTap={!isMatched ? { scale: 0.96 } : {}}
                animate={isWrong ? { x: [-6, 6, -4, 4, 0] } : {}}
                transition={isWrong ? { duration: 0.35 } : {}}
                className={[
                  "flex items-center gap-2 rounded-2xl px-3 py-3 text-sm font-black text-left transition-all border-2",
                  isMatched
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700 opacity-70"
                    : isWrong
                    ? "bg-red-50 border-red-400 text-red-700"
                    : isSelected
                    ? `${theme.chipSelected} border-transparent`
                    : `bg-white/80 border-white/60 hover:border-indigo-300 text-gray-800`,
                ].join(" ")}
              >
                {pair.leftEmoji && <span className="text-xl shrink-0">{pair.leftEmoji}</span>}
                <span className="leading-tight">{pair.left}</span>
                {isMatched && <span className="ml-auto text-emerald-500">✓</span>}
              </motion.button>
            );
          })}
        </div>

        {/* Centre connector lines (decorative) */}
        <div className="flex flex-col gap-2.5 items-center">
          {pairs.map((_, leftIdx) => {
            const isMatched = matchedLeftSet.has(leftIdx);
            return (
              <div key={`line-${leftIdx}`} className="flex items-center justify-center" style={{ height: 48 }}>
                <AnimatePresence>
                  {isMatched ? (
                    <motion.div
                      initial={{ scaleX: 0, opacity: 0 }}
                      animate={{ scaleX: 1, opacity: 1 }}
                      className="h-0.5 w-8 bg-emerald-400 rounded-full"
                    />
                  ) : (
                    <div className="h-0.5 w-6 bg-gray-200 rounded-full" />
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Right column (shuffled) */}
        <div className="flex flex-col gap-2.5">
          {rightOrder.map((origIdx) => {
            const pair = pairs[origIdx];
            const isMatched = matchedRightSet.has(origIdx);
            const isSelected = selectedRight === origIdx;
            const isWrong = wrong?.right === origIdx;

            return (
              <motion.button
                key={`right-${origIdx}`}
                onClick={() => handleRightFirst(origIdx)}
                disabled={isMatched}
                whileHover={!isMatched ? { scale: 1.03 } : {}}
                whileTap={!isMatched ? { scale: 0.96 } : {}}
                animate={isWrong ? { x: [-6, 6, -4, 4, 0] } : {}}
                transition={isWrong ? { duration: 0.35 } : {}}
                className={[
                  "flex items-center gap-2 rounded-2xl px-3 py-3 text-sm font-black text-left transition-all border-2",
                  isMatched
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700 opacity-70"
                    : isWrong
                    ? "bg-red-50 border-red-400 text-red-700"
                    : isSelected
                    ? `${theme.chipSelected} border-transparent`
                    : `bg-white/80 border-white/60 hover:border-indigo-300 text-gray-800`,
                ].join(" ")}
              >
                {pair.rightEmoji && <span className="text-xl shrink-0">{pair.rightEmoji}</span>}
                <span className="leading-tight">{pair.right}</span>
                {isMatched && <span className="ml-auto text-emerald-500">✓</span>}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Hint text */}
      {!done && (
        <p className="mt-4 text-center text-xs font-semibold text-gray-400">
          Tap one on the left, then one on the right to match them
        </p>
      )}

      {/* Done celebration */}
      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="mt-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 px-4 py-3 text-center"
          >
            <p className="text-lg font-black text-emerald-700">🎉 Perfect match! Now pick your answer ↓</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
