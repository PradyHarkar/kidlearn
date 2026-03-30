"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Question, ChildThemeKey } from "@/types";
import type { ThemeJourneyTokens } from "@/lib/services/tile-themes";

interface Point { x: number; y: number; }
interface Dot { id: number; x: number; y: number; label: string; }

interface DotJoinStageProps {
  question: Question;
  theme: ThemeJourneyTokens;
  themeKey: ChildThemeKey;
  onShapeCompleted: (shape: string) => void;
}

// Dot layouts per shape (0–100 coordinate space within a 300×200 viewBox)
const SHAPE_DOTS: Record<string, Array<{ x: number; y: number }>> = {
  triangle:  [{ x: 150, y: 25 }, { x: 270, y: 175 }, { x: 30,  y: 175 }],
  square:    [{ x: 50,  y: 35 }, { x: 250, y: 35 }, { x: 250, y: 175 }, { x: 50,  y: 175 }],
  rectangle: [{ x: 25,  y: 60 }, { x: 275, y: 60 }, { x: 275, y: 150 }, { x: 25,  y: 150 }],
  pentagon:  [
    { x: 150, y: 20  },
    { x: 272, y: 104 },
    { x: 224, y: 183 },
    { x: 76,  y: 183 },
    { x: 28,  y: 104 },
  ],
  hexagon:   [
    { x: 150, y: 20  },
    { x: 260, y: 78  },
    { x: 260, y: 138 },
    { x: 150, y: 185 },
    { x: 40,  y: 138 },
    { x: 40,  y: 78  },
  ],
  circle:    [{ x: 150, y: 20 }, { x: 280, y: 105 }, { x: 150, y: 185 }, { x: 20, y: 105 }],
};

const SHAPE_COLOURS: Record<string, string> = {
  triangle:  "rgba(99,102,241,0.20)",
  square:    "rgba(16,185,129,0.20)",
  rectangle: "rgba(245,158,11,0.20)",
  pentagon:  "rgba(239,68,68,0.20)",
  hexagon:   "rgba(168,85,247,0.20)",
  circle:    "rgba(59,130,246,0.20)",
};

const SHAPE_STROKE: Record<string, string> = {
  triangle:  "#6366f1",
  square:    "#10b981",
  rectangle: "#f59e0b",
  pentagon:  "#ef4444",
  hexagon:   "#a855f7",
  circle:    "#3b82f6",
};

function extractShape(text: string): string {
  const match = /(triangle|square|rectangle|circle|hexagon|pentagon)/i.exec(text);
  return match ? match[1].toLowerCase() : "triangle";
}

function buildDots(shape: string): Dot[] {
  const coords = SHAPE_DOTS[shape] ?? SHAPE_DOTS.triangle;
  return coords.map((p, i) => ({ id: i + 1, x: p.x, y: p.y, label: String(i + 1) }));
}

