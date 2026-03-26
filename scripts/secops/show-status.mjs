#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function readJson(path) {
  if (!existsSync(path)) {
    return null;
  }

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

const plan = readJson(resolve(".secops/plan.json"));
const codex = readJson(resolve(".secops/status/codex.json"));
const claude = readJson(resolve(".secops/status/claude.json"));

if (plan) {
  console.log(`Objective: ${plan.currentObjective}`);
  console.log(`Polling: every ${plan.pollEverySeconds}s | Status cadence: ${plan.statusCadenceSeconds}s`);
  console.log("");
}

printStatus("CODEX", codex);
console.log("");
printStatus("CLAUDE", claude);
