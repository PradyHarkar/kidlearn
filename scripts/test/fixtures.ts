/**
 * KIDLEARN TEST FIXTURES
 * ─────────────────────
 * Single source of truth for all test data used across every test suite.
 * Deterministic IDs so teardown can find and delete exactly these records.
 * Never reuse these emails/IDs for real accounts.
 */

import type { AgeGroup, Country, Subject } from "../../types";

// ── Users ────────────────────────────────────────────────────────────────────

export const TEST_USERS = {
  AU_PARENT: {
    userId:     "tt-user-au-001",
    email:      "test.tsunami.au@kidlearn.test",
    password:   "TestTsunami123!",
    parentName: "Tsunami AU Parent",
    country:    "AU" as Country,
  },
  US_PARENT: {
    userId:     "tt-user-us-001",
    email:      "test.tsunami.us@kidlearn.test",
    password:   "TestTsunami123!",
    parentName: "Tsunami US Parent",
    country:    "US" as Country,
  },
  IN_PARENT: {
    userId:     "tt-user-in-001",
    email:      "test.tsunami.in@kidlearn.test",
    password:   "TestTsunami123!",
    parentName: "Tsunami IN Parent",
    country:    "IN" as Country,
  },
  UK_PARENT: {
    userId:     "tt-user-uk-001",
    email:      "test.tsunami.uk@kidlearn.test",
    password:   "TestTsunami123!",
    parentName: "Tsunami UK Parent",
    country:    "UK" as Country,
  },
  // For conflict/dup detection tests
  DUPE_PARENT: {
    userId:     "tt-user-dupe-001",
    email:      "test.tsunami.dupe@kidlearn.test",
    password:   "TestTsunami123!",
    parentName: "Tsunami Dupe Parent",
    country:    "AU" as Country,
  },
  // For subscription status tests: user has stale JWT (trial) but live active subscription in DynamoDB
  ACTIVE_SUB_PARENT: {
    userId:           "tt-user-active-sub-001",
    email:            "test.tsunami.activesub@kidlearn.test",
    password:         "TestTsunami123!",
    parentName:       "Tsunami Active Sub Parent",
    country:          "AU" as Country,
    subscriptionId:   "tt-sub-active-001",
    stripeCustomerId: "cus_test_tsunami_active",
  },
} as const;

// ── Children ─────────────────────────────────────────────────────────────────

