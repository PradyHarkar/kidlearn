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
const filePath = path.join(root, ".collab", "plan.json");
const current = JSON.parse(fs.readFileSync(filePath, "utf8"));

const next = {
  ...current,
  updatedAt: new Date().toISOString(),
  currentObjective: args.objective || current.currentObjective,
  dispatchAgent: args.dispatch || current.dispatchAgent
};

if (args["codex-goal"]) {
  next.workstreams = next.workstreams.map((item) =>
    item.owner === "codex" ? { ...item, goal: args["codex-goal"] } : item
  );
}

if (args["claude-goal"]) {
  next.workstreams = next.workstreams.map((item) =>
    item.owner === "claude" ? { ...item, goal: args["claude-goal"] } : item
  );
}

fs.writeFileSync(filePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
console.log("Updated .collab/plan.json");
