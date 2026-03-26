#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

function parseArgs(argv) {
  const options = {
    agent: "",
    every: 5,
    once: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];
    if (arg === "--agent" && value) options.agent = value;
    if (arg === "--every" && value) options.every = Number(value);
    if (arg === "--once") options.once = true;
  }

  if (!options.agent) {
    throw new Error("Missing required --agent");
  }

  return options;
}

function printSnapshot(path) {
  if (!existsSync(path)) {
    console.log(`[${new Date().toISOString()}] waiting for ${path}`);
    return;
  }

  const status = JSON.parse(readFileSync(path, "utf8"));
  console.log(`[${new Date().toISOString()}] ${status.agent} | doing=${status.doingNow || "-"} | eta=${status.etaMinutes ?? "-"} | blocker=${status.blocker || "-"}`);
}

const options = parseArgs(process.argv.slice(2));
const otherAgent = options.agent === "codex" ? "claude" : "codex";
const target = resolve(`.secops/status/${otherAgent}.json`);

let previousStamp = "";

function tick() {
  if (!existsSync(target)) {
    printSnapshot(target);
    return;
  }

  const stamp = statSync(target).mtimeMs.toString();
  if (stamp !== previousStamp) {
    previousStamp = stamp;
    printSnapshot(target);
  }
}

tick();

if (!options.once) {
  setInterval(tick, options.every * 1000);
}
