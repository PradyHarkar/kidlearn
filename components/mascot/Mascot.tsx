"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

type MascotMood = "happy" | "excited" | "thinking" | "sad" | "celebrating";

interface MascotProps {
  mood?: MascotMood;
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const MOOD_COLORS: Record<MascotMood, string> = {
  happy: "#FFD700",
  excited: "#FF6B6B",
  thinking: "#74b9ff",
  sad: "#a29bfe",
  celebrating: "#00b894",
};

const MOOD_MESSAGES: Record<MascotMood, string[]> = {
  happy: ["Great job! ⭐", "You're amazing! 🌟", "Keep it up! 💪", "Awesome work! 🎉"],
  excited: ["WOW! Perfect! 🎊", "INCREDIBLE! 🚀", "You're on fire! 🔥", "AMAZING! 💥"],
  thinking: ["Hmm, let me think... 🤔", "You can do it! 💡", "Take your time! ⏰"],
  sad: ["Oops! Try again! 💫", "Don't give up! 🌈", "You'll get it! 🎯"],
  celebrating: ["🎉 CONGRATULATIONS! 🎉", "LEVEL UP! ⬆️", "YOU'RE A STAR! ⭐"],
};

export function Mascot({ mood = "happy", message, size = "md", className = "" }: MascotProps) {
  const [currentMessage, setCurrentMessage] = useState(
    message || MOOD_MESSAGES[mood][0]
  );
  const [showMessage, setShowMessage] = useState(!!message);

  useEffect(() => {
    if (message) {
      setCurrentMessage(message);
      setShowMessage(true);
      const timer = setTimeout(() => setShowMessage(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const sizes = { sm: 80, md: 120, lg: 160 };
  const svgSize = sizes[size];
  const color = MOOD_COLORS[mood];

  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      <AnimatePresence>
        {showMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.8 }}
            className="absolute -top-16 left-1/2 -translate-x-1/2 bg-white rounded-2xl px-4 py-2 shadow-kid text-center whitespace-nowrap z-10"
            style={{ border: `2px solid ${color}` }}
          >
            <p className="font-bold text-gray-700 text-sm">{currentMessage}</p>
            <div
              className="absolute bottom-[-8px] left-1/2 -translate-x-1/2 w-4 h-4 rotate-45"
              style={{ background: "white", borderRight: `2px solid ${color}`, borderBottom: `2px solid ${color}` }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={
          mood === "celebrating"
            ? { rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.1, 1.1, 1.1, 1.1, 1] }
            : mood === "excited"
            ? { y: [0, -10, 0, -10, 0] }
            : { y: [0, -8, 0] }
        }
        transition={
          mood === "celebrating" || mood === "excited"
            ? { duration: 0.5 }
            : { duration: 3, repeat: Infinity, ease: "easeInOut" }
        }
        className="cursor-pointer"
        onClick={() => {
          const msgs = MOOD_MESSAGES[mood];
          setCurrentMessage(msgs[Math.floor(Math.random() * msgs.length)]);
          setShowMessage(true);
        }}
      >
        <svg
          width={svgSize}
          height={svgSize}
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Body */}
          <ellipse cx="60" cy="75" rx="35" ry="30" fill={color} />

          {/* Head */}
          <circle cx="60" cy="45" r="32" fill={color} />

          {/* Ears */}
          <ellipse cx="28" cy="30" rx="10" ry="14" fill={color} />
          <ellipse cx="92" cy="30" rx="10" ry="14" fill={color} />
          <ellipse cx="28" cy="30" rx="6" ry="9" fill="#FFB6C1" />
          <ellipse cx="92" cy="30" rx="6" ry="9" fill="#FFB6C1" />

          {/* Eyes */}
          <circle cx="48" cy="40" r="9" fill="white" />
          <circle cx="72" cy="40" r="9" fill="white" />
          <motion.circle
            cx="50"
            cy="41"
            r="5"
            fill="#1a1a2e"
            animate={mood === "thinking" ? { cx: [50, 52, 50] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <motion.circle
            cx="74"
            cy="41"
            r="5"
            fill="#1a1a2e"
            animate={mood === "thinking" ? { cx: [74, 76, 74] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          />
          {/* Eye shine */}
          <circle cx="52" cy="38" r="2" fill="white" />
          <circle cx="76" cy="38" r="2" fill="white" />

          {/* Eyebrows */}
          {mood === "sad" ? (
            <>
              <path d="M40 28 Q48 32 56 28" stroke="#8B6914" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <path d="M64 28 Q72 32 80 28" stroke="#8B6914" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </>
          ) : mood === "excited" || mood === "celebrating" ? (
            <>
              <path d="M40 29 Q48 23 56 29" stroke="#8B6914" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <path d="M64 29 Q72 23 80 29" stroke="#8B6914" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </>
          ) : (
            <>
              <path d="M41 30 Q48 26 55 30" stroke="#8B6914" strokeWidth="2" strokeLinecap="round" fill="none" />
              <path d="M65 30 Q72 26 79 30" stroke="#8B6914" strokeWidth="2" strokeLinecap="round" fill="none" />
            </>
          )}

          {/* Nose */}
          <ellipse cx="60" cy="51" rx="5" ry="3" fill="#FFB6C1" />

          {/* Mouth */}
          {mood === "sad" ? (
            <path d="M48 60 Q60 55 72 60" stroke="#8B6914" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          ) : mood === "excited" || mood === "celebrating" ? (
            <>
              <path d="M46 58 Q60 70 74 58" stroke="#8B6914" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <path d="M46 58 Q60 70 74 58" fill="#FF6B6B" opacity="0.3" />
              {/* Teeth */}
              <rect x="53" y="59" width="7" height="5" rx="1" fill="white" />
              <rect x="60" y="59" width="7" height="5" rx="1" fill="white" />
            </>
          ) : (
            <path d="M48 58 Q60 68 72 58" stroke="#8B6914" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          )}

          {/* Cheeks */}
          <ellipse cx="40" cy="56" rx="8" ry="5" fill="#FFB6C1" opacity="0.6" />
          <ellipse cx="80" cy="56" rx="8" ry="5" fill="#FFB6C1" opacity="0.6" />

          {/* Stars for celebrating */}
          {(mood === "celebrating" || mood === "excited") && (
            <>
              <motion.text
                x="8" y="20"
                fontSize="16"
                animate={{ opacity: [0, 1, 0], y: [20, 5, 20] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >⭐</motion.text>
              <motion.text
                x="96" y="20"
                fontSize="16"
                animate={{ opacity: [0, 1, 0], y: [20, 5, 20] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
              >⭐</motion.text>
            </>
          )}

          {/* Arms */}
          <ellipse cx="25" cy="75" rx="10" ry="18" fill={color} transform="rotate(-20 25 75)" />
          <ellipse cx="95" cy="75" rx="10" ry="18" fill={color} transform="rotate(20 95 75)" />

          {/* Belly */}
          <ellipse cx="60" cy="80" rx="22" ry="18" fill="white" opacity="0.4" />

          {/* Feet */}
          <ellipse cx="45" cy="104" rx="14" ry="8" fill={color} />
          <ellipse cx="75" cy="104" rx="14" ry="8" fill={color} />
        </svg>
      </motion.div>
    </div>
  );
}
