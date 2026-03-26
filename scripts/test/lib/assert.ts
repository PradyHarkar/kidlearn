/**
 * Lightweight assertion + result-tracking library.
 * No external dependencies. Works with any runtime that supports console.log.
 */

export interface TestResult {
  suite:   string;
  name:    string;
  pass:    boolean;
  message: string;
  durationMs: number;
}

export interface TestReport {
  startedAt:  string;
  finishedAt: string;
  baseUrl:    string;
  totalPass:  number;
  totalFail:  number;
  results:    TestResult[];
}

const results: TestResult[] = [];

const GREEN  = "\x1b[32m";
const RED    = "\x1b[31m";
const YELLOW = "\x1b[33m";
const RESET  = "\x1b[0m";
const BOLD   = "\x1b[1m";

export function pass(suite: string, name: string, message: string, durationMs = 0) {
  const r: TestResult = { suite, name, pass: true, message, durationMs };
  results.push(r);
  console.log(`  ${GREEN}✓${RESET} ${name} ${YELLOW}(${durationMs}ms)${RESET}`);
  return r;
}

export function fail(suite: string, name: string, message: string, durationMs = 0) {
  const r: TestResult = { suite, name, pass: false, message, durationMs };
  results.push(r);
  console.log(`  ${RED}✗${RESET} ${name}`);
  console.log(`    ${RED}↳ ${message}${RESET}`);
  return r;
}

export function startSuite(name: string) {
  console.log(`\n${BOLD}${name}${RESET}`);
}

/** Run a single async test, catch any thrown errors, record result. */
export async function test(
  suite: string,
  name: string,
  fn: () => Promise<void>
): Promise<TestResult> {
  const start = Date.now();
  try {
    await fn();
    return pass(suite, name, "OK", Date.now() - start);
  } catch (err) {
    const msg = err instanceof AssertionError
      ? err.message
      : err instanceof Error
      ? `${err.constructor.name}: ${err.message}`
      : String(err);
    return fail(suite, name, msg, Date.now() - start);
  }
}

export function getResults(): TestResult[] { return results; }

export function printSummary(baseUrl: string): TestReport {
  const totalPass = results.filter(r => r.pass).length;
  const totalFail = results.filter(r => !r.pass).length;
  console.log(`\n${"─".repeat(60)}`);
  console.log(`${BOLD}RESULTS${RESET}  ${GREEN}${totalPass} passed${RESET}  ${totalFail > 0 ? RED : ""}${totalFail} failed${RESET}`);
  if (totalFail > 0) {
    console.log(`\n${RED}FAILURES:${RESET}`);
    results.filter(r => !r.pass).forEach(r =>
      console.log(`  [${r.suite}] ${r.name}\n    ${r.message}`)
    );
  }
  console.log(`${"─".repeat(60)}\n`);

  return {
    startedAt:  new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    baseUrl,
    totalPass,
    totalFail,
    results,
  };
}

// ── Assertion helpers ─────────────────────────────────────────────────────────

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssertionError";
  }
}

export function assertEqual<T>(actual: T, expected: T, label = "") {
  if (actual !== expected) {
    throw new AssertionError(
      `${label ? label + ": " : ""}expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

export function assertMatch(actual: string, pattern: RegExp, label = "") {
  if (!pattern.test(actual)) {
    throw new AssertionError(
      `${label ? label + ": " : ""}expected "${actual}" to match ${pattern}`
    );
  }
}

export function assertInRange(actual: number, min: number, max: number, label = "") {
  if (actual < min || actual > max) {
    throw new AssertionError(
      `${label ? label + ": " : ""}expected ${actual} to be between ${min} and ${max}`
    );
  }
}

export function assertDefined<T>(actual: T | null | undefined, label = ""): asserts actual is T {
  if (actual === null || actual === undefined) {
    throw new AssertionError(`${label ? label + ": " : ""}expected defined value, got ${actual}`);
  }
}

export function assertArrayLength(actual: unknown[], min: number, label = "") {
  if (actual.length < min) {
    throw new AssertionError(
      `${label ? label + ": " : ""}expected array length >= ${min}, got ${actual.length}`
    );
  }
}

export function assertStatus(actual: number, expected: number, bodyText = "") {
  if (actual !== expected) {
    throw new AssertionError(
      `expected HTTP ${expected}, got ${actual}${bodyText ? ": " + bodyText.slice(0, 200) : ""}`
    );
  }
}

export function assertTrue(condition: boolean, message: string) {
  if (!condition) throw new AssertionError(message);
}
