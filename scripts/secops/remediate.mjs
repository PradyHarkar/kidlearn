#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const APPLY = process.argv.includes("--apply");
const GITIGNORE_PATH = resolve(".gitignore");
const REQUIRED_PATTERNS = [
  ".claude/",
  ".codex-dev.log",
  ".codex-dev.err.log",
  "*.local.log",
  "generated/",
  "test-results.json",
  ".secops/runtime/"
];

if (!existsSync(GITIGNORE_PATH)) {
  throw new Error("Could not find .gitignore");
}

const current = readFileSync(GITIGNORE_PATH, "utf8");
const missing = REQUIRED_PATTERNS.filter((pattern) => !current.includes(pattern));

if (missing.length === 0) {
  console.log("No remediation needed. `.gitignore` already covers the current safe-action set.");
  process.exit(0);
}

if (!APPLY) {
  console.log("Dry run. Missing ignore patterns:");
  for (const pattern of missing) {
    console.log(`- ${pattern}`);
  }
  console.log("Run `node scripts/secops/remediate.mjs --apply` to append them.");
  process.exit(0);
}

const section = `\n# secops remediation\n${missing.map((pattern) => pattern).join("\n")}\n`;
writeFileSync(GITIGNORE_PATH, `${current.trimEnd()}\n${section}`, "utf8");
console.log(`Applied remediation to .gitignore with ${missing.length} new pattern(s).`);
