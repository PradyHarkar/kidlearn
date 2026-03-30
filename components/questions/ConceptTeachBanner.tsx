"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Question, ChildThemeKey } from "@/types";
import type { ThemeJourneyTokens } from "@/lib/services/tile-themes";

interface ConceptTeachBannerProps {
  question: Question;
  theme: ThemeJourneyTokens;
  themeKey: ChildThemeKey;
  onDismiss: () => void;
}

// ── Concept database ──────────────────────────────────────────────────────────
// Keyed by topic keyword. Returns a visual concept card the child sees first.

interface ConceptCard {
  emoji: string;
  title: string;
  body: string;
  visual?: string;   // SVG path or extra emoji row
  funFact?: string;
}

const SHAPE_CONCEPTS: Record<string, ConceptCard> = {
  triangle: {
    emoji: "🔺",
    title: "Triangle",
    body: "A triangle has 3 sides and 3 corners (vertices).",
    visual: "△",
    funFact: "Pizza slices are triangles! 🍕",
  },
  square: {
    emoji: "🟥",
    title: "Square",
    body: "A square has 4 equal sides and 4 right-angle corners.",
    visual: "◼",
    funFact: "Minecraft blocks are perfect squares! 🎮",
  },
  rectangle: {
    emoji: "▬",
    title: "Rectangle",
    body: "A rectangle has 4 sides — 2 long and 2 short — with 4 right angles.",
    visual: "▭",
    funFact: "A book, a door, a TV — all rectangles! 📺",
  },
  circle: {
    emoji: "⭕",
    title: "Circle",
    body: "A circle is perfectly round — no corners, no straight sides.",
    visual: "○",
    funFact: "A wheel and a coin are both circles! 🪙",
  },
  hexagon: {
    emoji: "⬡",
    title: "Hexagon",
    body: "A hexagon has 6 equal sides and 6 corners.",
    visual: "⬡",
    funFact: "Honeybees build their homes in hexagons! 🍯",
  },
  pentagon: {
    emoji: "⬠",
    title: "Pentagon",
    body: "A pentagon has 5 sides and 5 corners.",
    visual: "⬠",
    funFact: "The US Pentagon building has this shape! 🏛️",
  },
};

const SCIENCE_CONCEPTS: Record<string, ConceptCard> = {
  carnivore: {
    emoji: "🦁",
    title: "Carnivore",
    body: "A carnivore is an animal that eats ONLY meat. They have sharp teeth to catch prey.",
    funFact: "Lions, tigers, and sharks are carnivores! 🦈",
  },
  herbivore: {
    emoji: "🐘",
    title: "Herbivore",
    body: "A herbivore eats ONLY plants — grass, leaves, fruit, and seeds.",
    funFact: "Elephants eat up to 150 kg of plants per day! 🌿",
  },
  omnivore: {
    emoji: "🐻",
    title: "Omnivore",
    body: "An omnivore eats BOTH plants AND meat. They can digest many foods.",
    funFact: "Bears, pigs, and humans are omnivores! 🧑",
  },
  mammal: {
    emoji: "🐬",
    title: "Mammal",
    body: "Mammals are warm-blooded animals that breathe air and feed their babies milk.",
    funFact: "Whales and dolphins are mammals — they breathe air! 🌊",
  },
  reptile: {
    emoji: "🦎",
    title: "Reptile",
    body: "Reptiles are cold-blooded, have scales, and most lay eggs on land.",
    funFact: "Crocodiles have barely changed in 200 million years! 🌍",
  },
  photosynthesis: {
    emoji: "🌿",
    title: "Photosynthesis",
    body: "Plants make their own food using sunlight, water, and air (CO₂). This is called photosynthesis.",
    funFact: "Plants breathe in CO₂ and breathe out the oxygen we need! 🌳",
  },
  evaporation: {
    emoji: "☁️",
    title: "Evaporation",
    body: "When water gets warm enough, it turns into water vapour (gas) and rises into the air.",
    funFact: "Puddles disappear on sunny days because of evaporation! ☀️",
  },
  gravity: {
    emoji: "🍎",
    title: "Gravity",
    body: "Gravity is the force that pulls objects toward the ground. It keeps us on Earth.",
    funFact: "An apple falling from a tree inspired Newton to think about gravity! 🌳",
  },
};

