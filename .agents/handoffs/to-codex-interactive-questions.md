# INTERACTIVE-QUESTIONS-V1 — Codex Build Spec

**From:** Claude (tester)
**To:** Codex (architect)
**Date:** 2026-03-28
**Branch:** `codex/interactive-questions-v1`

---

## What the user wants

Young kids (Foundation–Year 2) need more than multiple-choice text cards.
The user's exact example: *"for a prep kid, what is 2 + 3 — a girl takes 2 apples and another 3 apples together and allowing the kid to count easily"*
Also: *"touching the dots and joining to make a triangle or rectangle"*

Goal: replace the static emoji `QuestionVisualStage` for early-years questions with **truly interactive** stages where the child's touch/click IS the answer mechanism.

---

## What already exists (do not break)

| File | What it does |
|---|---|
| `lib/services/question-visuals.ts` | `buildQuestionVisualProfile()` — infers visual mode, returns emoji data |
| `components/questions/QuestionVisualStage.tsx` | Renders floating emoji stage — decorative only |
| `types/index.ts` `QuestionVisualMode` | `"counting-scene" \| "shape-dots" \| "word-cards" \| "story-scene" \| "concept-cards"` |
| `scripts/test/suites/27-question-visual-scenes.ts` | 4 passing tests for `buildQuestionVisualProfile` |
| `app/learn/page.tsx` | Renders `QuestionVisualStage` above the question card |

---

## What you need to build

### 1. New interactive components

#### `components/questions/TapCountStage.tsx`
- Props: `question: Question`, `theme: ThemeJourneyTokens`, `onCountConfirmed: (count: number) => void`
- Renders N objects (emojis) determined by numbers extracted from question text
- Each object is a tappable button; tapping it highlights it + plays a soft pop animation (Framer Motion `scale: [1, 1.3, 1]`)
- Running counter shows "You counted: X" below the objects
- When all objects are tapped: auto-fires `onCountConfirmed(totalCount)` after 600ms
- The learn page uses `onCountConfirmed` to pre-fill the correct answer option and auto-advance
- **Critical:** tapping an already-tapped object UN-taps it (kids make mistakes), counter decrements
- Layout: grid of emoji bubbles, max 12 objects on screen (cap at 12 even if question number is larger)
- Object emoji comes from `buildQuestionVisualProfile(question).accentEmoji`

#### `components/questions/DotJoinStage.tsx`
- Props: `question: Question`, `theme: ThemeJourneyTokens`, `onShapeCompleted: (shape: string) => void`
- Extracts target shape name from question text via regex: `/(triangle|square|rectangle|circle|hexagon|pentagon)/i`
- Renders an SVG canvas with numbered dots for the detected shape:
  - triangle: 3 dots
  - square/rectangle: 4 dots
  - pentagon: 5 dots
  - hexagon: 6 dots
- Dots are large (44px touch target), numbered 1–N
- Kid draws lines by dragging pointer: pointerdown on dot 1, drag to dot 2, drag to dot 3, etc.
- Line draws live as pointer moves (SVG `<line>` or `<path>`)
- On reaching the final dot AND connecting back to dot 1: shape closes → fills with a light colour → fires `onShapeCompleted(shapeName)`
- If kid leaves the sequence (lifts finger off a non-target dot): reset
- The learn page uses `onShapeCompleted` to pre-fill the answer and optionally auto-advance
- **Fallback:** if no shape detected in question text, render a triangle as default

#### `components/questions/AnimatedStoryStage.tsx`
- Props: `question: Question`, `theme: ThemeJourneyTokens`, `onReady: () => void`
- Reads `question.generationMetadata?.interactionData` for structured scene data (see schema below)
- If no interactionData: fall back to a simple two-group emoji animation (same as current `counting-scene`)
- Animation sequence (all Framer Motion):
  1. **Act 1** (0–1.2s): First group of objects slides in from left, one by one with 150ms stagger
  2. **Pause** (1.2–1.6s): Objects settle, counter badge shows group 1 count
  3. **Act 2** (1.6–2.8s): Second group slides in from right, same stagger
  4. **Join** (2.8–3.2s): All objects drift together into the centre
  5. **Ready** (3.2s): "Now count them all!" CTA appears → fires `onReady()`
