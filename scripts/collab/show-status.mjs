import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function readJson(relativePath) {
  const fullPath = path.join(root, relativePath);
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function readText(relativePath) {
  const fullPath = path.join(root, relativePath);
  return fs.readFileSync(fullPath, "utf8");
}

const plan = readJson(".collab/plan.json");
const codex = readJson(".collab/status/codex.json");
const claude = readJson(".collab/status/claude.json");

console.log("Current objective:");
console.log(`- ${plan.currentObjective}`);
console.log("");
console.log("Agent status:");

for (const item of [codex, claude]) {
  console.log(`${item.agent.toUpperCase()} | branch=${item.branch} | role=${item.role}`);
  console.log(`  lastUpdated: ${item.lastUpdated || "not yet updated"}`);
  console.log(`  finished: ${item.finished || "-"}`);
  console.log(`  doingNow: ${item.doingNow || "-"}`);
  console.log(`  etaMinutes: ${item.etaMinutes}`);
  console.log(`  blocker: ${item.blocker || "-"}`);
}

console.log("");
console.log("Latest handoffs:");
console.log("--- codex ---");
console.log(readText(".collab/handoffs/codex.md"));
console.log("--- claude ---");
console.log(readText(".collab/handoffs/claude.md"));
