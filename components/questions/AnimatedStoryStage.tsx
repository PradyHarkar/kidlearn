"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Question, ChildThemeKey, CountingSceneData } from "@/types";
import type { ThemeJourneyTokens } from "@/lib/services/tile-themes";
import { buildQuestionVisualProfile } from "@/lib/services/question-visuals";

type Phase = "idle" | "act1" | "pause" | "act2" | "join" | "ready";

interface AnimatedStoryStageProps {
  question: Question;
  theme: ThemeJourneyTokens;
  themeKey: ChildThemeKey;
  favoriteTags?: string[];
  onReady: () => void;
}

function extractNumbers(text: string): number[] {
  return (text.match(/\b\d+\b/g) ?? []).map(Number).filter(Number.isFinite);
}

function parseInteractionData(question: Question, themeKey?: ChildThemeKey, favoriteTags?: string[]): { objectEmoji: string; act1Count: number; act2Count: number; setting: string } {
  const raw = question.generationMetadata?.interactionData as CountingSceneData | undefined;
  if (raw && raw.type === "counting-scene") {
    return {
      objectEmoji: raw.objectEmoji ?? "🍎",
      act1Count:   raw.act1Count ?? 2,
      act2Count:   raw.act2Count ?? 3,
      setting:     raw.setting  ?? "",
    };
  }
  // Fall back to number extraction + visual profile emoji
  const profile = buildQuestionVisualProfile(question, { themeKey, favoriteTags });
  const nums = extractNumbers(question.questionText);
  return {
    objectEmoji: profile.accentEmoji,
    act1Count:   nums[0] ?? 2,
    act2Count:   nums[1] ?? 3,
    setting:     "",
  };
}

const PHASE_TIMINGS: Partial<Record<Phase, number>> = {
  act1:  1200,
  pause: 800,
  act2:  1200,
  join:  600,
};

export function AnimatedStoryStage({ question, theme, themeKey, favoriteTags, onReady }: AnimatedStoryStageProps) {
  const { objectEmoji, act1Count, act2Count } = parseInteractionData(question, themeKey, favoriteTags);
  const totalCount = act1Count + act2Count;

  const [phase, setPhase] = useState<Phase>("idle");
  const [hasPlayed, setHasPlayed] = useState(false);

  const advancePhase = useCallback((from: Phase) => {
    const seq: Phase[] = ["act1", "pause", "act2", "join", "ready"];
    const idx = seq.indexOf(from);
    if (idx === -1 || idx === seq.length - 1) return;
    const next = seq[idx + 1];
    const delay = PHASE_TIMINGS[from] ?? 0;
    setTimeout(() => {
      setPhase(next);
      advancePhase(next);
    }, delay);
  }, []);

  const play = useCallback(() => {
    setPhase("act1");
    setHasPlayed(true);
    advancePhase("act1");
  }, [advancePhase]);

  useEffect(() => {
    if (phase === "ready") {
      onReady();
    }
  }, [phase, onReady]);

  const group1 = Array.from({ length: Math.max(1, act1Count) }, (_, i) => i);
  const group2 = Array.from({ length: Math.max(1, act2Count) }, (_, i) => i);

  const showGroup1 = ["act1", "pause", "act2", "join", "ready"].includes(phase);
  const showGroup2 = ["act2", "join", "ready"].includes(phase);
  const joined     = ["join", "ready"].includes(phase);
  const isReady    = phase === "ready";

  const objectVariants = {
    hidden:  { opacity: 0, y: 30, scale: 0.6 },
    visible: { opacity: 1, y: 0,  scale: 1   },
  };

  return (
    <div className={`relative overflow-hidden rounded-[2rem] border ${theme.questionStageShell} mb-4 p-4 sm:p-5`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">🎬</span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] opacity-70">Watch &amp; Count</p>
          <p className="text-sm font-semibold opacity-85 mt-0.5">Watch the scene, then count how many there are</p>
        </div>
      </div>

      {/* Stage */}
      <div className="relative rounded-2xl bg-white/70 border border-white/80 shadow-inner overflow-hidden"
           style={{ minHeight: 130 }}>
        {/* Idle state — play button */}
        <AnimatePresence>
          {phase === "idle" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            >
              <motion.button
                onClick={play}
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.93 }}
                className={`flex items-center gap-2 px-6 py-3 rounded-full text-white font-black text-base shadow-lg ${theme.primaryButton}`}
              >
                ▶ Watch the story
              </motion.button>
              <p className="text-xs opacity-60 font-semibold">See the objects come together</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Animation scene */}
        {phase !== "idle" && (
          <div className="flex items-center justify-center gap-3 flex-wrap px-4 py-5 min-h-[130px]">
            {/* Group 1 */}
            <div className={`flex flex-wrap gap-2 justify-center transition-all duration-500 ${joined ? "mr-0" : "mr-2"}`}>
              {showGroup1 && group1.map((i) => (
                <motion.div
                  key={`g1-${i}`}
                  variants={objectVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ duration: 0.35, delay: i * 0.12 }}
                  className="rounded-2xl bg-white shadow-md border border-white/90 px-2.5 py-2.5 flex items-center justify-center"
                  style={{ minWidth: 44, minHeight: 44 }}
                >
                  <span className="text-2xl leading-none select-none">{objectEmoji}</span>
                </motion.div>
              ))}
            </div>

            {/* Plus sign */}
            <AnimatePresence>
              {showGroup2 && !joined && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="text-2xl font-black opacity-70 mx-1"
                >
                  ➕
                </motion.span>
              )}
            </AnimatePresence>

            {/* Group 2 */}
            <div className="flex flex-wrap gap-2 justify-center">
              {showGroup2 && group2.map((i) => (
                <motion.div
                  key={`g2-${i}`}
                  variants={objectVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ duration: 0.35, delay: i * 0.12 }}
                  className="rounded-2xl bg-white shadow-md border border-white/90 px-2.5 py-2.5 flex items-center justify-center"
                  style={{ minWidth: 44, minHeight: 44 }}
                >
                  <span className="text-2xl leading-none select-none">{objectEmoji}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Group count badges below scene */}
        {showGroup1 && phase !== "idle" && (
          <div className="flex items-center justify-center gap-3 pb-3 px-4">
            <AnimatePresence>
              {["pause", "act2", "join", "ready"].includes(phase) && (
                <motion.span
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-full px-3 py-1 text-xs font-black ${theme.questionStageChip}`}
                >
                  {act1Count} here
                </motion.span>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {["act2", "join", "ready"].includes(phase) && (
                <motion.span
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-full px-3 py-1 text-xs font-black ${theme.questionStageChip}`}
                >
                  {act2Count} more
                </motion.span>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {isReady && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-full px-3 py-1 text-xs font-black bg-indigo-100 text-indigo-700"
                >
                  = {totalCount} altogether!
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer: ready cue or replay */}
      <div className="mt-3 flex items-center justify-between">
        <AnimatePresence>
          {isReady && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm font-black text-indigo-700"
            >
              Now pick your answer below ↓
            </motion.p>
          )}
        </AnimatePresence>

        {hasPlayed && (
          <button
            onClick={play}
            className="ml-auto text-xs font-semibold opacity-60 hover:opacity-100 underline"
          >
            ▶ Replay
          </button>
        )}
      </div>
    </div>
  );
}
