/**
 * SUITE 17 — LangGraph runner
 * ─────────────────────────────
 * Validates the real LangGraph coordination runner over the shared .agents task file.
 */

import { test, startSuite, assertTrue } from "../lib/assert";
import { runLangGraphCoordination } from "@/lib/agents/langgraph";

const SUITE = "langgraph-runner";

export async function runLangGraphRunnerSuite(_baseUrl: string) {
  startSuite("17  LangGraph runner");

  await test(SUITE, "runner emits all core role sections", async () => {
    const result = await runLangGraphCoordination({ target: "all" });
    const markdown = result.reportMarkdown;
    assertTrue(markdown.includes("## Product"), "missing product section");
    assertTrue(markdown.includes("## Architect"), "missing architect section");
    assertTrue(markdown.includes("## Coder"), "missing coder section");
    assertTrue(markdown.includes("## Tester"), "missing tester section");
    assertTrue(markdown.includes("## Security"), "missing security section");
    assertTrue(markdown.includes("## Housekeeper"), "missing housekeeper section");
  });

  await test(SUITE, "runner includes current objective from .agents/task.json", async () => {
    const result = await runLangGraphCoordination({ target: "claude" });
    assertTrue(
      result.reportMarkdown.includes("objective:"),
      "report should include the current objective"
    );
  });
}

