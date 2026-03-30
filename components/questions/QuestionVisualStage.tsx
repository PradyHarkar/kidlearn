"use client";

import { motion } from "framer-motion";
import type { Question, ChildThemeKey, AgeGroup } from "@/types";
import type { ThemeJourneyTokens } from "@/lib/services/tile-themes";
import { buildQuestionVisualProfile } from "@/lib/services/question-visuals";
import { TapCountStage } from "./TapCountStage";
import { DotJoinStage } from "./DotJoinStage";
import { AnimatedStoryStage } from "./AnimatedStoryStage";
import { MatchPairsStage } from "./MatchPairsStage";

interface QuestionVisualStageProps {
  question: Question;
  theme: ThemeJourneyTokens;
  themeKey: ChildThemeKey;
  favoriteTags?: string[];
  /** Called by interactive stages when the child's action implies an answer value */
  onInteractionAnswer?: (value: string | number) => void;
}

function isEarlyYears(ageGroup?: AgeGroup | string): boolean {
  return !!ageGroup && ["foundation", "year1", "year2", "prep"].includes(ageGroup);
}

export function QuestionVisualStage({ question, theme, themeKey, favoriteTags, onInteractionAnswer }: QuestionVisualStageProps) {
  const profile = buildQuestionVisualProfile(question, { themeKey, favoriteTags });
  const early = isEarlyYears(question.ageGroup ?? question.yearLevel);

  // ── Match-pairs questions ──────────────────────────────────────────────────
  if (profile.mode === "match-pairs") {
    return (
      <MatchPairsStage
        question={question}
        theme={theme}
        themeKey={themeKey}
        onAllMatched={() => onInteractionAnswer?.("matched")}
      />
    );
  }

  // ── Shape questions → dot-join (any age) ───────────────────────────────────
  if (profile.mode === "shape-dots") {
    return (
      <DotJoinStage
        question={question}
        theme={theme}
        themeKey={themeKey}
        onShapeCompleted={(shape) => onInteractionAnswer?.(shape)}
      />
    );
  }

  // ── Early years counting/addition → tap-count or animated story ────────────
  if (profile.mode === "counting-scene" && early) {
    const text = question.questionText.toLowerCase();
    const isWordProblem = /(she|he|they|sam|mia|tim|has|had|picks|gives|finds|brings)/.test(text);

    if (isWordProblem) {
      return (
        <AnimatedStoryStage
          question={question}
          theme={theme}
          themeKey={themeKey}
          onReady={() => {
            // AnimatedStory is watch-and-answer; doesn't pre-fill — just signals ready
          }}
        />
      );
    }

    return (
      <TapCountStage
        question={question}
        theme={theme}
        themeKey={themeKey}
        favoriteTags={favoriteTags}
        onCountConfirmed={(count) => onInteractionAnswer?.(count)}
      />
    );
  }

  // ── All other modes → static decorative stage ──────────────────────────────
  const overlayClass = themeKey === "space"
    ? "bg-slate-950/55 text-white"
    : "bg-white/70 text-slate-900";

  return (
    <div className={`relative overflow-hidden rounded-[2rem] border ${theme.questionStageShell} mb-4`}>
      <div
        className="absolute inset-0 bg-cover bg-center opacity-55"
        style={{ backgroundImage: `linear-gradient(rgba(15,23,42,0.18), rgba(15,23,42,0.12)), url(${theme.backgroundImageUrl})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-white/35 via-white/12 to-white/10" />
      <div className="relative grid gap-4 lg:grid-cols-[1.2fr_0.9fr] p-4 sm:p-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className={`rounded-[1.7rem] p-4 sm:p-5 shadow-xl backdrop-blur-md ${overlayClass}`}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl sm:text-4xl">{profile.accentEmoji}</span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] opacity-75">{profile.title}</p>
              <p className="mt-1 text-sm sm:text-base font-semibold opacity-85">{profile.subtitle}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {profile.counters.map((counter) => (
              <span
                key={counter.label}
                className={`rounded-full px-3 py-1.5 text-xs sm:text-sm font-black ${theme.questionStageChip}`}
              >
                {counter.label}: {counter.value}
              </span>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {profile.sceneItems.map((item, index) => (
              <motion.div
                key={`${item}-${index}`}
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2.8 + index * 0.2, repeat: Infinity, ease: "easeInOut" }}
                className="rounded-2xl bg-white/80 border border-white/90 shadow-md px-3 py-4 text-center"
              >
                <div className="text-2xl sm:text-3xl leading-none">{item}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="rounded-[1.7rem] p-4 sm:p-5 backdrop-blur-md bg-white/72 border border-white/80 shadow-xl flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className={`text-xs font-black uppercase tracking-[0.24em] ${theme.questionStageText}`}>Visual clue</p>
              <p className={`mt-1 text-lg font-black ${theme.questionStageTitle}`}>{profile.primaryLabel}</p>
            </div>
            <span className="text-3xl">{profile.secondaryEmoji}</span>
          </div>

          <div className="mt-4 rounded-[1.35rem] border border-dashed border-slate-300/80 bg-white/65 p-4">
            <p className={`text-sm font-semibold ${theme.questionStageText}`}>
              This scene matches the question and stays age-appropriate for the child&apos;s level.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {question.answerOptions.slice(0, 4).map((option, index) => (
                <div key={`${option.id}-${index}`} className="rounded-2xl bg-slate-50/90 border border-slate-200 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-black">Choice {index + 1}</p>
                  <p className="mt-1 text-sm font-bold text-slate-700 max-h-12 overflow-hidden">{option.text}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