function dist(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function DotJoinStage({ question, theme, onShapeCompleted }: DotJoinStageProps) {
  const shape = extractShape(question.questionText);
  const dots = buildDots(shape);
  const totalDots = dots.length;
  const stroke = SHAPE_STROKE[shape] ?? "#6366f1";
  const fillColour = SHAPE_COLOURS[shape] ?? "rgba(99,102,241,0.20)";

  const [tappedSequence, setTappedSequence] = useState<number[]>([]);
  const [completed, setCompleted] = useState(false);
  const [wrongTap, setWrongTap] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const nextExpected = tappedSequence.length + 1; // dots are 1-indexed

  const handleDotTap = useCallback((dotId: number) => {
    if (completed) return;

    if (dotId === nextExpected) {
      const newSeq = [...tappedSequence, dotId];
      setTappedSequence(newSeq);

      if (newSeq.length === totalDots) {
        setCompleted(true);
        setTimeout(() => onShapeCompleted(shape), 800);
      }
    } else {
      // Wrong order — flash the dot red, then reset if they tapped a non-next dot
      setWrongTap(dotId);
      setTimeout(() => setWrongTap(null), 500);
      // Only reset if they already started (to avoid penalising first tap of wrong dot)
      if (tappedSequence.length > 0) {
        setTimeout(() => setTappedSequence([]), 500);
      }
    }
  }, [completed, nextExpected, tappedSequence, totalDots, shape, onShapeCompleted]);

  // Build SVG lines between tapped dots in order
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  for (let i = 1; i < tappedSequence.length; i++) {
    const from = dots[tappedSequence[i - 1] - 1];
    const to   = dots[tappedSequence[i] - 1];
    if (from && to) lines.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y });
  }
  // Closing line when shape is complete
  if (completed && tappedSequence.length === totalDots) {
    const last  = dots[tappedSequence[totalDots - 1] - 1];
    const first = dots[0];
    if (last && first) lines.push({ x1: last.x, y1: last.y, x2: first.x, y2: first.y });
  }

  // Build SVG polygon points for fill when complete
  const polygonPoints = completed
    ? dots.map(d => `${d.x},${d.y}`).join(" ")
    : "";

  const statusLabel = completed
    ? `You made a ${shape}! 🎉`
    : tappedSequence.length === 0
    ? `Tap dot 1 to start!`
    : `Now tap dot ${nextExpected}`;

  const DOT_RADIUS = 22; // ≥ 44px touch target via r + padding

  return (
    <div className={`relative overflow-hidden rounded-[2rem] border ${theme.questionStageShell} mb-4 p-4 sm:p-5`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">✏️</span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] opacity-70">Join the Dots</p>
          <p className="text-sm font-semibold opacity-85 mt-0.5">
            Tap the numbered dots in order to draw a <span className="font-black">{shape}</span>
          </p>
        </div>
        <div className="ml-auto">
          <span className={`rounded-full px-3 py-1.5 text-xs font-black ${theme.questionStageChip}`}>
            {tappedSequence.length}/{totalDots}
          </span>
        </div>
      </div>

      {/* SVG canvas */}
      <div className="relative rounded-2xl bg-white/70 border border-white/80 shadow-inner overflow-hidden"
           style={{ aspectRatio: "3/2", maxHeight: 220 }}>
        <svg
          ref={svgRef}
          viewBox="0 0 300 200"
          className="w-full h-full"
          aria-label={`Dot-join canvas for ${shape}`}
        >
          {/* Filled polygon when complete */}
          {completed && polygonPoints && (
            <motion.polygon
              points={polygonPoints}
              fill={fillColour}
              stroke={stroke}
              strokeWidth={2.5}
              strokeLinejoin="round"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            />
          )}

          {/* Lines between tapped dots */}
          {lines.map((l, idx) => (
            <motion.line
              key={`line-${idx}`}
              x1={l.x1} y1={l.y1}
              x2={l.x2} y2={l.y2}
              stroke={stroke}
              strokeWidth={3}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.25 }}
            />
          ))}

          {/* Dots */}
          {dots.map((dot) => {
            const isTapped   = tappedSequence.includes(dot.id);
            const isNext     = dot.id === nextExpected && !completed;
            const isWrong    = wrongTap === dot.id;
            const fillColour = isWrong
              ? "#ef4444"
              : isTapped
              ? stroke
              : isNext
              ? stroke
              : "#cbd5e1";

            return (
              <g key={dot.id}
                 role="button"
                 aria-label={`Dot ${dot.id}`}
                 style={{ cursor: completed ? "default" : "pointer" }}
                 onClick={() => handleDotTap(dot.id)}
              >
                {/* Pulse ring on next dot */}
                {isNext && !isTapped && (
                  <motion.circle
                    cx={dot.x} cy={dot.y} r={DOT_RADIUS + 6}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={2}
                    opacity={0.4}
                    animate={{ r: [DOT_RADIUS + 4, DOT_RADIUS + 14, DOT_RADIUS + 4] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
                {/* Hit area (transparent, large) */}
                <circle cx={dot.x} cy={dot.y} r={DOT_RADIUS + 6} fill="transparent" />
                {/* Visible dot */}
                <motion.circle
                  cx={dot.x} cy={dot.y} r={DOT_RADIUS}
                  fill={fillColour}
                  stroke="white"
                  strokeWidth={2.5}
                  animate={{ scale: isTapped ? [1, 1.3, 1] : 1 }}
                  transition={{ duration: 0.3 }}
                />
                {/* Number label */}
                <text
                  x={dot.x} y={dot.y + 5}
                  textAnchor="middle"
                  fontSize="14"
                  fontWeight="900"
                  fill={isTapped || isNext ? "white" : "#64748b"}
                  style={{ userSelect: "none", pointerEvents: "none" }}
                >
                  {dot.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Status */}
      <motion.p
        key={statusLabel}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 text-center text-sm font-black opacity-80"
      >
        {statusLabel}
      </motion.p>

      {/* Reset button */}
      {tappedSequence.length > 0 && !completed && (
        <div className="mt-2 flex justify-center">
          <button
            onClick={() => setTappedSequence([])}
            className="text-xs font-semibold opacity-60 hover:opacity-100 underline"
          >
            Start over
          </button>
        </div>
      )}

      {/* Celebration */}
      <AnimatePresence>
        {completed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center rounded-[2rem] bg-white/50 backdrop-blur-sm"
          >
            <div className="text-center">
              <motion.div
                animate={{ rotate: [0, -12, 12, -12, 12, 0], scale: [1, 1.25, 1] }}
                transition={{ duration: 0.7 }}
                className="text-5xl"
              >
                ⭐
              </motion.div>
              <p className="mt-2 text-lg font-black" style={{ color: stroke }}>
                That&apos;s a {shape}!
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
