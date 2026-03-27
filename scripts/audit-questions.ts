#!/usr/bin/env npx tsx
/**
 * KidLearn Question Quality Audit Report
 * ───────────────────────────────────────
 * Scans the generated question bank and reports quality issues.
 *
 * Usage:
 *   npx tsx scripts/audit-questions.ts
 *   npx tsx scripts/audit-questions.ts --subject english
 *   npx tsx scripts/audit-questions.ts --subject english --ageGroup year8
 *   npx tsx scripts/audit-questions.ts --country AU --verbose
 *
 * Options:
 *   --subject   <maths|english|science>          filter by subject
 *   --ageGroup  <foundation|year1|...|year8>     filter by age group
 *   --country   <AU|US|IN|UK>                    (default: AU)
 *   --count     <N>                              questions per cell (default: 30)
 *   --verbose                                    show each flagged question text
 */

import { generateQuestionBankMatrix } from "../lib/content/question-bank";
import { auditQuestionBank } from "../lib/services/question-audit";
import type { AuditIssueType } from "../lib/services/question-audit";
import type { AgeGroup, Country, Subject } from "../types";

// ── CLI args ──────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
function arg(name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 ? argv[i + 1] : undefined;
}
const subjectFilter  = arg("subject")  as Subject  | undefined;
const ageGroupFilter = arg("ageGroup") as AgeGroup | undefined;
const country        = (arg("country") ?? "AU") as Country;
const countPerCell   = parseInt(arg("count") ?? "30", 10);
const verbose        = argv.includes("--verbose");

// ── Helpers ───────────────────────────────────────────────────────────────────

const RESET  = "\x1b[0m";
const BOLD   = "\x1b[1m";
const RED    = "\x1b[31m";
const YELLOW = "\x1b[33m";
const GREEN  = "\x1b[32m";
const CYAN   = "\x1b[36m";
const DIM    = "\x1b[2m";

