#!/usr/bin/env npx tsx

import { existsSync, readFileSync } from "node:fs";
import { runLangGraphCoordination, type HandoffTarget } from "@/lib/agents/langgraph";

function parseArgs(argv: string[]) {
  const options: { target: HandoffTarget; writeReport: boolean; explain: boolean } = {
    target: "all",
    writeReport: false,
    explain: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--to" && argv[i + 1]) options.target = argv[++i] as HandoffTarget;
    else if (arg === "--write") options.writeReport = true;
    else if (arg === "--explain") options.explain = true;
  }

  return options;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.explain) {
    console.log("LangGraph here is a real state-machine runtime, not just a folder convention.");
    console.log("It reads .agents/task.json, runs product -> architect -> coder -> tester -> security -> housekeeper,");
    console.log("and can write a markdown handoff/report for Codex or Claude.");
    return;
  }

  const result = await runLangGraphCoordination({
    target: opts.target,
    writeReport: opts.writeReport,
  });

  console.log(result.reportMarkdown);
}

main().catch((error) => {
  console.error("LangGraph orchestrator failed:", error);
  process.exit(1);
});

