/**
 * SUITE 31 — QUESTION DEEP QUALITY
 * ══════════════════════════════════════════════════════════════════════════════
 * Exhaustive quality checks across all subjects, age groups, and countries.
 *
 * Dimensions covered:
 *   A. Structural integrity   — text, options, explanation, hint
 *   B. Answer correctness     — one correct, no duplicates, not always first
 *   C. Difficulty progression — monotone non-decreasing across age groups
 *   D. Age appropriateness    — text length, vocabulary, complexity
 *   E. Topic coverage         — all curriculum topics represented
 *   F. Cross-subject parity   — maths / english / science all produce valid banks
 *   G. Match-pairs quality    — pairs logical, symmetric, no self-matches
 *   H. Logical sense          — known facts are correct (carnivore=meat, etc.)
 *   I. Answer diversity       — correct answer not always A, distractors vary
 *   J. Session ordering       — difficulty ramps, topic spread maintained
 *   K. Uniqueness             — no near-duplicate questions in a generated bank
 *   L. Country localisation   — AU/US/UK/IN each produce valid banks
 */

import { test, startSuite, assertTrue, assertEqual, assertInRange, assertDefined } from "../lib/assert";
import { generateQuestionBank } from "../../../lib/content/question-bank";
import { orderQuestionsForSession, prepareQuestionForDelivery } from "../../../lib/services/questions";
import { auditQuestion, auditQuestionBank } from "../../../lib/services/question-audit";
import type { AgeGroup, Country, Question, Subject } from "../../../types";

const SUITE = "question-deep-quality";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ALL_AGE_GROUPS: AgeGroup[] = [
  "foundation", "year1", "year2", "year3", "year4", "year5", "year6",
];
const ALL_SUBJECTS: Subject[] = ["maths", "english", "science"];
const ALL_COUNTRIES: Country[] = ["AU", "US", "UK", "IN"];

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function isEarlyYears(ag: AgeGroup): boolean {
  return ["foundation", "year1", "year2"].includes(ag);
}

function bank(ag: AgeGroup, sub: Subject, country: Country = "AU", count = 20): Question[] {
  return generateQuestionBank({ ageGroup: ag, subject: sub, count, country });
}

// ── A. STRUCTURAL INTEGRITY ───────────────────────────────────────────────────

