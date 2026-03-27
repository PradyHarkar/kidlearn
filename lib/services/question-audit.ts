/**
 * QUESTION QUALITY AUDIT
 * ──────────────────────
 * Analyses individual questions (and optionally a full bank) for quality issues.
 * Does NOT modify anything — read-only diagnostic tool.
 *
 * Checks:
 *   1. lowercase-start      — question text doesn't begin with a capital letter
 *   2. poor-hint            — hint is missing, too short, or just restates the question
 *   3. missing-question-mark — question text doesn't end with a "?" (or "." for fill-in-blank)
 *   4. ambiguous-answer     — correct answer text is too similar to a wrong option
 *   5. vocabulary-mismatch  — complex words used for early-years age groups
 *   6. confusing-wording    — double negatives or "which is NOT NOT" patterns
 *   7. near-duplicate       — bank-level: near-identical question already seen
 *   8. topic-mismatch       — topic tags are empty, generic ("test"), or duplicate the subject name only
 */

import type { AgeGroup, Question } from "@/types";

export type AuditIssueType =
  | "lowercase-start"
  | "poor-hint"
  | "missing-question-mark"
  | "ambiguous-answer"
  | "vocabulary-mismatch"
  | "confusing-wording"
  | "near-duplicate"
  | "topic-mismatch";

export interface AuditIssue {
  type: AuditIssueType;
  severity: "error" | "warning";
  message: string;
}

export interface QuestionAuditResult {
  questionId: string;
  questionText: string;
  ageGroup: AgeGroup | undefined;
  issues: AuditIssue[];
  pass: boolean;  // true = no errors (warnings still allowed)
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EARLY_YEARS: AgeGroup[] = ["foundation", "year1", "year2"];

/** Words that are inappropriate complexity for early-years learners */
const COMPLEX_WORDS_EARLY = [
  "equivalent", "hypothesis", "magnitude", "perpendicular", "subordinate",
  "approximately", "predominantly", "arbitrary", "coefficient", "protagonist",
  "subsequently", "simultaneously", "constitutional", "electromagnetic",
];

/** Stop words that add no topical value */
const GENERIC_TOPICS = new Set(["test", "test-topic", "maths", "english", "science", "general"]);

// ── Helpers ───────────────────────────────────────────────────────────────────

function isEarlyYears(ageGroup: AgeGroup | undefined): boolean {
  return !!ageGroup && EARLY_YEARS.includes(ageGroup);
}

/**
 * Levenshtein distance — used to detect near-duplicate answer options.
 * Capped at maxDist to short-circuit for very different strings.
 */
function editDistance(a: string, b: string, maxDist = 5): number {
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > maxDist) return maxDist + 1;
  const row: number[] = Array.from({ length: lb + 1 }, (_, i) => i);
  for (let i = 1; i <= la; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= lb; j++) {
      const temp = row[j];
      row[j] =
        a[i - 1] === b[j - 1]
          ? prev
          : 1 + Math.min(prev, row[j], row[j - 1]);
      prev = temp;
    }
  }
  return row[lb];
}

/** Normalise text for near-duplicate fingerprinting */
function normalise(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").replace(/['"]/g, "").trim();
}

// ── Single-question audit ─────────────────────────────────────────────────────

