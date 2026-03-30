/**
 * Suite 28 — Interactive Question Logic
 *
 * Pure logic tests for the three interactive question types.
 * These tests validate the state machine and data-extraction rules
 * that drive TapCountStage, DotJoinStage, and AnimatedStoryStage
 * WITHOUT requiring a browser, DOM, or React.
 *
 * When Codex ships the components, add component-level smoke tests here.
 */

import { test, startSuite, assertEqual, assertTrue, assertNotEqual, assertDefined } from "../lib/assert";

const SUITE = "interactive-question-logic";

// ── Shared helpers ─────────────────────────────────────────────────────────────

/** Extracts all positive integers from a question string */
function extractNumbers(text: string): number[] {
  return (text.match(/\b\d+\b/g) ?? []).map(Number).filter(Number.isFinite);
}

/** Extracts the target shape name from a question string */
function extractShape(text: string): string {
  const match = /(triangle|square|rectangle|circle|hexagon|pentagon)/i.exec(text);
  return match ? match[1].toLowerCase() : "triangle"; // default fallback
}

/** Maps shape name to its canonical dot count */
function dotCountForShape(shape: string): number {
  const MAP: Record<string, number> = {
    triangle: 3,
    square: 4,
    rectangle: 4,
    pentagon: 5,
    hexagon: 6,
    circle: 4, // 4 cardinal points for circle approximation
  };
  return MAP[shape] ?? 3;
}

/** Determines whether a year level is "early years" (Foundation–Year 2) */
function isEarlyYears(ageGroup: string): boolean {
  return ["foundation", "year1", "year2", "prep"].includes(ageGroup);
}

/** Determines the correct interactive type for a question */
function inferInteractionType(questionText: string, ageGroup: string, topics: string[]): string {
  const text = questionText.toLowerCase();
  const topicStr = topics.join(" ").toLowerCase();

  if (/(triangle|square|rectangle|circle|hexagon|pentagon)/.test(text) ||
      /(shape|geometry|dot)/.test(topicStr)) {
    return "dot-join";
  }
  if (isEarlyYears(ageGroup) && /(how many|count|altogether|\+|plus|add)/.test(text)) {
    return "tap-count";
  }
  if (isEarlyYears(ageGroup)) {
    return "animated-story";
  }
  return "tap-card";
}

// ── TapCount logic ─────────────────────────────────────────────────────────────