export const TEST_CHILDREN = {
  // AU — one per grade to verify correct difficulty mapping
  AU_FOUNDATION: { childId: "tt-child-au-foundation", childName: "Tsunami AU Foundation", grade: "foundation", ageGroup: "foundation" as AgeGroup, expectedDifficulty: 1 },
  AU_YEAR1:      { childId: "tt-child-au-year1",      childName: "Tsunami AU Year1",      grade: "year1",      ageGroup: "year1"      as AgeGroup, expectedDifficulty: 2 },
  AU_YEAR3:      { childId: "tt-child-au-year3",      childName: "Tsunami AU Year3",      grade: "year3",      ageGroup: "year3"      as AgeGroup, expectedDifficulty: 4 },
  AU_YEAR5:      { childId: "tt-child-au-year5",      childName: "Tsunami AU Year5",      grade: "year5",      ageGroup: "year5"      as AgeGroup, expectedDifficulty: 6 },
  AU_YEAR6:      { childId: "tt-child-au-year6",      childName: "Tsunami AU Year6",      grade: "year6",      ageGroup: "year6"      as AgeGroup, expectedDifficulty: 7 },
  AU_YEAR7:      { childId: "tt-child-au-year7",      childName: "Tsunami AU Year7",      grade: "year7",      ageGroup: "year7"      as AgeGroup, expectedDifficulty: 8 },
  AU_YEAR8:      { childId: "tt-child-au-year8",      childName: "Tsunami AU Year8",      grade: "year8",      ageGroup: "year8"      as AgeGroup, expectedDifficulty: 9 },
  // US
  US_KINDER:     { childId: "tt-child-us-kinder",     childName: "Tsunami US Kinder",     grade: "kindergarten", ageGroup: "foundation" as AgeGroup, expectedDifficulty: 1 },
  US_GRADE5:     { childId: "tt-child-us-grade5",     childName: "Tsunami US Grade5",     grade: "grade5",    ageGroup: "year5"      as AgeGroup, expectedDifficulty: 6 },
  US_GRADE8:     { childId: "tt-child-us-grade8",     childName: "Tsunami US Grade8",     grade: "grade8",    ageGroup: "year8"      as AgeGroup, expectedDifficulty: 9 },
  // IN
  IN_CLASS8:     { childId: "tt-child-in-class8",     childName: "Tsunami IN Class8",     grade: "class8",    ageGroup: "year8"      as AgeGroup, expectedDifficulty: 9 },
  // UK
  UK_RECEPTION:  { childId: "tt-child-uk-reception",  childName: "Tsunami UK Reception",  grade: "reception", ageGroup: "foundation" as AgeGroup, expectedDifficulty: 1 },
  UK_YEAR7:      { childId: "tt-child-uk-year7",      childName: "Tsunami UK Year7",      grade: "year7",     ageGroup: "year7"      as AgeGroup, expectedDifficulty: 8 },
  // Regression: the "old Ved" scenario — child with ageGroup=year5 but stored difficulty=1
  VED_REGRESSION: { childId: "tt-child-ved-regression", childName: "Tsunami Ved Regression", grade: "year5", ageGroup: "year5" as AgeGroup, expectedDifficulty: 6, storedDifficulty: 1 },
  // Dedicated child for suite 20 (req001-progress-tracking) — not used by any other suite.
  // Isolation guarantees the weekly digest accuracy is always exactly what suite 20 submits.
  AU_YEAR3_DIGEST: { childId: "tt-child-au-year3-digest", childName: "Tsunami AU Year3 Digest", grade: "year3", ageGroup: "year3" as AgeGroup, expectedDifficulty: 4 },
} as const;

// ── Test Questions ────────────────────────────────────────────────────────────
// Pre-seeded questions used to verify question retrieval by partition/difficulty.

export const TEST_QUESTION_PARTITIONS: Array<{
  pk: string;
  subject: Subject;
  ageGroup: AgeGroup;
  country: Country;
  difficulty: number;
}> = [
  { pk: "maths#year5#AU",    subject: "maths",   ageGroup: "year5", country: "AU", difficulty: 6 },
  { pk: "english#year5#AU",  subject: "english", ageGroup: "year5", country: "AU", difficulty: 6 },
  { pk: "science#year5#AU",  subject: "science", ageGroup: "year5", country: "AU", difficulty: 6 },
  { pk: "maths#year7#AU",    subject: "maths",   ageGroup: "year7", country: "AU", difficulty: 8 },
  { pk: "maths#year5#US",    subject: "maths",   ageGroup: "year5", country: "US", difficulty: 6 },
  { pk: "maths#year8#IN",    subject: "maths",   ageGroup: "year8", country: "IN", difficulty: 9 },
];

// Generates N deterministic test questions for a given partition
export function makeTestQuestions(
  pk: string,
  subject: Subject,
  ageGroup: AgeGroup,
  country: Country,
  difficulty: number,
  count = 15
) {
  return Array.from({ length: count }, (_, i) => ({
    pk,
    questionId:   `tt-q-${pk.replace(/#/g, "-")}-${String(i + 1).padStart(3, "0")}`,
    questionText: `[TEST] ${subject} question ${i + 1} for ${ageGroup} (${country}) — difficulty ${difficulty}`,
    answerOptions: [
      { id: "a", text: "Correct answer",   isCorrect: true  },
      { id: "b", text: "Wrong answer B",   isCorrect: false },
      { id: "c", text: "Wrong answer C",   isCorrect: false },
      { id: "d", text: "Wrong answer D",   isCorrect: false },
    ],
    difficulty,
    topics:      ["test-topic", subject, ageGroup],
    explanation: `Test explanation for question ${i + 1}`,
    subject,
    yearLevel:   ageGroup === "foundation" ? "prep" : ageGroup,
    ageGroup,
    country,
    hint:        `Test hint ${i + 1}`,
    cached:      false,
    createdAt:   new Date().toISOString(),
    generationMetadata: {
      generator:    "manual-import" as const,
      templateId:   "tsunami-test",
      qualityVersion: "test",
    },
  }));
}

