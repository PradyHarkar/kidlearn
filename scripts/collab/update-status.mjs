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
  console.error("Usage: node scripts/collab/update-status.mjs --agent codex|claude --finished \"...\" --doing \"...\" --eta 30 --blocker \"none\" --branch branch-name [--role role-name]");
  process.exit(1);
}

const filePath = path.join(root, ".collab", "status", `${agent}.json`);
const current = JSON.parse(fs.readFileSync(filePath, "utf8"));

const next = {
  ...current,
  branch: args.branch || current.branch,
  role: args.role || current.role,
  lastUpdated: new Date().toISOString(),
  finished: args.finished || current.finished,
  doingNow: args.doing || current.doingNow,
  etaMinutes: args.eta ? Number(args.eta) : current.etaMinutes,
  blocker: args.blocker || current.blocker
};

fs.writeFileSync(filePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
console.log(`Updated .collab/status/${agent}.json`);
