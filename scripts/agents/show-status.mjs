#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

function printStatus(label, status) {
  console.log(`${label}:`);
  if (!status) {
    console.log("  missing");
    return;
  }

  console.log(`  branch: ${status.branch || "-"}`);
  console.log(`  role: ${status.role || "-"}`);
  console.log(`  updated: ${status.lastUpdated || "-"}`);
  console.log(`  finished: ${status.finished || "-"}`);
  console.log(`  doing: ${status.doingNow || "-"}`);
  console.log(`  etaMinutes: ${status.etaMinutes ?? "-"}`);
  console.log(`  blocker: ${status.blocker || "-"}`);
}

const task = readJson(resolve(".agents/task.json"));
const codex = readJson(resolve(".agents/status/codex.json"));
const claude = readJson(resolve(".agents/status/claude.json"));

if (task) {
  console.log(`Objective: ${task.currentObjective || "-"}`);
  console.log(`Framework: ${task.orchestration?.framework || "-"}`);
  console.log(`Polling: every ${task.cadenceSeconds}s | Status cadence: ${task.statusCadenceSeconds}s`);
  console.log("");
}

printStatus("CODEX", codex);
console.log("");
printStatus("CLAUDE", claude);
