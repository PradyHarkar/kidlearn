#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--agent" && argv[i + 1]) options.agent = argv[++i];
    else if (arg === "--branch" && argv[i + 1]) options.branch = argv[++i];
    else if (arg === "--role" && argv[i + 1]) options.role = argv[++i];
    else if (arg === "--finished" && argv[i + 1]) options.finished = argv[++i];
    else if (arg === "--doing" && argv[i + 1]) options.doingNow = argv[++i];
    else if (arg === "--eta" && argv[i + 1]) options.etaMinutes = Number(argv[++i]);
    else if (arg === "--blocker" && argv[i + 1]) options.blocker = argv[++i];
  }
  return options;
}

const opts = parseArgs(process.argv.slice(2));
if (!opts.agent) {
  console.error("Usage: node scripts/agents/update-status.mjs --agent codex|claude ...");
  process.exit(1);
}

const file = resolve(`.agents/status/${opts.agent}.json`);
const current = JSON.parse(readFileSync(file, "utf8"));
const updated = {
  ...current,
  ...opts,
  lastUpdated: new Date().toISOString(),
};

if (!updated.blocker) updated.blocker = "none";
if (!Number.isFinite(updated.etaMinutes)) updated.etaMinutes = current.etaMinutes ?? 0;

writeFileSync(file, `${JSON.stringify(updated, null, 2)}\n`);
console.log(`Updated ${file}`);
