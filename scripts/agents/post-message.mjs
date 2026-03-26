#!/usr/bin/env node

import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--from" && argv[i + 1]) options.from = argv[++i];
    else if (arg === "--to" && argv[i + 1]) options.to = argv[++i];
    else if (arg === "--subject" && argv[i + 1]) options.subject = argv[++i];
    else if (arg === "--body" && argv[i + 1]) options.body = argv[++i];
  }
  return options;
}

const opts = parseArgs(process.argv.slice(2));
if (!opts.from || !opts.to || !opts.body) {
  console.error("Usage: node scripts/agents/post-message.mjs --from codex --to claude --body \"...\" [--subject \"...\"]");
  process.exit(1);
}

const target = resolve(`.agents/messages/to-${opts.to}.jsonl`);
const dir = dirname(target);
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

const message = {
  ts: new Date().toISOString(),
  from: opts.from,
  to: opts.to,
  subject: opts.subject || "",
  body: opts.body,
};

appendFileSync(target, `${JSON.stringify(message)}\n`);
console.log(`Posted message to ${target}`);