// ── Adaptive algorithm test vectors ──────────────────────────────────────────
// Used by pure-function unit tests (no HTTP needed).

export const ADAPTIVE_VECTORS = [
  // (currentDifficulty, consecutiveCorrect, consecutiveWrong) → expectedOutput
  { currentDifficulty: 5, correct: 3, wrong: 0, expected: 6,  label: "3 correct → +1" },
  { currentDifficulty: 5, correct: 0, wrong: 2, expected: 4,  label: "2 wrong → -1" },
  { currentDifficulty: 5, correct: 2, wrong: 0, expected: 5,  label: "2 correct (not 3) → no change" },
  { currentDifficulty: 5, correct: 1, wrong: 1, expected: 5,  label: "mixed → no change" },
  { currentDifficulty: 10, correct: 3, wrong: 0, expected: 10, label: "at max (10), 3 correct → stays 10" },
  { currentDifficulty: 1,  correct: 0, wrong: 2, expected: 1,  label: "at min (1), 2 wrong → stays 1" },
];

export const YEAR_ADVANCE_VECTORS = [
  { yearLevel: "foundation", accuracy: 95, difficulty: 9, shouldAdvance: true,  nextLevel: "year1",  label: "foundation 95%@9 → advance to year1" },
  { yearLevel: "year3",      accuracy: 95, difficulty: 9, shouldAdvance: true,  nextLevel: "year4",  label: "year3 95%@9 → advance to year4" },
  { yearLevel: "year8",      accuracy: 99, difficulty: 9, shouldAdvance: false, nextLevel: "year8",  label: "year8 is top — no advance" },
  { yearLevel: "year5",      accuracy: 80, difficulty: 9, shouldAdvance: false, nextLevel: "year5",  label: "accuracy < 90 → no advance" },
  { yearLevel: "year5",      accuracy: 95, difficulty: 7, shouldAdvance: false, nextLevel: "year5",  label: "difficulty < 8 → no advance" },
];

export const GRADE_DIFFICULTY_VECTORS: Array<{ country: Country; grade: string; expectedDifficulty: number }> = [
  { country: "AU", grade: "foundation", expectedDifficulty: 1 },
  { country: "AU", grade: "year1",      expectedDifficulty: 2 },
  { country: "AU", grade: "year5",      expectedDifficulty: 6 },
  { country: "AU", grade: "year6",      expectedDifficulty: 7 },
  { country: "AU", grade: "year7",      expectedDifficulty: 8 },
  { country: "AU", grade: "year8",      expectedDifficulty: 9 },
  { country: "US", grade: "kindergarten", expectedDifficulty: 1 },
  { country: "US", grade: "grade5",     expectedDifficulty: 6 },
  { country: "US", grade: "grade8",     expectedDifficulty: 9 },
  { country: "IN", grade: "class1",     expectedDifficulty: 2 },
  { country: "IN", grade: "class8",     expectedDifficulty: 9 },
  { country: "UK", grade: "reception",  expectedDifficulty: 1 },
  { country: "UK", grade: "year7",      expectedDifficulty: 8 },
  { country: "UK", grade: "year8",      expectedDifficulty: 9 },
];

// Prefix used on all test question IDs so teardown can identify them
export const TEST_QUESTION_ID_PREFIX = "tt-q-";
export const TEST_USER_ID_PREFIX     = "tt-user-";
export const TEST_CHILD_ID_PREFIX    = "tt-child-";
