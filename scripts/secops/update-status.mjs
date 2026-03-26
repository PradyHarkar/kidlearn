#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function parseArgs(argv) {
  const options = {
    agent: "",
    branch: "",
    role: "",
    finished: "",
    doing: "",
    eta: "",
    blocker: "none",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];
    if (arg === "--agent" && value) options.agent = value;
    if (arg === "--branch" && value) options.branch = value;
    if (arg === "--role" && value) options.role = value;
    if (arg === "--finished" && value) options.finished = value;
    if (arg === "--doing" && value) options.doing = value;
    if (arg === "--eta" && value) options.eta = value;
    if (arg === "--blocker" && value) options.blocker = value;
  }

  if (!options.agent) {
    throw new Error("Missing required --agent");
  }

  return options;
}

const options = parseArgs(process.argv.slice(2));
const statusDir = resolve(".secops/status");
mkdirSync(statusDir, { recursive: true });

const status = {
  agent: options.agent,
  branch: options.branch || "",
  role: options.role || "",
  lastUpdated: new Date().toISOString(),
  finished: options.finished || "",
  doingNow: options.doing || "",
  etaMinutes: Number(options.eta || 0),
  blocker: options.blocker || "none",
};

const destination = resolve(statusDir, `${options.agent}.json`);
writeFileSync(destination, `${JSON.stringify(status, null, 2)}\n`, "utf8");
console.log(`Updated ${destination}`);