- No interaction required — kid watches, then uses the normal tap-card answer options below
- Has a "Replay ▶" button to replay the animation

**`interactionData` schema** (stored in `question.generationMetadata.interactionData`):
```typescript
interface CountingSceneData {
  type: "counting-scene";
  objectEmoji: string;       // e.g. "🍎"
  actorEmoji: string;        // e.g. "👧"
  act1Count: number;         // e.g. 2
  act2Count: number;         // e.g. 3
  setting: string;           // e.g. "orchard" (display label only)
}
```

---

### 2. Update `components/questions/QuestionVisualStage.tsx`

Replace the single static renderer with a mode dispatcher:

```typescript
if (mode === "counting-scene" && isEarlyYears(question.ageGroup)) {
  // return <AnimatedStoryStage ... /> OR <TapCountStage ... />
  // Use TapCount when question is straight arithmetic ("what is X + Y")
  // Use AnimatedStory when question is word-problem ("she has X apples...")
}
if (mode === "shape-dots") {
  return <DotJoinStage ... />
}
// all other modes: keep existing static stage
```

Pass `onInteractionAnswer?: (answer: string) => void` down from the learn page.

---

### 3. Update `app/learn/page.tsx`

Add `onInteractionAnswer` callback that:
1. Finds the answer option whose text matches or contains the number/shape returned
2. Calls `setSelectedAnswer(matchedOptionId)`
3. After 800ms, calls `handleAnswerSubmit()` automatically (same flow as a normal tap)

This means interactive stages auto-submit — the kid doesn't need to tap an option card.

---

### 4. Update `types/index.ts`

Add `interactionType` to the `Question` interface (it may already have it — check first):

```typescript
export type QuestionInteractionType =
  | "tap-card"           // existing default
  | "tap-count"          // tap each object to count
  | "dot-join"           // connect dots to form a shape
  | "animated-story";    // watch animation then tap-card
```

Add `interactionData?: Record<string, unknown>` to `GenerationMetadata` if not already there.

---

### 5. Add question templates in `lib/content/question-bank.ts`

For Foundation + Year1 maths, add templates with `visualMode: "counting-scene"` and `interactionData`:

Example:
```typescript
{
  templateId: "maths-tap-count",
  questionText: "There are {n1} {object} and {n2} more. How many altogether?",
  interactionType: "tap-count",
  visualMode: "counting-scene",
  interactionData: { type: "counting-scene", objectEmoji: "{emoji}", act1Count: "{n1}", act2Count: "{n2}" }
}
```

Add at least 3 tap-count templates and 1 dot-join template per shape (triangle, square, rectangle).

---

## Constraints

- All touch targets ≥ 44px (WCAG 2.5.5 — kids on iPads)
- `prefers-reduced-motion`: skip animation, show static scene instead
- No new npm packages — Framer Motion and SVG cover everything
- TypeScript strict — no `any`, no `@ts-ignore`
- Do NOT change existing answer-checking logic in learn page; only ADD the `onInteractionAnswer` callback path
- Do NOT change suite 27 tests — Claude owns those

---

## Deliverables

- [ ] `components/questions/TapCountStage.tsx`
- [ ] `components/questions/DotJoinStage.tsx`
- [ ] `components/questions/AnimatedStoryStage.tsx`
- [ ] Updated `components/questions/QuestionVisualStage.tsx` (dispatcher)
- [ ] Updated `app/learn/page.tsx` (onInteractionAnswer wired)
- [ ] Updated `types/index.ts` (QuestionInteractionType, interactionData)
- [ ] New question templates in `lib/content/question-bank.ts`
- [ ] `npx tsc --noEmit` passes

When done: update `.agents/status/codex.json` → `"doingNow": "INTERACTIVE-QUESTIONS-V1 complete, handed to Claude for testing"`

Claude will then run suite 27 (extended) + suite 28 (interactive logic) + full TestTsunami.