const MATHS_CONCEPTS: Record<string, ConceptCard> = {
  fraction: {
    emoji: "🍕",
    title: "Fractions",
    body: "A fraction shows part of a whole. The top number (numerator) shows how many parts you have. The bottom (denominator) shows total parts.",
    funFact: "If you eat 1 of 4 pizza slices, you ate ¼ of the pizza! 🍕",
  },
  multiplication: {
    emoji: "✖️",
    title: "Multiplication",
    body: "Multiplication is a fast way to add the same number over and over. 3 × 4 = 3 groups of 4 = 12.",
    funFact: "Knowing times tables by heart makes maths super fast! ⚡",
  },
  perimeter: {
    emoji: "📐",
    title: "Perimeter",
    body: "Perimeter is the total distance all the way around the outside of a shape. Add all the sides together!",
    funFact: "Fences around a garden measure perimeter! 🌺",
  },
  area: {
    emoji: "🏠",
    title: "Area",
    body: "Area measures how much flat space is INSIDE a shape. For a rectangle: length × width.",
    funFact: "Carpet and tiles are measured in area (square metres)! 🏠",
  },
};

const ENGLISH_CONCEPTS: Record<string, ConceptCard> = {
  noun: {
    emoji: "🏷️",
    title: "Noun",
    body: "A noun is a naming word — a person, place, thing, or idea. Dog, school, happiness are all nouns.",
    funFact: "Your name is a proper noun — it starts with a capital letter! 🅰️",
  },
  verb: {
    emoji: "🏃",
    title: "Verb",
    body: "A verb is an action word — something you do or feel. Run, eat, think, love are all verbs.",
    funFact: "Every sentence needs a verb to make sense! 💬",
  },
  adjective: {
    emoji: "🎨",
    title: "Adjective",
    body: "An adjective describes a noun. Big, red, happy, and soft are all adjectives.",
    funFact: "Adjectives make writing colourful and interesting! 🖊️",
  },
  syllable: {
    emoji: "🎵",
    title: "Syllable",
    body: "A syllable is a beat in a word. Clap as you say it! 'Rab-bit' has 2 syllables.",
    funFact: "Your name — count the syllables by clapping! 👏",
  },
  vowel: {
    emoji: "🅰️",
    title: "Vowels",
    body: "The vowels are: A, E, I, O, U. Every English word has at least one vowel.",
    funFact: "The word 'rhythms' is the longest common word without a proper vowel! 🎵",
  },
};

function findConcept(question: Question): ConceptCard | null {
  const text = (question.questionText + " " + question.topics.join(" ")).toLowerCase();

  const allConcepts = [
    ...Object.entries(SHAPE_CONCEPTS),
    ...Object.entries(SCIENCE_CONCEPTS),
    ...Object.entries(MATHS_CONCEPTS),
    ...Object.entries(ENGLISH_CONCEPTS),
  ];

  for (const [key, card] of allConcepts) {
    if (text.includes(key)) return card;
  }

  return null;
}

export function ConceptTeachBanner({ question, theme, onDismiss }: ConceptTeachBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const concept = findConcept(question);

  if (!concept || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss();
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12, scale: 0.97 }}
          transition={{ duration: 0.35 }}
          className={`rounded-[1.8rem] border-2 ${theme.surfaceBorder} bg-white/95 shadow-xl mb-4 overflow-hidden`}
        >
          {/* Coloured top bar */}
          <div className={`${theme.heroPanel} px-5 py-3 flex items-center gap-3`}>
            <span className="text-3xl">{concept.emoji}</span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] opacity-80">Learn First</p>
              <p className="text-lg font-black leading-tight">{concept.title}</p>
            </div>
            <button
              onClick={handleDismiss}
              className="ml-auto rounded-full bg-white/20 hover:bg-white/35 w-8 h-8 flex items-center justify-center text-white font-black text-sm transition-all"
              aria-label="Got it, continue to question"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            {/* Visual */}
            {concept.visual && (
              <div className="text-6xl text-center mb-3 select-none opacity-80">{concept.visual}</div>
            )}

            <p className="text-base font-bold text-gray-800 leading-relaxed">{concept.body}</p>

            {concept.funFact && (
              <div className="mt-3 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2.5">
                <p className="text-sm font-bold text-amber-700">💡 Fun fact: {concept.funFact}</p>
              </div>
            )}

            <motion.button
              onClick={handleDismiss}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className={`mt-4 w-full rounded-2xl py-3 font-black text-base shadow-md ${theme.primaryButton}`}
            >
              Got it — show me the question! →
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Returns true if this question has a known concept to teach */
export function hasConceptToTeach(question: Question): boolean {
  const text = (question.questionText + " " + question.topics.join(" ")).toLowerCase();
  const keys = [
    "triangle", "square", "rectangle", "circle", "hexagon", "pentagon",
    "carnivore", "herbivore", "omnivore", "mammal", "reptile",
    "photosynthesis", "evaporation", "gravity",
    "fraction", "multiplication", "perimeter", "area",
    "noun", "verb", "adjective", "syllable", "vowel",
  ];
  return keys.some((k) => text.includes(k));
}
