import type { WritingMode, WritingModeBlueprint, WritingStepBlueprint, WritingDraftComparison } from "@/types";

const POSITIVE_OPENERS = [
  "Nice start!",
  "Great effort!",
  "Strong idea!",
  "You are building a great draft!",
  "Super writing!",
];

const DESCRIBING_WORDS = [
  "bright",
  "brave",
  "happy",
  "tiny",
  "sparkly",
  "quiet",
  "wild",
  "shiny",
  "careful",
  "gentle",
  "exciting",
  "curious",
];

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function hasTerminalPunctuation(text: string) {
  return /[.!?]$/.test(text.trim());
}

function containsAny(text: string, words: string[]) {
  const lowered = text.toLowerCase();
  return words.some((word) => lowered.includes(word));
}

export interface WritingFeedbackResult {
  headline: string;
  suggestions: string[];
  score: number;
  words: number;
  structureMet: boolean;
}

export function reviewWritingStep(
  mode: WritingMode,
  step: WritingStepBlueprint,
  content: string
): WritingFeedbackResult {
  const trimmed = content.trim();
  const words = countWords(trimmed);
  const suggestions: string[] = [];
  const headline = POSITIVE_OPENERS[(words + step.label.length) % POSITIVE_OPENERS.length];

  if (!trimmed) {
    suggestions.push("Try a short sentence to get your idea started.");
  } else {
    if (words < step.minWords) {
      suggestions.push(`Add a little more detail. Aim for at least ${step.minWords} words.`);
    }

    if (!hasTerminalPunctuation(trimmed)) {
      suggestions.push("Finish with a full stop, question mark, or exclamation mark.");
    }
  }

  if (!containsAny(trimmed, DESCRIBING_WORDS)) {
    suggestions.push("Can you add a describing word to make it more vivid?");
  }

  if (mode === "narrative" && step.stepName === "action" && !containsAny(trimmed, ["then", "next", "suddenly", "after", "first"])) {
    suggestions.push("A sequencing word like 'then' or 'next' would help the story flow.");
  }

  if (mode === "persuasive" && step.stepName === "opinion" && !containsAny(trimmed, ["i think", "i believe", "in my opinion", "i feel"])) {
    suggestions.push("Start by saying what you think, for example 'I think...'.");
  }

  if (mode === "persuasive" && step.stepName === "conclusion" && !containsAny(trimmed, ["because", "so", "therefore", "that is why"])) {
    suggestions.push("End by reminding the reader why your idea matters.");
  }

  if (!suggestions.length) {
    suggestions.push("Great job! Add one tiny detail if you want to make it even stronger.");
  }

  const structureMet = words >= step.minWords && hasTerminalPunctuation(trimmed);
  const score = Math.min(100, Math.max(25, 40 + words * 4 + (structureMet ? 20 : 0)));

  return {
    headline,
    suggestions: suggestions.slice(0, 3),
    score,
    words,
    structureMet,
  };
}

export function buildWritingDraftComparison(originalDraft: string, revisedDraft: string): WritingDraftComparison {
  const originalWords = originalDraft.trim().split(/\s+/).filter(Boolean);
  const revisedWords = revisedDraft.trim().split(/\s+/).filter(Boolean);
  const addedWords = revisedWords.filter((word) => !originalWords.includes(word));
  const removedWords = originalWords.filter((word) => !revisedWords.includes(word));
  const changedWords = Array.from(new Set([...addedWords.slice(0, 12), ...removedWords.slice(0, 12)]));

  const summaryParts = [];
  if (addedWords.length) summaryParts.push(`${addedWords.length} new words`);
  if (removedWords.length) summaryParts.push(`${removedWords.length} removed words`);
  summaryParts.push(revisedWords.length >= originalWords.length ? "stronger draft" : "shorter draft");

  return {
    addedWords,
    removedWords,
    changedWords,
    summary: summaryParts.join(" · "),
  };
}

export function scoreWritingCompletion(modeBlueprint: WritingModeBlueprint, steps: Array<{ content: string }>) {
  const completedSteps = steps.filter((step) => step.content.trim().length > 0).length;
  const totalWords = steps.reduce((sum, step) => sum + countWords(step.content), 0);
  const structureBonus = completedSteps === modeBlueprint.steps.length ? 10 : 0;
  const detailBonus = Math.min(10, Math.floor(totalWords / 15));
  return {
    completedSteps,
    totalWords,
    pointsEarned: completedSteps * 3 + structureBonus + detailBonus,
    starsEarned: completedSteps === modeBlueprint.steps.length ? 3 : 1,
  };
}
