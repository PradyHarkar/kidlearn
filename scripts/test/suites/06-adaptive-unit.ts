/**
 * ADAPTIVE ENGINE UNIT TEST SUITE
 * ─────────────────────────────────
 * Pure function tests — no HTTP, no DynamoDB.
 * Tests the difficulty algorithm, year advancement, and grade→difficulty mapping.
 * These run instantly and catch regressions in lib/adaptive.ts + lib/curriculum.ts.
 */

import { test, startSuite, assertEqual, assertTrue } from "../lib/assert";
import {
  ADAPTIVE_VECTORS,
  YEAR_ADVANCE_VECTORS,
  GRADE_DIFFICULTY_VECTORS,
} from "../fixtures";

const SUITE = "adaptive-unit";

// Import the actual functions under test
import { calculateDifficultyAdjustment, shouldAdvanceYearLevel, nextYearLevel } from "../../../lib/adaptive";
import { gradeToAgeGroup } from "../../../lib/curriculum";
import { getInitialDifficultyForAgeGroup } from "../../../lib/adaptive";

export async function runAdaptiveUnitSuite(_baseUrl: string) {
  startSuite("06  ADAPTIVE ENGINE (unit)");

  // ── calculateDifficultyAdjustment ─────────────────────────────────────────
  for (const v of ADAPTIVE_VECTORS) {
    await test(SUITE, `calculateDifficultyAdjustment: ${v.label}`, async () => {
      const result = calculateDifficultyAdjustment(v.currentDifficulty, v.correct, v.wrong);
      assertEqual(result, v.expected, v.label);
    });
  }

  // ── shouldAdvanceYearLevel + nextYearLevel ────────────────────────────────
  for (const v of YEAR_ADVANCE_VECTORS) {
    await test(SUITE, `shouldAdvanceYearLevel: ${v.label}`, async () => {
      const result = shouldAdvanceYearLevel(v.accuracy, v.difficulty, v.yearLevel as never);
      assertEqual(result, v.shouldAdvance, v.label);
    });

    if (v.shouldAdvance) {
      await test(SUITE, `nextYearLevel: ${v.label} → ${v.nextLevel}`, async () => {
        const result = nextYearLevel(v.yearLevel as never);
        assertEqual(result, v.nextLevel, `nextYearLevel(${v.yearLevel})`);
      });
    }
  }

  // ── getInitialDifficultyForAgeGroup ───────────────────────────────────────
  const diffTable: Array<[string, number]> = [
    ["foundation", 1], ["year1", 2], ["year2", 3], ["year3", 4],
    ["year4", 5], ["year5", 6], ["year6", 7], ["year7", 8], ["year8", 9],
    ["prep", 1],  // legacy alias for foundation
  ];
  for (const [ageGroup, expected] of diffTable) {
    await test(SUITE, `getInitialDifficultyForAgeGroup(${ageGroup}) === ${expected}`, async () => {
      const result = getInitialDifficultyForAgeGroup(ageGroup as never);
      assertEqual(result, expected, `ageGroup=${ageGroup}`);
    });
  }

  // ── gradeToAgeGroup + difficulty chain ────────────────────────────────────
  for (const v of GRADE_DIFFICULTY_VECTORS) {
    await test(SUITE, `${v.country} "${v.grade}" → difficulty ${v.expectedDifficulty}`, async () => {
      const ageGroup = gradeToAgeGroup(v.country, v.grade);
      const difficulty = getInitialDifficultyForAgeGroup(ageGroup);
      assertEqual(difficulty, v.expectedDifficulty, `${v.country}/${v.grade}`);
    });
  }

  // ── Regression: AU year7/year8 no longer fall back to year3 ──────────────
  await test(SUITE, "REGRESSION: AU year7 → year7 (not year3 fallback)", async () => {
    const ageGroup = gradeToAgeGroup("AU", "year7");
    assertTrue(ageGroup === "year7", `expected year7, got ${ageGroup}`);
  });

  await test(SUITE, "REGRESSION: AU year8 → year8 (not year3 fallback)", async () => {
    const ageGroup = gradeToAgeGroup("AU", "year8");
    assertTrue(ageGroup === "year8", `expected year8, got ${ageGroup}`);
  });

  await test(SUITE, "REGRESSION: US grade8 → year8 (not year3 fallback)", async () => {
    const ageGroup = gradeToAgeGroup("US", "grade8");
    assertTrue(ageGroup === "year8", `expected year8, got ${ageGroup}`);
  });

  await test(SUITE, "REGRESSION: UK year7 → year7 (not year3 fallback)", async () => {
    const ageGroup = gradeToAgeGroup("UK", "year7");
    assertTrue(ageGroup === "year7", `expected year7, got ${ageGroup}`);
  });

  // ── shouldAdvanceYearLevel does NOT only work from prep (old bug) ─────────
  await test(SUITE, "REGRESSION: shouldAdvanceYearLevel works from year3 (not just prep)", async () => {
    const result = shouldAdvanceYearLevel(95, 9, "year3" as never);
    assertTrue(result === true, "year3@95%/d9 should advance");
  });

  await test(SUITE, "REGRESSION: nextYearLevel(year3) === year4 (not hardcoded year3)", async () => {
    const result = nextYearLevel("year3" as never);
    assertEqual(result, "year4", "next after year3 should be year4");
  });

  await test(SUITE, "REGRESSION: nextYearLevel(year8) === year8 (no advance past top)", async () => {
    const result = nextYearLevel("year8" as never);
    assertEqual(result, "year8", "year8 is top level — should not advance");
  });
}
