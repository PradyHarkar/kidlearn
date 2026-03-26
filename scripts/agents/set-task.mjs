#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
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
const filePath = resolve(".agents/task.json");
const current = JSON.parse(readFileSync(filePath, "utf8"));

const next = {
  ...current,
  updatedAt: new Date().toISOString(),
  currentObjective: args.objective || current.currentObjective,
  dispatchAgent: args.dispatch || current.dispatchAgent || "codex",
};

if (args["codex-goal"] || args["claude-goal"] || args["shared-goal"]) {
  const workstreams = [...(current.workstreams || [])];
  next.workstreams = workstreams.map((item) => {
    if (item.owner === "codex" && args["codex-goal"]) {
      return { ...item, goal: args["codex-goal"] };
    }
    if (item.owner === "claude" && args["claude-goal"]) {
      return { ...item, goal: args["claude-goal"] };
    }
    if (item.owner === "shared" && args["shared-goal"]) {
      return { ...item, goal: args["shared-goal"] };
    }
    return item;
  });
}

writeFileSync(filePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
console.log("Updated .agents/task.json");