export function auditQuestion(
  question: Question,
  ageGroup?: AgeGroup
): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const text = question.questionText.trim();
  const ag = ageGroup ?? question.ageGroup;

  // 1. Capitalisation
  if (text.length > 0) {
    const first = text[0];
    if (first !== first.toUpperCase() || first === first.toLowerCase()) {
      // second condition catches digits/punctuation — those are fine
      if (/[a-z]/.test(first)) {
        issues.push({
          type: "lowercase-start",
          severity: "error",
          message: `Question starts with lowercase "${first}": "${text.slice(0, 60)}…"`,
        });
      }
    }
  }

  // 2. Missing question mark / trailing punctuation
  // Allow closing quote (") for fill-in-the-blank questions like: 'Choose the word: "The dog ___"'
  const lastChar = text.slice(-1);
  const validEndings = ["?", ".", "!", '"', "'"];
  if (!validEndings.includes(lastChar)) {
    issues.push({
      type: "missing-question-mark",
      severity: "warning",
      message: `Question text doesn't end with punctuation (ends with "${lastChar}")`,
    });
  }

  // 3. Hint quality
  const hint = question.hint?.trim() ?? "";
  if (!hint || hint.length < 10) {
    issues.push({
      type: "poor-hint",
      severity: "warning",
      message: hint ? `Hint is very short (${hint.length} chars): "${hint}"` : "Hint is missing",
    });
  } else if (normalise(hint) === normalise(text)) {
    issues.push({
      type: "poor-hint",
      severity: "warning",
      message: `Hint is identical to the question text — not helpful`,
    });
  } else if (hint.length > 0 && text.length > 0) {
    // Hint starts with the same 30+ chars as the question — likely a copy-paste
    const overlap = 30;
    if (
      hint.length >= overlap &&
      text.length >= overlap &&
      normalise(hint).startsWith(normalise(text).slice(0, overlap))
    ) {
      issues.push({
        type: "poor-hint",
        severity: "warning",
        message: `Hint seems to be a copy of the question text`,
      });
    }
  }

  // 4. Ambiguous correct answer (correct option has edit-distance ≤ 2 to a wrong option)
  const correct = question.answerOptions.find((o) => o.isCorrect);
  const wrong = question.answerOptions.filter((o) => !o.isCorrect);
  if (correct) {
    const correctNorm = normalise(correct.text);
    for (const w of wrong) {
      const wrongNorm = normalise(w.text);
      // Only flag if both are ≥5 chars (single letters/numbers are fine to be similar)
      if (correctNorm.length >= 5 && wrongNorm.length >= 5) {
        const dist = editDistance(correctNorm, wrongNorm, 2);
        if (dist <= 1) {
          issues.push({
            type: "ambiguous-answer",
            severity: "warning",
            message: `Correct answer "${correct.text}" is nearly identical to wrong option "${w.text}" (edit distance ${dist})`,
          });
          break;
        }
      }
    }
  }

  // 5. Vocabulary mismatch (complex words for early years)
  if (isEarlyYears(ag)) {
    const lowerText = text.toLowerCase();
    for (const word of COMPLEX_WORDS_EARLY) {
      if (lowerText.includes(word)) {
        issues.push({
          type: "vocabulary-mismatch",
          severity: "error",
          message: `"${word}" is too complex for ${ag ?? "early years"} learners`,
        });
        break; // one flag per question is enough
      }
    }
  }

  // 6. Confusing wording — double negatives
  if (/\bnot\b.{1,30}\bnot\b/i.test(text) || /\bnever\s+not\b/i.test(text)) {
    issues.push({
      type: "confusing-wording",
      severity: "warning",
      message: `Question contains a double negative, which can confuse children`,
    });
  }

  // 7. Topic mismatch — empty, all-generic, or single-element topics that are just the subject name
  const meaningfulTopics = (question.topics ?? []).filter((t) => !GENERIC_TOPICS.has(t.toLowerCase().trim()));
  if (meaningfulTopics.length === 0) {
    issues.push({
      type: "topic-mismatch",
      severity: "warning",
      message: `No meaningful topic tags (got: [${(question.topics ?? []).join(", ")}])`,
    });
  }

  return issues;
}

// ── Bank-level audit (includes near-duplicate detection) ─────────────────────

export interface BankAuditResult {
  total: number;
  passed: number;
  failed: number;          // has at least one "error"
  withWarnings: number;    // has warnings but no errors
  byIssueType: Partial<Record<AuditIssueType, number>>;
  results: QuestionAuditResult[];
}

export function auditQuestionBank(
  questions: Question[],
  ageGroup?: AgeGroup
): BankAuditResult {
  const fingerprints = new Map<string, string>(); // fingerprint → questionId
  const results: QuestionAuditResult[] = [];

  for (const question of questions) {
    const ag = ageGroup ?? question.ageGroup;
    const issues = auditQuestion(question, ag);

    // 8. Near-duplicate detection (bank-level)
    const fp = normalise(question.questionText);
    const existing = fingerprints.get(fp);
    if (existing) {
      issues.push({
        type: "near-duplicate",
        severity: "error",
        message: `Duplicate question text — also seen as questionId "${existing}"`,
      });
    } else {
      fingerprints.set(fp, question.questionId);
    }

    const hasError = issues.some((i) => i.severity === "error");
    results.push({
      questionId: question.questionId,
      questionText: question.questionText,
      ageGroup: ag,
      issues,
      pass: !hasError,
    });
  }

  // Tally
  const byIssueType: Partial<Record<AuditIssueType, number>> = {};
  let failed = 0;
  let withWarnings = 0;

  for (const r of results) {
    for (const issue of r.issues) {
      byIssueType[issue.type] = (byIssueType[issue.type] ?? 0) + 1;
    }
    if (!r.pass) {
      failed += 1;
    } else if (r.issues.length > 0) {
      withWarnings += 1;
    }
  }

  return {
    total: questions.length,
    passed: results.filter((r) => r.pass).length,
    failed,
    withWarnings,
    byIssueType,
    results,
  };
}
