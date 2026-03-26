#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

function readMessages(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function sleep(ms) {
  return new Promise((resolveFn) => setTimeout(resolveFn, ms));
}

const agent = (process.argv[2] || "codex").toLowerCase();
const other = agent === "claude" ? "codex" : "claude";
const interval = 5000;

let lastMessageCount = 0;

while (true) {
  const task = readJson(resolve(".agents/task.json"));
  const otherStatus = readJson(resolve(`.agents/status/${other}.json`));
  const inbox = readMessages(resolve(`.agents/messages/to-${agent}.jsonl`));

  console.log(`[${new Date().toISOString()}] objective=${task?.currentObjective || "-"}`);
  console.log(`other=${other} status=${otherStatus?.doingNow || "-"} | eta=${otherStatus?.etaMinutes ?? "-"}`);

  if (inbox.length > lastMessageCount) {
    for (const message of inbox.slice(lastMessageCount)) {
      console.log(`message from ${message.from}: ${message.subject || message.body}`);
    }
    lastMessageCount = inbox.length;
  }

  await sleep(interval);
}