function bar(n: number, total: number, width = 20): string {
  const filled = Math.round((n / Math.max(total, 1)) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function pct(n: number, total: number): string {
  return total === 0 ? "n/a" : `${Math.round((n / total) * 100)}%`;
}

const ISSUE_LABELS: Record<AuditIssueType, string> = {
  "lowercase-start":       "Lowercase start",
  "poor-hint":             "Poor / missing hint",
  "missing-question-mark": "Missing punctuation",
  "ambiguous-answer":      "Ambiguous answer",
  "vocabulary-mismatch":   "Vocab too complex (early years)",
  "confusing-wording":     "Confusing wording",
  "near-duplicate":        "Near-duplicate",
  "topic-mismatch":        "Generic/missing topics",
};

// ── Generate question bank ────────────────────────────────────────────────────

console.log(`\n${BOLD}${CYAN}KidLearn Question Quality Audit${RESET}`);
console.log(`${DIM}Country: ${country} | Per cell: ${countPerCell} | ${new Date().toLocaleString()}${RESET}\n`);

console.log("Generating question bank…");
let allQuestions = generateQuestionBankMatrix(countPerCell, country);

// Filter if requested
if (subjectFilter) {
  allQuestions = allQuestions.filter((q) => q.subject === subjectFilter);
  console.log(`  Filtered to subject: ${subjectFilter}`);
}
if (ageGroupFilter) {
  allQuestions = allQuestions.filter((q) => q.ageGroup === ageGroupFilter);
  console.log(`  Filtered to ageGroup: ${ageGroupFilter}`);
}

console.log(`  ${allQuestions.length} questions loaded\n`);

// ── Run audit ─────────────────────────────────────────────────────────────────

const report = auditQuestionBank(allQuestions);

// ── Summary banner ────────────────────────────────────────────────────────────

const passColor  = report.failed === 0 ? GREEN : RED;
const warnColor  = report.withWarnings > 0 ? YELLOW : GREEN;

console.log(`${BOLD}═══════════════════════════════════════════════════${RESET}`);
console.log(`${BOLD}  SUMMARY${RESET}`);
console.log(`${BOLD}═══════════════════════════════════════════════════${RESET}`);
console.log(`  Total questions : ${BOLD}${report.total}${RESET}`);
console.log(`  ${GREEN}Passed (no errors)${RESET} : ${BOLD}${report.passed}${RESET} ${DIM}(${pct(report.passed, report.total)})${RESET}  ${bar(report.passed, report.total)}`);
console.log(`  ${passColor}Failed (≥1 error)${RESET}  : ${BOLD}${report.failed}${RESET} ${DIM}(${pct(report.failed, report.total)})${RESET}  ${bar(report.failed, report.total)}`);
console.log(`  ${warnColor}Warnings only${RESET}     : ${BOLD}${report.withWarnings}${RESET} ${DIM}(${pct(report.withWarnings, report.total)})${RESET}  ${bar(report.withWarnings, report.total)}`);
console.log();

// ── Issue breakdown ───────────────────────────────────────────────────────────

console.log(`${BOLD}  ISSUE BREAKDOWN${RESET}`);
console.log(`  ${"─".repeat(47)}`);

const issueEntries = Object.entries(report.byIssueType) as [AuditIssueType, number][];
issueEntries.sort(([, a], [, b]) => b - a);

for (const [type, count] of issueEntries) {
  const label = ISSUE_LABELS[type] ?? type;
  const color = type === "near-duplicate" || type === "lowercase-start" || type === "vocabulary-mismatch" ? RED : YELLOW;
  console.log(
    `  ${color}${label.padEnd(32)}${RESET}  ${BOLD}${String(count).padStart(4)}${RESET} ${DIM}(${pct(count, report.total)})${RESET}`
  );
}

if (issueEntries.length === 0) {
  console.log(`  ${GREEN}No issues found — question bank is clean!${RESET}`);
}
console.log();

// ── Per-subject/ageGroup breakdown ────────────────────────────────────────────

console.log(`${BOLD}  BY SUBJECT × AGE GROUP${RESET}`);
console.log(`  ${"─".repeat(47)}`);

type CellKey = `${string}#${string}`;
const cellMap = new Map<CellKey, { total: number; failed: number; issues: Partial<Record<AuditIssueType, number>> }>();

for (const r of report.results) {
  const key: CellKey = `${r.questionText ? (allQuestions.find((q) => q.questionId === r.questionId)?.subject ?? "?") : "?"}#${r.ageGroup ?? "?"}`;
  // re-derive subject from original question
  const origQ = allQuestions.find((q) => q.questionId === r.questionId);
  const cellKey: CellKey = `${origQ?.subject ?? "?"}#${origQ?.ageGroup ?? "?"}`;
  const cell = cellMap.get(cellKey) ?? { total: 0, failed: 0, issues: {} };
  cell.total += 1;
  if (!r.pass) cell.failed += 1;
  for (const issue of r.issues) {
    cell.issues[issue.type] = (cell.issues[issue.type] ?? 0) + 1;
  }
  cellMap.set(cellKey, cell);
}

const sortedCells = [...cellMap.entries()].sort(([a], [b]) => a.localeCompare(b));
for (const [key, cell] of sortedCells) {
  const [subject, ageGroup] = key.split("#");
  const cellColor = cell.failed > 0 ? RED : GREEN;
  const topIssues = Object.entries(cell.issues)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([t, n]) => `${n}×${t}`)
    .join(", ");
  console.log(
    `  ${cellColor}${`${subject}/${ageGroup}`.padEnd(22)}${RESET}  failed ${BOLD}${cell.failed}${RESET}/${cell.total}  ${DIM}${topIssues}${RESET}`
  );
}
console.log();

// ── Verbose: show each flagged question ───────────────────────────────────────

if (verbose) {
  const flagged = report.results.filter((r) => r.issues.length > 0);
  console.log(`${BOLD}  FLAGGED QUESTIONS (${flagged.length})${RESET}`);
  console.log(`  ${"─".repeat(47)}`);

  for (const r of flagged) {
    const errorIcon  = r.pass ? YELLOW + "⚠" : RED + "✖";
    const label      = r.pass ? "WARN" : "FAIL";
    console.log();
    console.log(`  ${errorIcon} ${BOLD}[${label}]${RESET} ${DIM}${r.questionId}${RESET}`);
    console.log(`  ${DIM}${r.questionText.slice(0, 100)}${r.questionText.length > 100 ? "…" : ""}${RESET}`);
    for (const issue of r.issues) {
      const ic = issue.severity === "error" ? RED : YELLOW;
      console.log(`    ${ic}• [${issue.type}] ${issue.message}${RESET}`);
    }
  }
  console.log();
}

// ── Recommendations ───────────────────────────────────────────────────────────

const lowercaseCount  = report.byIssueType["lowercase-start"] ?? 0;
const poorHintCount   = report.byIssueType["poor-hint"] ?? 0;
const nearDupCount    = report.byIssueType["near-duplicate"] ?? 0;

if (lowercaseCount > 0) {
  console.log(`${RED}⚡ ACTION${RESET} ${lowercaseCount} question(s) start with a lowercase letter.`);
  console.log(`   Fix: ensure classroomContext() prefix is capitalised in question-bank.ts templates.`);
}
if (poorHintCount > 0) {
  console.log(`${YELLOW}⚡ ACTION${RESET} ${poorHintCount} question(s) have poor or missing hints.`);
  console.log(`   Fix: add a meaningful hint to each template generator.`);
}
if (nearDupCount > 0) {
  console.log(`${RED}⚡ ACTION${RESET} ${nearDupCount} near-duplicate question(s) found.`);
  console.log(`   Fix: increase template variety or add fingerprint guards in generateQuestionBank().`);
}

const passPct = Math.round((report.passed / Math.max(report.total, 1)) * 100);
console.log();
if (report.failed === 0) {
  console.log(`${GREEN}${BOLD}✓ All questions pass error-level checks.${RESET} ${DIM}(${report.withWarnings} warnings)${RESET}\n`);
} else {
  console.log(`${RED}${BOLD}✖ ${report.failed} question(s) have errors (${passPct}% pass rate).${RESET}\n`);
  process.exit(1);
}
