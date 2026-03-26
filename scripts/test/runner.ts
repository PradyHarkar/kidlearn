#!/usr/bin/env npx tsx
/**
 * 🌊 KIDLEARN TESTTTSUNAMI RUNNER
 * ════════════════════════════════
 * Runs the full test suite against any target URL.
 * Any LLM can invoke this — it is entirely self-contained.
 *
 * Usage:
 *   npx tsx scripts/test/runner.ts [--url http://localhost:3000]
 *   npm run test:tsunami
 *   npm run test:tsunami:prod    (uses KIDLEARN_URL env var)
 *
 * Options:
 *   --url <url>     Base URL of the app (default: http://localhost:3000)
 *   --suite <name>  Run only one suite: auth|children|questions|progress|subscription|adaptive|report|session-shape|tutor|diagnostic|kid-flow
 *   --no-setup      Skip DynamoDB seed step (if already seeded)
 *   --no-teardown   Keep test data after run (for debugging)
 *   --json          Write results to test-results.json
 *
 * LLM INSTRUCTIONS (if running manually instead of this script):
 *   1. Read TSUNAMI.md for the full test plan
 *   2. Run `npm run test:setup` to seed test data
 *   3. For each suite, make the HTTP calls described in TSUNAMI.md
 *   4. Compare actual vs expected using the assertion rules
 *   5. Run `npm run test:teardown` to clean up
 */

import { writeFileSync } from "node:fs";
import { printSummary, getResults } from "./lib/assert";
import { runAuthSuite }              from "./suites/01-auth";
import { runChildrenSuite }          from "./suites/02-children";
import { runQuestionsSuite }         from "./suites/03-questions";
import { runProgressSuite }          from "./suites/04-progress";
import { runSubscriptionSuite }      from "./suites/05-subscription";
import { runAdaptiveUnitSuite }      from "./suites/06-adaptive-unit";
import { runReportQuestionSuite }    from "./suites/07-report-question";
import { runSessionShapeSuite }      from "./suites/08-session-shape";
import { runTutorSuite }             from "./suites/09-tutor";
import { runDiagnosticSuite }        from "./suites/10-diagnostic";
import { runKidFlowSuite }           from "./suites/11-kid-flow";
import { runAgentsCoordinationSuite } from "./suites/12-agents-coordination";
import { runDashboardTabsSuite }      from "./suites/13-dashboard-tabs";

// ── Parse CLI args ────────────────────────────────────────────────────────────

function parseArgs(argv: string[]) {
  const options = {
    url:        process.env.KIDLEARN_URL || "http://localhost:3000",
    suite:      null as string | null,
    setup:      true,
    teardown:   true,
    json:       false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--url"       && argv[i + 1]) { options.url      = argv[++i]; continue; }
    if (arg === "--suite"     && argv[i + 1]) { options.suite    = argv[++i]; continue; }
    if (arg === "--no-setup")    { options.setup    = false; continue; }
    if (arg === "--no-teardown") { options.teardown = false; continue; }
    if (arg === "--json")        { options.json     = true;  continue; }
  }

  return options;
}

// ── Setup / Teardown via child process ───────────────────────────────────────

async function runScript(script: string): Promise<boolean> {
  const { execSync } = await import("node:child_process");
  try {
    execSync(`npx tsx ${script}`, { stdio: "inherit", cwd: process.cwd() });
    return true;
  } catch {
    return false;
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  console.log(`
╔══════════════════════════════════════════════╗
║  🌊  KidLearn  TestTsunami                   ║
║  Target: ${opts.url.padEnd(34)}║
╚══════════════════════════════════════════════╝`);

  // ── Seed test data ────────────────────────────────────────────────────────
  if (opts.setup) {
    console.log("\n[Setup] Seeding test data...");
    const ok = await runScript("scripts/test/setup.ts");
    if (!ok) {
      console.error("\n❌ Setup failed — cannot continue.\nRun: npm run test:setup manually for more detail.");
      process.exit(1);
    }
  }

  // ── Run suites ────────────────────────────────────────────────────────────
  const suiteMap: Record<string, (url: string) => Promise<void>> = {
    "adaptive":       runAdaptiveUnitSuite,   // pure unit tests first — fastest
    "auth":           runAuthSuite,
    "children":       runChildrenSuite,
    "questions":      runQuestionsSuite,
    "progress":       runProgressSuite,
    "subscription":   runSubscriptionSuite,
    "report":         runReportQuestionSuite,
    "session-shape":  runSessionShapeSuite,
    "tutor":          runTutorSuite,
    "diagnostic":     runDiagnosticSuite,
    "kid-flow":       runKidFlowSuite,
    "agents":         runAgentsCoordinationSuite,
    "dashboard-tabs": runDashboardTabsSuite,
  };

  const toRun = opts.suite
    ? (suiteMap[opts.suite] ? { [opts.suite]: suiteMap[opts.suite] } : {})
    : suiteMap;

  if (opts.suite && !suiteMap[opts.suite]) {
    console.error(`\nUnknown suite "${opts.suite}". Valid: ${Object.keys(suiteMap).join(", ")}`);
    process.exit(1);
  }

  for (const [, fn] of Object.entries(toRun)) {
    try {
      await fn(opts.url);
    } catch (err) {
      console.error(`\nSuite crashed:`, err);
    }
  }

  // ── Report ────────────────────────────────────────────────────────────────
  const report = printSummary(opts.url);

  if (opts.json) {
    const outFile = "test-results.json";
    writeFileSync(outFile, JSON.stringify(report, null, 2));
    console.log(`JSON report → ${outFile}`);
  }

  // ── Teardown ──────────────────────────────────────────────────────────────
  if (opts.teardown) {
    console.log("\n[Teardown] Cleaning up test data...");
    await runScript("scripts/test/teardown.ts");
  }

  process.exit(report.totalFail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error("Runner crashed:", err);
  process.exit(1);
});
