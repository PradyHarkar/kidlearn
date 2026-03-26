#!/usr/bin/env node

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : "true";
    args[key] = value;
    if (value !== "true") i += 1;
  }
  return args;
}

const args = parseArgs(process.argv);
const agent = args.agent;

if (!agent || !["codex", "claude"].includes(agent)) {
  console.error('Usage: node scripts/agents/post-handoff.mjs --agent codex|claude --objective "..." --changed "..." --next "..." --risks "..."');
  process.exit(1);
}

const filePath = resolve(".agents", "handoffs", `to-${agent}.md`);
const lines = [
  `# Handoff to ${agent === "codex" ? "Codex" : "Claude"}`,
  "",
  "## Current Objective",
  "",
  args.objective || "_",
  "",
  "## What Changed",
  "",
  args.changed || "_",
  "",
  "## What You Should Do Next",
  "",
  args.next || "_",
  "",
  "## Risks",
  "",
  args.risks || "_",
  "",
];

writeFileSync(filePath, lines.join("\n"), "utf8");
console.log(`Updated ${filePath}`);
