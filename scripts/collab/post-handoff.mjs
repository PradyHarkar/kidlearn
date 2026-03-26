import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

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
  console.error("Usage: node scripts/collab/post-handoff.mjs --agent codex|claude --state \"...\" --ask \"...\" --risk \"...\"");
  process.exit(1);
}

const output = [
  `# ${agent[0].toUpperCase()}${agent.slice(1)} Handoff`,
  "",
  `Updated: ${new Date().toISOString()}`,
  "",
  "## Current State",
  "",
  args.state || "-",
  "",
  "## What The Other Agent Should Do",
  "",
  args.ask || "-",
  "",
  "## Risks",
  "",
  args.risk || "-"
].join("\n");

const filePath = path.join(root, ".collab", "handoffs", `${agent}.md`);
fs.writeFileSync(filePath, `${output}\n`, "utf8");
console.log(`Updated .collab/handoffs/${agent}.md`);