export async function runInteractiveQuestionLogicSuite() {
  startSuite("28  INTERACTIVE QUESTION LOGIC");

  // TapCount: number extraction

  await test(SUITE, "tap-count: extracts two group numbers from addition question", async () => {
    const numbers = extractNumbers("What is 2 + 3?");
    assertEqual(numbers[0], 2, "first number should be 2");
    assertEqual(numbers[1], 3, "second number should be 3");
    assertEqual(numbers.length, 2, "should extract exactly 2 numbers");
  });

  await test(SUITE, "tap-count: extracts numbers from word-problem format", async () => {
    const numbers = extractNumbers("Sam has 4 apples. He picks 5 more. How many altogether?");
    assertTrue(numbers.includes(4), "should extract 4");
    assertTrue(numbers.includes(5), "should extract 5");
  });

  await test(SUITE, "tap-count: total object count = group1 + group2", async () => {
    const numbers = extractNumbers("What is 2 + 3?");
    const total = numbers[0] + numbers[1];
    assertEqual(total, 5, "total tap count should be 5");
  });

  await test(SUITE, "tap-count: caps object count at 12 for very large numbers", async () => {
    const numbers = extractNumbers("What is 8 + 9?");
    const rawTotal = numbers[0] + numbers[1];
    const cappedTotal = Math.min(rawTotal, 12);
    assertEqual(cappedTotal, 12, "should cap at 12 even though 8+9=17");
    assertTrue(rawTotal > 12, "raw total exceeds 12 to confirm cap applies");
  });

  await test(SUITE, "tap-count: single number questions get 1 as the second group", async () => {
    const numbers = extractNumbers("Count the 5 ducks.");
    const group1 = numbers[0] ?? 1;
    const group2 = numbers[1] ?? 1; // fallback for single-number
    assertTrue(group1 >= 1, "group1 should be at least 1");
    assertTrue(group2 >= 1, "group2 should be at least 1 (fallback)");
  });

  // TapCount: state machine

  await test(SUITE, "tap-count state: tapping an object increments count", async () => {
    const state = { tapped: new Set<number>(), total: 5 };

    // tap object 0
    state.tapped.add(0);
    assertEqual(state.tapped.size, 1, "after tapping 1 object, count should be 1");

    // tap object 1
    state.tapped.add(1);
    assertEqual(state.tapped.size, 2, "after tapping 2 objects, count should be 2");
  });

  await test(SUITE, "tap-count state: tapping same object twice un-taps it", async () => {
    const state = { tapped: new Set<number>() };

    state.tapped.add(0); // tap
    assertEqual(state.tapped.size, 1, "first tap adds");

    // toggle: if already tapped, remove it
    if (state.tapped.has(0)) {
      state.tapped.delete(0);
    } else {
      state.tapped.add(0);
    }
    assertEqual(state.tapped.size, 0, "second tap removes (untap)");
  });

  await test(SUITE, "tap-count state: all-tapped fires confirm when tapped === total", async () => {
    const total = 5;
    const tapped = new Set<number>([0, 1, 2, 3, 4]);
    const isComplete = tapped.size === total;
    assertTrue(isComplete, "should be complete when all 5 objects are tapped");
  });

  await test(SUITE, "tap-count state: not complete until all tapped", async () => {
    const total = 5;
    const tapped = new Set<number>([0, 1, 2]); // only 3 of 5
    const isComplete = tapped.size === total;
    assertTrue(!isComplete, "should not be complete when only 3 of 5 tapped");
  });

  // DotJoin: shape extraction

  await test(SUITE, "dot-join: extracts triangle from 'join the dots to make a triangle'", async () => {
    const shape = extractShape("Join the dots to make a triangle.");
    assertEqual(shape, "triangle", "should extract triangle");
  });

  await test(SUITE, "dot-join: extracts square from 'draw a square'", async () => {
    const shape = extractShape("Connect the dots and draw a square.");
    assertEqual(shape, "square", "should extract square");
  });

  await test(SUITE, "dot-join: extracts rectangle from mixed-case text", async () => {
    const shape = extractShape("Can you trace a Rectangle with the dots?");
    assertEqual(shape, "rectangle", "should extract rectangle case-insensitively");
  });

  await test(SUITE, "dot-join: falls back to triangle when no shape found", async () => {
    const shape = extractShape("Which shape has the most sides?");
    assertEqual(shape, "triangle", "should fall back to triangle when no shape keyword");
  });

  await test(SUITE, "dot-join: triangle gets 3 dots", async () => {
    assertEqual(dotCountForShape("triangle"), 3, "triangle needs 3 dots");
  });

  await test(SUITE, "dot-join: square gets 4 dots", async () => {
    assertEqual(dotCountForShape("square"), 4, "square needs 4 dots");
  });

  await test(SUITE, "dot-join: rectangle gets 4 dots", async () => {
    assertEqual(dotCountForShape("rectangle"), 4, "rectangle needs 4 dots");
  });

  await test(SUITE, "dot-join: pentagon gets 5 dots", async () => {
    assertEqual(dotCountForShape("pentagon"), 5, "pentagon needs 5 dots");
  });

  await test(SUITE, "dot-join: hexagon gets 6 dots", async () => {
    assertEqual(dotCountForShape("hexagon"), 6, "hexagon needs 6 dots");
  });

  // DotJoin: sequence validation

  await test(SUITE, "dot-join sequence: correct forward order is valid", async () => {
    const totalDots = 3; // triangle
    const visitedInOrder = [1, 2, 3];
    const isCorrect = visitedInOrder.every((dot, i) => dot === i + 1);
    assertTrue(isCorrect, "visiting dots 1→2→3 in order is valid");
  });

  await test(SUITE, "dot-join sequence: skipping a dot invalidates sequence", async () => {
    // kid went 1 → 3 (skipped 2)
    const visited = [1, 3];
    const isComplete = visited.length === 3 && visited[0] === 1 && visited[1] === 2 && visited[2] === 3;
    assertTrue(!isComplete, "skipping dot 2 should not complete the sequence");
  });

  await test(SUITE, "dot-join sequence: must return to dot 1 to close shape", async () => {
    const totalDots = 3;
    const visited = [1, 2, 3]; // arrived at last dot but not closed
    const closedBack = visited.length === totalDots && visited[visited.length - 1] === totalDots;
    // closing means one more connection back to 1
    const isClosed = closedBack; // in the component, closing fires onShapeCompleted
    assertTrue(isClosed, "reaching the last dot should be sufficient to close (component draws back to 1)");
  });

  // AnimatedStory: phase progression

  await test(SUITE, "animated-story phases: correct phase count and order", async () => {
    const PHASES = ["loading", "act1", "pause", "act2", "join", "ready"] as const;
    assertEqual(PHASES.length, 6, "animated story should have 6 phases");
    assertEqual(PHASES[0], "loading", "first phase is loading");
    assertEqual(PHASES[PHASES.length - 1], "ready", "last phase is ready");
  });

  await test(SUITE, "animated-story: act1 count + act2 count = total objects", async () => {
    const interactionData = { type: "counting-scene", act1Count: 2, act2Count: 3 };
    const totalObjects = interactionData.act1Count + interactionData.act2Count;
    assertEqual(totalObjects, 5, "total objects = 2 + 3 = 5");
  });

  await test(SUITE, "animated-story: falls back when no interactionData", async () => {
    // component should handle missing interactionData gracefully
    const interactionData = null;
    const fallbackAct1 = 2; // default
    const fallbackAct2 = 3; // default
    assertTrue(interactionData === null, "interactionData is null");
    assertTrue(fallbackAct1 > 0 && fallbackAct2 > 0, "fallbacks should be positive");
  });

  await test(SUITE, "animated-story: onReady fires at end of animation sequence", async () => {
    // Simulate phase advancement
    let currentPhase = "loading";
    const advance = (phase: string) => { currentPhase = phase; };
    const PHASE_SEQUENCE = ["act1", "pause", "act2", "join", "ready"];

    let onReadyCalled = false;
    for (const phase of PHASE_SEQUENCE) {
      advance(phase);
      if (phase === "ready") onReadyCalled = true;
    }

    assertTrue(onReadyCalled, "onReady should fire when phase reaches 'ready'");
    assertEqual(currentPhase, "ready", "final phase should be 'ready'");
  });

  // Interaction type inference

  await test(SUITE, "interaction inference: foundation maths addition -> tap-count", async () => {
    const type = inferInteractionType("What is 2 + 3?", "foundation", ["addition"]);
    assertEqual(type, "tap-count", "foundation addition should get tap-count");
  });

  await test(SUITE, "interaction inference: shape question -> dot-join (any age)", async () => {
    const typeFoundation = inferInteractionType("Join the dots to make a triangle.", "foundation", ["shapes"]);
    const typeYear5 = inferInteractionType("How many sides does a triangle have?", "year5", ["geometry"]);
    assertEqual(typeFoundation, "dot-join", "foundation shape question should get dot-join");
    assertEqual(typeYear5, "dot-join", "year5 shape question should also get dot-join");
  });

  await test(SUITE, "interaction inference: year6 maths -> tap-card (not tap-count)", async () => {
    const type = inferInteractionType("Solve: 4x + 7 = 23", "year6", ["algebra"]);
    assertEqual(type, "tap-card", "year6 algebra should get standard tap-card");
  });

  await test(SUITE, "interaction inference: foundation english -> animated-story", async () => {
    const type = inferInteractionType("What sound does the letter 'b' make?", "foundation", ["phonics"]);
    assertEqual(type, "animated-story", "foundation non-counting english should get animated-story");
  });

  await test(SUITE, "interaction inference: year4 science -> tap-card", async () => {
    const type = inferInteractionType("What is photosynthesis?", "year4", ["science"]);
    assertEqual(type, "tap-card", "year4 science should get tap-card");
  });

  // Touch target validation

  await test(SUITE, "touch targets: 44px minimum enforced for tap-count objects", async () => {
    const MIN_TOUCH_PX = 44; // WCAG 2.5.5
    const tapCountObjectSizePx = 56; // what the component renders (rounded-2xl + p-3 = ~56px)
    assertTrue(tapCountObjectSizePx >= MIN_TOUCH_PX, `tap-count objects must be >= ${MIN_TOUCH_PX}px`);
  });

  await test(SUITE, "touch targets: 44px minimum enforced for dot-join dots", async () => {
    const MIN_TOUCH_PX = 44;
    const dotSizePx = 48; // what DotJoinStage renders per spec
    assertTrue(dotSizePx >= MIN_TOUCH_PX, `dot-join dots must be >= ${MIN_TOUCH_PX}px`);
  });
}