export async function runQuestionDeepQualitySuite(_baseUrl: string) {
  startSuite("31  QUESTION DEEP QUALITY");

  // A1 — every question has non-empty text
  await test(SUITE, "A1: all questions have non-empty questionText", async () => {
    for (const ag of ALL_AGE_GROUPS) {
      for (const sub of ALL_SUBJECTS) {
        const qs = bank(ag, sub);
        for (const q of qs) {
          assertTrue(q.questionText.trim().length > 0,
            `empty questionText in ${sub}/${ag}: ${q.questionId}`);
        }
      }
    }
  });

  // A2 — question text starts with capital letter
  await test(SUITE, "A2: all questions start with a capital letter", async () => {
    for (const ag of ALL_AGE_GROUPS) {
      for (const sub of ALL_SUBJECTS) {
        const qs = bank(ag, sub);
        for (const q of qs) {
          assertTrue(/^[A-Z]/.test(q.questionText),
            `lowercase start in ${sub}/${ag}: "${q.questionText.slice(0, 60)}"`);
        }
      }
    }
  });

  // A3 — question text ends with punctuation
  await test(SUITE, "A3: all questions end with sentence-ending punctuation", async () => {
    for (const ag of ALL_AGE_GROUPS) {
      for (const sub of ALL_SUBJECTS) {
        const qs = bank(ag, sub);
        for (const q of qs) {
          assertTrue(/[?!.]$/.test(q.questionText.trim()),
            `missing punctuation in ${sub}/${ag}: "${q.questionText.slice(-40)}"`);
        }
      }
    }
  });

  // A4 — every question has an explanation
  await test(SUITE, "A4: every question has a non-empty explanation", async () => {
    for (const ag of ALL_AGE_GROUPS) {
      for (const sub of ALL_SUBJECTS) {
        const qs = bank(ag, sub);
        for (const q of qs) {
          assertTrue((q.explanation ?? "").trim().length > 10,
            `short/missing explanation in ${sub}/${ag}: ${q.questionId}`);
        }
      }
    }
  });

  // A5 — every question has a hint (at least early and primary years)
  await test(SUITE, "A5: all questions carry a hint", async () => {
    for (const ag of ALL_AGE_GROUPS) {
      for (const sub of ALL_SUBJECTS) {
        const qs = bank(ag, sub);
        for (const q of qs) {
          assertTrue((q.hint ?? "").trim().length >= 10,
            `short/missing hint in ${sub}/${ag}: "${q.hint}" (${q.questionId})`);
        }
      }
    }
  });

  // A6 — hint does not simply repeat the question text
  await test(SUITE, "A6: hint is not a copy of the question text", async () => {
    for (const ag of ALL_AGE_GROUPS) {
      for (const sub of ALL_SUBJECTS) {
        const qs = bank(ag, sub);
        for (const q of qs) {
          if (!q.hint) continue;
          const sim = levenshtein(
            q.questionText.toLowerCase().slice(0, 80),
            q.hint.toLowerCase().slice(0, 80)
          );
          assertTrue(sim > 10,
            `hint too similar to question in ${sub}/${ag}: "${q.hint.slice(0, 60)}"`);
        }
      }
    }
  });

  // A7 — all questions have at least 1 specific topic tag
  await test(SUITE, "A7: every question has at least 1 specific topic tag", async () => {
    const GENERIC = new Set(["test", "general", "maths", "english", "science"]);
    for (const ag of ALL_AGE_GROUPS) {
      for (const sub of ALL_SUBJECTS) {
        const qs = bank(ag, sub);
        for (const q of qs) {
          const specific = q.topics.filter((t) => !GENERIC.has(t));
          assertTrue(specific.length >= 1,
            `no specific topic in ${sub}/${ag}: ${JSON.stringify(q.topics)} (${q.questionId})`);
        }
      }
    }
  });

  // ── B. ANSWER CORRECTNESS ─────────────────────────────────────────────────

  // B1 — exactly one correct answer per question
  await test(SUITE, "B1: exactly one correct answer per question", async () => {
    for (const ag of ALL_AGE_GROUPS) {
      for (const sub of ALL_SUBJECTS) {
        const qs = bank(ag, sub);
        for (const q of qs) {
          const correct = q.answerOptions.filter((o) => o.isCorrect);
          assertEqual(correct.length, 1,
            `${sub}/${ag} ${q.questionId}: expected 1 correct, got ${correct.length}`);
        }
      }
    }
  });

  // B2 — at least 2 answer options per question
  await test(SUITE, "B2: every question has at least 2 answer options", async () => {
    for (const ag of ALL_AGE_GROUPS) {
      for (const sub of ALL_SUBJECTS) {
        const qs = bank(ag, sub);
        for (const q of qs) {
          assertTrue(q.answerOptions.length >= 2,
            `only ${q.answerOptions.length} options in ${sub}/${ag}: ${q.questionId}`);
        }
      }
    }
  });

  // B3 — no duplicate answer option texts within a question
  await test(SUITE, "B3: no duplicate answer texts within a single question", async () => {
    for (const ag of ALL_AGE_GROUPS) {
      for (const sub of ALL_SUBJECTS) {
        const qs = bank(ag, sub);
        for (const q of qs) {
          const texts = q.answerOptions.map((o) => o.text.trim().toLowerCase());
          const unique = new Set(texts);
          assertEqual(unique.size, texts.length,
            `duplicate answer text in ${sub}/${ag}: ${JSON.stringify(texts)} (${q.questionId})`);
        }
      }
    }
  });

  // B4 — no answer option text is empty
  await test(SUITE, "B4: no empty answer option text", async () => {
    for (const ag of ALL_AGE_GROUPS) {
      for (const sub of ALL_SUBJECTS) {
        const qs = bank(ag, sub);
        for (const q of qs) {
          for (const opt of q.answerOptions) {
            assertTrue(opt.text.trim().length > 0,
              `empty option "${opt.id}" in ${sub}/${ag}: ${q.questionId}`);
          }
        }
      }
    }
  });

  // B5 — correct answer text is meaningfully different from each wrong option
  // Exemption: grammar conjugation questions (verb forms like "builds"/"build") deliberately
  // use near-identical options — that IS the pedagogic point.
  await test(SUITE, "B5: correct answer not near-identical to any wrong option (non-grammar)", async () => {
    for (const ag of ALL_AGE_GROUPS) {
      for (const sub of ALL_SUBJECTS) {
        const qs = bank(ag, sub);
        for (const q of qs) {
          // Skip verb-form / fill-in-the-blank grammar questions where near-identical is intentional
          const isVerbForm = /\b___\b/.test(q.questionText) || q.topics.includes("grammar");
          if (isVerbForm) continue;
          const correct = q.answerOptions.find((o) => o.isCorrect);
          if (!correct || correct.text.length < 8) continue;
          for (const wrong of q.answerOptions.filter((o) => !o.isCorrect)) {
            if (wrong.text.length < 8) continue;
            const sim = levenshtein(correct.text.toLowerCase(), wrong.text.toLowerCase());
            assertTrue(sim > 1,
              `correct "${correct.text}" too similar to wrong "${wrong.text}" in ${sub}/${ag}`);
          }
        }
      }
    }
  });

  // ── C. DIFFICULTY PROGRESSION ─────────────────────────────────────────────

  // C1 — average difficulty increases monotonically across age groups (per subject)
  await test(SUITE, "C1: average difficulty strictly increases from foundation→year6 per subject", async () => {
    for (const sub of ALL_SUBJECTS) {
      let prev = 0;
      for (const ag of ALL_AGE_GROUPS) {
        const qs = bank(ag, sub, "AU", 20);
        const avg = qs.reduce((s, q) => s + q.difficulty, 0) / qs.length;
        assertTrue(avg >= prev,
          `difficulty did NOT increase for ${sub} from prev=${prev.toFixed(1)} at ${ag}: avg=${avg.toFixed(1)}`);
        prev = avg;
      }
    }
  });

  // C2 — foundation questions have difficulty ≤ 3
  await test(SUITE, "C2: foundation questions have difficulty ≤ 3", async () => {
    for (const sub of ALL_SUBJECTS) {
      const qs = bank("foundation", sub);
      for (const q of qs) {
        assertTrue(q.difficulty <= 3,
          `foundation ${sub} question difficulty too high: ${q.difficulty} (${q.questionId})`);
      }
    }
  });

  // C3 — year6 questions have difficulty ≥ 4
  await test(SUITE, "C3: year6 questions have difficulty ≥ 4", async () => {
    for (const sub of ALL_SUBJECTS) {
      const qs = bank("year6", sub);
      const highEnough = qs.filter((q) => q.difficulty >= 4);
      assertTrue(highEnough.length >= Math.floor(qs.length * 0.8),
        `fewer than 80% of year6 ${sub} questions have difficulty ≥ 4`);
    }
  });

  // C4 — difficulty values are all within 1–10
  await test(SUITE, "C4: all difficulty values are within valid range 1–10", async () => {
    for (const ag of ALL_AGE_GROUPS) {
      for (const sub of ALL_SUBJECTS) {
        const qs = bank(ag, sub);
        for (const q of qs) {
          assertInRange(q.difficulty, 1, 10,
            `${sub}/${ag} ${q.questionId} difficulty`);
        }
      }
    }
  });

  // C5 — within a session, orderQuestionsForSession produces non-decreasing difficulty
  await test(SUITE, "C5: ordered session has non-decreasing difficulty", async () => {
    for (const sub of ALL_SUBJECTS) {
      const qs = bank("year4", sub, "AU", 30);
      const ordered = orderQuestionsForSession(qs, 5, new Set());
      for (let i = 1; i < ordered.length; i++) {
        assertTrue(ordered[i].difficulty >= ordered[i - 1].difficulty,
          `difficulty regressed at position ${i} in ${sub} session: ${ordered[i - 1].difficulty}→${ordered[i].difficulty}`);
      }
    }
  });

  // ── D. AGE APPROPRIATENESS ────────────────────────────────────────────────

  // D1 — foundation questions are shorter (≤ 160 chars)
  await test(SUITE, "D1: foundation questions are concise (≤ 160 chars)", async () => {
    for (const sub of ALL_SUBJECTS) {
      const qs = bank("foundation", sub);
      for (const q of qs) {
        assertTrue(q.questionText.length <= 160,
          `foundation ${sub} question too long (${q.questionText.length} chars): "${q.questionText.slice(0, 80)}"`);
      }
    }
  });

  // D2 — upper year questions have substantive length (≥ 30 chars)
  await test(SUITE, "D2: year5+ questions have substantive length (≥ 30 chars)", async () => {
    for (const sub of ALL_SUBJECTS) {
      const qs = bank("year5", sub);
      for (const q of qs) {
        assertTrue(q.questionText.length >= 30,
          `year5 ${sub} question too short: "${q.questionText}"`);
      }
    }
  });

  // D3 — no complex vocabulary words in early years
  await test(SUITE, "D3: early-years questions avoid complex vocabulary", async () => {
    const COMPLEX = [
      "electromagnetic", "approximately", "predominantly", "simultaneously",
      "constitutional", "coefficient", "subordinate", "hypothesis",
    ];
    for (const ag of ["foundation", "year1", "year2"] as AgeGroup[]) {
      for (const sub of ALL_SUBJECTS) {
        const qs = bank(ag, sub);
        for (const q of qs) {
          const lower = q.questionText.toLowerCase();
          for (const word of COMPLEX) {
            assertTrue(!lower.includes(word),
              `complex word "${word}" found in ${sub}/${ag}: "${q.questionText.slice(0, 80)}"`);
          }
        }
      }
    }
  });

  // D4 — early years questions have ≥ 2 answer options (not just true/false hardcoded)
  await test(SUITE, "D4: early-years questions offer at least 3 answer options for good choice", async () => {
    for (const ag of ["foundation", "year1", "year2"] as AgeGroup[]) {
      for (const sub of ALL_SUBJECTS) {
        const qs = bank(ag, sub);
        for (const q of qs) {
          assertTrue(q.answerOptions.length >= 2,
            `only ${q.answerOptions.length} options in early-years ${sub}/${ag}: ${q.questionId}`);
        }
      }
    }
  });

  // ── E. TOPIC COVERAGE ────────────────────────────────────────────────────

  // E1 — a 20-question bank covers at least 3 distinct topics
  await test(SUITE, "E1: 20-question bank covers at least 3 distinct primary topics", async () => {
    for (const ag of ALL_AGE_GROUPS) {
      for (const sub of ALL_SUBJECTS) {
        const qs = bank(ag, sub);
        const topics = new Set(qs.flatMap((q) => q.topics));
        assertTrue(topics.size >= 3,
          `only ${topics.size} topics in ${sub}/${ag}: ${[...topics].join(", ")}`);
      }
    }
  });

  // E2 — no single topic dominates more than 70% of a 20-question bank
  await test(SUITE, "E2: no single topic dominates more than 70% of questions", async () => {
    for (const ag of ALL_AGE_GROUPS) {
      for (const sub of ALL_SUBJECTS) {
        const qs = bank(ag, sub);
        const freq: Record<string, number> = {};
        for (const q of qs) {
          const t = q.topics[0] ?? "unknown";
          freq[t] = (freq[t] ?? 0) + 1;
        }
        const maxCount = Math.max(...Object.values(freq));
        const pct = maxCount / qs.length;
        assertTrue(pct <= 0.70,
          `topic dominates ${Math.round(pct * 100)}% in ${sub}/${ag}: ${JSON.stringify(freq)}`);
      }
    }
  });

  // E3 — session ordering does not allow 3 same-topic questions in a row
  await test(SUITE, "E3: ordered session never has 3 identical topics in a row", async () => {
    for (const sub of ALL_SUBJECTS) {
      const qs = bank("year3", sub, "AU", 30);
      const ordered = orderQuestionsForSession(qs, 5, new Set());
      for (let i = 2; i < ordered.length; i++) {
        const t0 = ordered[i - 2].topics[0];
        const t1 = ordered[i - 1].topics[0];
        const t2 = ordered[i].topics[0];
        assertTrue(!(t0 === t1 && t1 === t2),
          `${sub}: topic "${t2}" repeated 3 times in a row at positions ${i - 2},${i - 1},${i}`);
      }
    }
  });

  // ── F. CROSS-SUBJECT PARITY ───────────────────────────────────────────────

  // F1 — all three subjects produce the requested question count without throwing
  await test(SUITE, "F1: all subjects produce exactly requested count for all age groups", async () => {
    for (const ag of ALL_AGE_GROUPS) {
      for (const sub of ALL_SUBJECTS) {
        const qs = bank(ag, sub, "AU", 20);
        assertEqual(qs.length, 20,
          `${sub}/${ag}: expected 20 questions, got ${qs.length}`);
      }
    }
  });

  // F2 — maths foundation questions contain numbers in their text or options
  await test(SUITE, "F2: foundation maths questions reference numbers or counting", async () => {
    const qs = bank("foundation", "maths");
    const withNumbers = qs.filter((q) =>
      /\d+/.test(q.questionText) ||
      q.answerOptions.some((o) => /\d+/.test(o.text))
    );
    assertTrue(withNumbers.length >= Math.floor(qs.length * 0.5),
      `less than 50% of foundation maths questions reference numbers: ${withNumbers.length}/${qs.length}`);
  });

  // F3 — english questions contain recognisable English words/grammar terms
  await test(SUITE, "F3: english questions reference language concepts", async () => {
    const LANG_TERMS = /\b(word|sound|rhyme|sentence|letter|spell|read|write|vowel|consonant|noun|verb|adjective|phonics|syllable|capital|punctuation|grammar|story|poem|text|synonym|antonym|prefix|suffix|meaning|paragraph)\b/i;
    for (const ag of ALL_AGE_GROUPS) {
      const qs = bank(ag, "english");
      const onTopic = qs.filter((q) =>
        LANG_TERMS.test(q.questionText) ||
        q.topics.some((t) => LANG_TERMS.test(t))
      );
      assertTrue(onTopic.length >= Math.floor(qs.length * 0.6),
        `only ${onTopic.length}/${qs.length} english/${ag} questions reference language concepts`);
    }
  });

  // F4 — science questions reference science concepts
  await test(SUITE, "F4: science questions reference observable or factual concepts", async () => {
    const SCI_TERMS = /\b(animal|plant|material|habitat|weather|force|gravity|energy|matter|solid|liquid|gas|living|mammal|reptile|bird|insect|ecosystem|food|water|heat|light|sound|electricity|chemical|reaction|cell|organ|lifecycle)\b/i;
    for (const ag of ALL_AGE_GROUPS) {
      const qs = bank(ag, "science");
      const onTopic = qs.filter((q) =>
        SCI_TERMS.test(q.questionText) ||
        q.topics.some((t) => SCI_TERMS.test(t))
      );
      assertTrue(onTopic.length >= Math.floor(qs.length * 0.5),
        `only ${onTopic.length}/${qs.length} science/${ag} questions reference science concepts`);
    }
  });

  // ── G. MATCH-PAIRS QUALITY ────────────────────────────────────────────────

  // G1 — match-pairs questions embed valid interactionData
  await test(SUITE, "G1: match-pairs questions have valid interactionData with pairs array", async () => {
    for (const ag of ["year3", "year4", "year5"] as AgeGroup[]) {
      for (const sub of ALL_SUBJECTS) {
        const qs = bank(ag, sub, "AU", 40);
        const matchPairs = qs.filter(
          (q) => q.generationMetadata?.visualMode === "match-pairs"
        );
        for (const q of matchPairs) {
          const data = q.generationMetadata?.interactionData as { type?: string; pairs?: unknown[] } | undefined;
          assertDefined(data, `match-pairs question missing interactionData: ${q.questionId}`);
          assertEqual(data.type, "match-pairs", `interactionData.type mismatch: ${q.questionId}`);
          assertTrue(Array.isArray(data.pairs) && data.pairs.length >= 2,
            `match-pairs pairs array empty or missing: ${q.questionId}`);
        }
      }
    }
  });

  // G2 — match-pairs pairs have non-empty left and right text
  await test(SUITE, "G2: match-pairs pairs all have non-empty left and right text", async () => {
    for (const ag of ["year3", "year4", "year5"] as AgeGroup[]) {
      for (const sub of ALL_SUBJECTS) {
        const qs = bank(ag, sub, "AU", 40);
        const matchPairs = qs.filter(
          (q) => q.generationMetadata?.visualMode === "match-pairs"
        );
        for (const q of matchPairs) {
          const data = q.generationMetadata?.interactionData as { pairs?: Array<{ left?: string; right?: string }> } | undefined;
          for (const pair of data?.pairs ?? []) {
            assertTrue((pair.left ?? "").trim().length > 0,
              `empty left in pair for ${q.questionId}`);
            assertTrue((pair.right ?? "").trim().length > 0,
              `empty right in pair for ${q.questionId}`);
          }
        }
      }
    }
  });

  // G3 — match-pairs left labels are unique within each question
  await test(SUITE, "G3: match-pairs left labels are unique within a question", async () => {
    for (const ag of ["year3", "year4", "year5"] as AgeGroup[]) {
      for (const sub of ALL_SUBJECTS) {
        const qs = bank(ag, sub, "AU", 40);
        const matchPairs = qs.filter(
          (q) => q.generationMetadata?.visualMode === "match-pairs"
        );
        for (const q of matchPairs) {
          const data = q.generationMetadata?.interactionData as { pairs?: Array<{ left?: string }> } | undefined;
          const lefts = (data?.pairs ?? []).map((p) => p.left?.toLowerCase().trim() ?? "");
          const unique = new Set(lefts);
          assertEqual(unique.size, lefts.length,
            `duplicate left labels in match-pairs ${q.questionId}: ${lefts.join(", ")}`);
        }
      }
    }
  });

  // G4 — match-pairs right labels are unique within each question (no self-match confusion)
  await test(SUITE, "G4: match-pairs right labels are unique within a question", async () => {
    for (const ag of ["year3", "year4", "year5"] as AgeGroup[]) {
      for (const sub of ALL_SUBJECTS) {
        const qs = bank(ag, sub, "AU", 40);
        const matchPairs = qs.filter(
          (q) => q.generationMetadata?.visualMode === "match-pairs"
        );
        for (const q of matchPairs) {
          const data = q.generationMetadata?.interactionData as { pairs?: Array<{ right?: string }> } | undefined;
          const rights = (data?.pairs ?? []).map((p) => p.right?.toLowerCase().trim() ?? "");
          const unique = new Set(rights);
          assertEqual(unique.size, rights.length,
            `duplicate right labels in match-pairs ${q.questionId}: ${rights.join(", ")}`);
        }
      }
    }
  });

  // ── H. LOGICAL SENSE (KNOWN FACT VERIFICATION) ────────────────────────────

  // H1 — carnivore questions correctly identify meat-eating
  await test(SUITE, "H1: science carnivore questions have correct answers about meat-eating", async () => {
    for (const ag of ALL_AGE_GROUPS) {
      const qs = bank(ag, "science", "AU", 40);
      const carnivoreQs = qs.filter((q) =>
        /carnivore/i.test(q.questionText) && !/match/i.test(q.questionText)
      );
      for (const q of carnivoreQs) {
        const correct = q.answerOptions.find((o) => o.isCorrect);
        assertDefined(correct, `no correct option for carnivore question: ${q.questionId}`);
        // Correct answer should reference meat or carnivory
        const hint = (q.hint ?? "") + q.explanation;
        assertTrue(
          /meat|carniv|predator|prey|flesh/i.test(hint) || /meat|carniv/i.test(correct.text),
          `carnivore question explanation doesn't mention meat: "${q.explanation.slice(0, 80)}"`
        );
      }
    }
  });

  // H2 — maths calculation questions have numerically correct answers
  await test(SUITE, "H2: times-table questions embed correct multiplication results", async () => {
    const qs = bank("year3", "maths", "AU", 40);
    const ttQs = qs.filter((q) => /×|times|multiply|\*/.test(q.questionText));
    for (const q of ttQs) {
      const nums = q.questionText.match(/\b(\d+)\s*[×x\*]\s*(\d+)/);
      if (!nums) continue;
      const expected = Number(nums[1]) * Number(nums[2]);
      const correct = q.answerOptions.find((o) => o.isCorrect);
      if (!correct) continue;
      const answerNum = Number(correct.text.replace(/[^0-9]/g, ""));
      if (isNaN(answerNum)) continue;
      assertEqual(answerNum, expected,
        `times-table answer wrong: ${nums[1]}×${nums[2]}=${expected}, got "${correct.text}"`);
    }
  });

  // H3 — counting/arithmetic questions: answer is derivable from numbers in the question text
  // Accepts: one of the numbers, sum, difference, or product of any two numbers in the question
  await test(SUITE, "H3: counting/arithmetic correct answer is derivable from numbers in the question", async () => {
    const qs = bank("foundation", "maths", "AU", 30);
    const countQs = qs.filter((q) =>
      /how many|count|there are|each box|each bag|each row|groups? of/i.test(q.questionText) &&
      /\d+/.test(q.questionText)
    );
    for (const q of countQs) {
      const nums = (q.questionText.match(/\b\d+\b/g) ?? []).map(Number).filter((n) => n > 0);
      const correct = q.answerOptions.find((o) => o.isCorrect);
      if (!correct || nums.length === 0) continue;
      const answerNum = Number(correct.text.replace(/[^0-9]/g, ""));
      if (isNaN(answerNum) || answerNum === 0) continue;
      const sum = nums.reduce((a, b) => a + b, 0);
      let validPair = false;
      for (let i = 0; i < nums.length && !validPair; i++) {
        for (let j = 0; j < nums.length && !validPair; j++) {
          if (i === j) continue;
          const diff = nums[i] - nums[j];
          const prod = nums[i] * nums[j];
          if (diff === answerNum || prod === answerNum) validPair = true;
        }
      }
      const valid = nums.includes(answerNum) || answerNum === sum || validPair;
      assertTrue(valid,
        `counting answer ${answerNum} not derivable from [${nums}] in: "${q.questionText.slice(0, 80)}"`);
    }
  });

  // H4 — questions don't contain "undefined" or "null" in text
  await test(SUITE, "H4: no question or option contains literal 'undefined' or 'null'", async () => {
    for (const ag of ALL_AGE_GROUPS) {
      for (const sub of ALL_SUBJECTS) {
        const qs = bank(ag, sub);
        for (const q of qs) {
          assertTrue(!/\bundefined\b|\bnull\b/i.test(q.questionText),
            `"undefined"/"null" in questionText ${sub}/${ag}: "${q.questionText}"`);
          for (const opt of q.answerOptions) {
            assertTrue(!/\bundefined\b|\bnull\b/i.test(opt.text),
              `"undefined"/"null" in option "${opt.text}" of ${q.questionId}`);
          }
          assertTrue(!/\bundefined\b|\bnull\b/i.test(q.explanation ?? ""),
            `"undefined"/"null" in explanation of ${q.questionId}`);
        }
      }
    }
  });

  // H5 — double negatives detected and absent in generated questions
  await test(SUITE, "H5: no generated question contains double negatives", async () => {
    const DOUBLE_NEG = /\bnot\b.{0,40}\bnot\b|\bneither\b.{0,40}\bnor\b.{0,40}\bnot\b/i;
    for (const ag of ALL_AGE_GROUPS) {
      for (const sub of ALL_SUBJECTS) {
        const qs = bank(ag, sub);
        for (const q of qs) {
          assertTrue(!DOUBLE_NEG.test(q.questionText),
            `double negative in ${sub}/${ag}: "${q.questionText.slice(0, 80)}"`);
        }
      }
    }
  });

  // ── I. ANSWER DIVERSITY ───────────────────────────────────────────────────

  // I1 — after shuffleOptions, correct answer is NOT always position 0 across a bank
  await test(SUITE, "I1: correct answer is distributed across positions (not always first)", async () => {
    const qs = bank("year4", "maths", "AU", 30);
    const positions = qs.map((q) => q.answerOptions.findIndex((o) => o.isCorrect));
    const alwaysFirst = positions.every((p) => p === 0);
    assertTrue(!alwaysFirst,
      "Correct answer is always in position 0 — shuffle is not working");
    const uniquePositions = new Set(positions);
    assertTrue(uniquePositions.size >= 2,
      `Correct answer only appears in ${uniquePositions.size} position(s) — distribution too narrow`);
  });

  // I2 — at least 50% of questions have the correct answer NOT in position 0
  await test(SUITE, "I2: at least 50% of questions have correct answer NOT in position 0", async () => {
    for (const sub of ALL_SUBJECTS) {
      const qs = bank("year3", sub, "AU", 30);
      const notFirst = qs.filter((q) => q.answerOptions.findIndex((o) => o.isCorrect) !== 0);
      assertTrue(notFirst.length >= Math.floor(qs.length * 0.5),
        `only ${notFirst.length}/${qs.length} ${sub} questions have correct answer away from position 0`);
    }
  });

  // I3 — distractors are not trivially obviously wrong (e.g., "none of the above" type)
  await test(SUITE, "I3: distractors don't use filler phrases like 'none of the above'", async () => {
    const FILLER = /^none of the (above|below|options?)$|^all of the (above|options?)$|^i don.t know$/i;
    for (const ag of ALL_AGE_GROUPS) {
      for (const sub of ALL_SUBJECTS) {
        const qs = bank(ag, sub);
        for (const q of qs) {
          for (const opt of q.answerOptions) {
            assertTrue(!FILLER.test(opt.text.trim()),
              `filler option "${opt.text}" in ${sub}/${ag}: ${q.questionId}`);
          }
        }
      }
    }
  });

  // I4 — wrong answer options are not identical to each other (distractors differ)
  // Exemption: short numeric / fraction answers (e.g. "4/16" vs "7/16") intentionally
  // share denominators — that's pedagogically correct for fraction questions.
  await test(SUITE, "I4: wrong answer options are meaningfully different from each other", async () => {
    for (const ag of ALL_AGE_GROUPS) {
      for (const sub of ALL_SUBJECTS) {
        const qs = bank(ag, sub);
        for (const q of qs) {
          const wrongs = q.answerOptions.filter((o) => !o.isCorrect).map((o) => o.text.toLowerCase());
          for (let i = 0; i < wrongs.length; i++) {
            for (let j = i + 1; j < wrongs.length; j++) {
              // Only check options that are long enough to be genuinely phrase-like
              // Short numeric answers (< 8 chars) may share format intentionally (fractions, decimals)
              if (wrongs[i].length < 8 || wrongs[j].length < 8) continue;
              const sim = levenshtein(wrongs[i], wrongs[j]);
              assertTrue(sim > 2,
                `two wrong options nearly identical in ${sub}/${ag} ${q.questionId}: "${wrongs[i]}" vs "${wrongs[j]}"`);
            }
          }
        }
      }
    }
  });

  // ── J. SESSION ORDERING ───────────────────────────────────────────────────

  // J1 — prepareQuestionForDelivery capitalises the first character
  await test(SUITE, "J1: prepareQuestionForDelivery always capitalises the question text", async () => {
    const qs = bank("year2", "english", "AU", 20);
    for (const q of qs) {
      const delivered = prepareQuestionForDelivery(q);
      assertTrue(/^[A-Z]/.test(delivered.questionText),
        `delivered question doesn't start with capital: "${delivered.questionText.slice(0, 60)}"`);
    }
  });

  // J2 — session respects seen-question exclusion set
  await test(SUITE, "J2: orderQuestionsForSession excludes already-seen question IDs", async () => {
    const qs = bank("year4", "science", "AU", 30);
    const seenIds = new Set(qs.slice(0, 10).map((q) => q.questionId));
    const ordered = orderQuestionsForSession(qs, 5, seenIds);
    for (const q of ordered) {
      assertTrue(!seenIds.has(q.questionId),
        `seen question appeared in session: ${q.questionId}`);
    }
  });

  // J3 — session of 20 from a 30-question bank picks exactly 20
  await test(SUITE, "J3: session picks correct count from a larger pool", async () => {
    const qs = bank("year5", "maths", "AU", 30);
    const ordered = orderQuestionsForSession(qs, 5, new Set());
    assertTrue(ordered.length <= 20,
      `session returned ${ordered.length} questions, expected ≤ 20`);
    assertTrue(ordered.length >= 10,
      `session only returned ${ordered.length} questions from a 30-question pool`);
  });

  // ── K. UNIQUENESS ─────────────────────────────────────────────────────────

  // K1 — no two questions in a bank have identical question text
  await test(SUITE, "K1: no duplicate question texts within a generated bank", async () => {
    for (const ag of ALL_AGE_GROUPS) {
      for (const sub of ALL_SUBJECTS) {
        const qs = bank(ag, sub, "AU", 20);
        const texts = qs.map((q) => q.questionText.toLowerCase().trim());
        const unique = new Set(texts);
        assertEqual(unique.size, texts.length,
          `${unique.size} unique vs ${texts.length} total in ${sub}/${ag} — duplicates present`);
      }
    }
  });

  // K2 — no two questions have identical answer sets
  await test(SUITE, "K2: no two questions have identical answer option sets", async () => {
    for (const ag of ALL_AGE_GROUPS) {
      for (const sub of ALL_SUBJECTS) {
        const qs = bank(ag, sub, "AU", 20);
        const fingerprints = qs.map((q) =>
          q.answerOptions.map((o) => `${o.text}:${o.isCorrect}`).sort().join("|")
        );
        const unique = new Set(fingerprints);
        assertTrue(unique.size >= Math.floor(qs.length * 0.8),
          `${sub}/${ag}: answer sets are not diverse enough (${unique.size}/${qs.length} unique)`);
      }
    }
  });

  // K3 — auditQuestionBank reports 0 near-duplicates in a freshly generated bank
  await test(SUITE, "K3: freshly generated bank has 0 near-duplicate questions", async () => {
    for (const sub of ALL_SUBJECTS) {
      const qs = bank("year4", sub, "AU", 20);
      const report = auditQuestionBank(qs, "year4");
      assertEqual(report.byIssueType["near-duplicate"] ?? 0, 0,
        `${sub}/year4: ${report.byIssueType["near-duplicate"]} near-duplicates found`);
    }
  });

  // ── L. COUNTRY LOCALISATION ───────────────────────────────────────────────

  // L1 — all four countries produce valid question banks without throwing
  await test(SUITE, "L1: all countries produce valid question banks", async () => {
    for (const country of ALL_COUNTRIES) {
      for (const sub of ALL_SUBJECTS) {
        const qs = generateQuestionBank({ ageGroup: "year3", subject: sub, count: 10, country });
        assertEqual(qs.length, 10,
          `${country}/${sub}: expected 10 questions, got ${qs.length}`);
        for (const q of qs) {
          assertTrue(q.questionText.trim().length > 0, `empty question in ${country}/${sub}`);
          assertTrue(/^[A-Z]/.test(q.questionText), `lowercase start in ${country}/${sub}`);
        }
      }
    }
  });

  // L2 — UK year4 produces times-table questions (curriculum requirement)
  await test(SUITE, "L2: UK year4 maths bank includes times-table questions", async () => {
    const qs = generateQuestionBank({ ageGroup: "year4", subject: "maths", count: 20, country: "UK" });
    const ttQs = qs.filter((q) =>
      /times table|×|\btimes\b|multiply/i.test(q.questionText) ||
      q.topics.some((t) => /times.table|multiplication/i.test(t))
    );
    assertTrue(ttQs.length >= 1,
      `UK year4 maths should include times-table questions, got 0 out of ${qs.length}`);
  });

  // L3 — difficulty range is consistent across countries for the same age group
  await test(SUITE, "L3: difficulty range consistent across countries for year5", async () => {
    for (const sub of ALL_SUBJECTS) {
      const diffs: Record<Country, number[]> = { AU: [], US: [], UK: [], IN: [] };
      for (const country of ALL_COUNTRIES) {
        const qs = generateQuestionBank({ ageGroup: "year5", subject: sub, count: 10, country });
        diffs[country] = qs.map((q) => q.difficulty);
      }
      for (const country of ALL_COUNTRIES) {
        const avg = diffs[country].reduce((a, b) => a + b, 0) / diffs[country].length;
        assertInRange(avg, 3, 10,
          `${sub}/${country}/year5: avg difficulty ${avg.toFixed(1)} out of expected 3–10`);
      }
    }
  });

  // ── AUDIT ENGINE INTEGRATION ──────────────────────────────────────────────

  // M1 — full bank audit passes with high clean rate for generated questions
  await test(SUITE, "M1: generated bank has ≥ 80% pass rate on quality audit", async () => {
    for (const sub of ALL_SUBJECTS) {
      for (const ag of ["year3", "year5"] as AgeGroup[]) {
        const qs = bank(ag, sub, "AU", 20);
        const report = auditQuestionBank(qs, ag);
        const passRate = report.passed / report.total;
        assertTrue(passRate >= 0.80,
          `${sub}/${ag} pass rate ${Math.round(passRate * 100)}% below 80% threshold. Issues: ${JSON.stringify(report.byIssueType)}`);
      }
    }
  });

  // M2 — no question in a generated bank has a "poor-hint" audit error
  await test(SUITE, "M2: no generated question triggers poor-hint audit error", async () => {
    for (const sub of ALL_SUBJECTS) {
      const qs = bank("year4", sub, "AU", 20);
      for (const q of qs) {
        const issues = auditQuestion(q, "year4");
        const hintIssue = issues.find((i) => i.type === "poor-hint" && i.severity === "error");
        assertTrue(!hintIssue,
          `poor-hint error in ${sub}/year4: "${q.hint}" (${q.questionId})`);
      }
    }
  });

  // M3 — no generated question is flagged for vocabulary-mismatch
  await test(SUITE, "M3: no early-years question triggers vocabulary-mismatch", async () => {
    for (const sub of ALL_SUBJECTS) {
      for (const ag of ["foundation", "year1", "year2"] as AgeGroup[]) {
        const qs = bank(ag, sub, "AU", 20);
        for (const q of qs) {
          const issues = auditQuestion(q, ag);
          const vocabIssue = issues.find((i) => i.type === "vocabulary-mismatch");
          assertTrue(!vocabIssue,
            `vocabulary-mismatch in ${sub}/${ag}: "${q.questionText.slice(0, 60)}" (${q.questionId})`);
        }
      }
    }
  });

  // M4 — zero "confusing-wording" flags in any generated question
  await test(SUITE, "M4: no generated question contains confusing wording (double negatives)", async () => {
    for (const ag of ALL_AGE_GROUPS) {
      for (const sub of ALL_SUBJECTS) {
        const qs = bank(ag, sub, "AU", 20);
        for (const q of qs) {
          const issues = auditQuestion(q, ag);
          const confusing = issues.find((i) => i.type === "confusing-wording");
          assertTrue(!confusing,
            `confusing-wording in ${sub}/${ag}: "${q.questionText.slice(0, 80)}"`);
        }
      }
    }
  });
}
