/**
 * AGENTS COORDINATION LAYER TEST SUITE
 * ──────────────────────────────────────
 * Pure file-system tests — no HTTP, no DynamoDB.
 * Validates the .agents/ control plane schema, helper scripts,
 * and that no secrets are committed into the coordination layer.
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test, startSuite, assertTrue, assertEqual, assertDefined } from "../lib/assert";

const SUITE = "agents-coordination";
const ROOT  = resolve(process.cwd());

function readJson(rel: string): Record<string, unknown> | null {
  const p = resolve(ROOT, rel);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}

function readText(rel: string): string | null {
  const p = resolve(ROOT, rel);
  if (!existsSync(p)) return null;
  return readFileSync(p, "utf8");
}

function run(cmd: string): { stdout: string; ok: boolean } {
  try {
    const stdout = execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    return { stdout, ok: true };
  } catch (err: unknown) {
    const e = err as { stdout?: string };
    return { stdout: e.stdout ?? "", ok: false };
  }
}

export async function runAgentsCoordinationSuite(_baseUrl: string) {
  startSuite("12  AGENTS COORDINATION (unit)");

  // ── File existence ─────────────────────────────────────────────────────────
  await test(SUITE, ".agents/task.json exists", async () => {
    assertTrue(existsSync(resolve(ROOT, ".agents/task.json")), ".agents/task.json missing");
  });

  await test(SUITE, ".agents/ownership.json exists", async () => {
    assertTrue(existsSync(resolve(ROOT, ".agents/ownership.json")), ".agents/ownership.json missing");
  });

  await test(SUITE, ".agents/status/claude.json exists", async () => {
    assertTrue(existsSync(resolve(ROOT, ".agents/status/claude.json")), ".agents/status/claude.json missing");
  });

  await test(SUITE, ".agents/status/codex.json exists", async () => {
    assertTrue(existsSync(resolve(ROOT, ".agents/status/codex.json")), ".agents/status/codex.json missing");
  });

  await test(SUITE, ".agents/langgraph.md exists", async () => {
    assertTrue(existsSync(resolve(ROOT, ".agents/langgraph.md")), ".agents/langgraph.md missing");
  });

  // ── task.json schema ───────────────────────────────────────────────────────
  await test(SUITE, "task.json has required fields", async () => {
    const task = readJson(".agents/task.json");
    assertDefined(task, "task.json must be valid JSON");
    assertDefined(task!.protocolVersion,    "task.json missing protocolVersion");
    assertDefined(task!.currentObjective,   "task.json missing currentObjective");
    assertDefined(task!.roles,              "task.json missing roles");
    assertDefined(task!.coordinationRules,  "task.json missing coordinationRules");
  });

  await test(SUITE, "task.json roles defines claude and codex lanes", async () => {
    const task = readJson(".agents/task.json") as { roles?: { claude?: string[]; codex?: string[] } } | null;
    assertTrue(Array.isArray(task?.roles?.claude), "task.json roles.claude must be an array");
    assertTrue(Array.isArray(task?.roles?.codex),  "task.json roles.codex must be an array");
    assertTrue((task!.roles!.claude!).length > 0,  "claude must have at least one role");
    assertTrue((task!.roles!.codex!).length > 0,   "codex must have at least one role");
  });

  // ── ownership.json schema ──────────────────────────────────────────────────
  await test(SUITE, "ownership.json has ownerGroups for claude and codex", async () => {
    const own = readJson(".agents/ownership.json") as { ownerGroups?: { claude?: string[]; codex?: string[] } } | null;
    assertDefined(own, "ownership.json must be valid JSON");
    assertTrue(Array.isArray(own?.ownerGroups?.claude), "ownership.json missing ownerGroups.claude");
    assertTrue(Array.isArray(own?.ownerGroups?.codex),  "ownership.json missing ownerGroups.codex");
  });

  await test(SUITE, "ownership.json: claude owns scripts/test/ lane", async () => {
    const own = readJson(".agents/ownership.json") as { ownerGroups?: { claude?: string[] } } | null;
    const claudeLanes = own?.ownerGroups?.claude ?? [];
    assertTrue(
      claudeLanes.some((l) => l.includes("scripts/test")),
      "claude must own scripts/test/ in ownership.json"
    );
  });

  await test(SUITE, "ownership.json: codex owns app/ and lib/ lanes", async () => {
    const own = readJson(".agents/ownership.json") as { ownerGroups?: { codex?: string[] } } | null;
    const codexLanes = own?.ownerGroups?.codex ?? [];
    assertTrue(codexLanes.some((l) => l.includes("app/")),  "codex must own app/ in ownership.json");
    assertTrue(codexLanes.some((l) => l.includes("lib/")),  "codex must own lib/ in ownership.json");
  });

  // ── Status file schema ─────────────────────────────────────────────────────
  for (const agent of ["claude", "codex"] as const) {
    await test(SUITE, `.agents/status/${agent}.json has required fields`, async () => {
      const status = readJson(`.agents/status/${agent}.json`);
      assertDefined(status,               `${agent} status must be valid JSON`);
      assertEqual(status!.agent, agent,   `agent field must be "${agent}"`);
      assertDefined(status!.branch,       "status missing branch");
      assertDefined(status!.role,         "status missing role");
      assertDefined(status!.finished,     "status missing finished");
      assertDefined(status!.doingNow,     "status missing doingNow");
      assertDefined(status!.blocker,      "status missing blocker");
    });
  }

  // ── Helper scripts ─────────────────────────────────────────────────────────
  await test(SUITE, "scripts/agents/show-status.mjs runs and prints both agents", async () => {
    const { stdout, ok } = run("node scripts/agents/show-status.mjs");
    assertTrue(ok, "show-status.mjs exited with error");
    assertTrue(stdout.includes("CODEX"),  "show-status must print CODEX section");
    assertTrue(stdout.includes("CLAUDE"), "show-status must print CLAUDE section");
  });

  await test(SUITE, "scripts/agents/update-status.mjs updates lastUpdated", async () => {
    const before = readJson(".agents/status/claude.json") as { lastUpdated?: string } | null;
    run(`node scripts/agents/update-status.mjs --agent claude --doing "running suite 12 test" --eta 1 --blocker none`);
    const after = readJson(".agents/status/claude.json") as { lastUpdated?: string } | null;
    assertDefined(after!.lastUpdated, "lastUpdated must be set after update");
    assertTrue(
      after!.lastUpdated! >= (before?.lastUpdated ?? ""),
      "lastUpdated must be >= previous value after update"
    );
  });

  await test(SUITE, "scripts/agents/post-message.mjs appends valid JSON line", async () => {
    run(`node scripts/agents/post-message.mjs --from claude --to codex --subject "suite-12-probe" --body "coordination test probe"`);
    const lines = readText(".agents/messages/to-codex.jsonl");
    assertDefined(lines, "to-codex.jsonl must exist after posting");
    const last = lines!.trim().split("\n").pop()!;
    const msg = JSON.parse(last) as { from?: string; to?: string; subject?: string };
    assertEqual(msg.from,    "claude",          "message.from must be claude");
    assertEqual(msg.to,      "codex",           "message.to must be codex");
    assertDefined(msg.subject,                   "message.subject must be present");
  });

  // ── Security: no raw secrets in .agents/ ──────────────────────────────────
  await test(SUITE, "no AWS access keys committed in .agents/", async () => {
    const { stdout } = run(`node -e "
      const { readdirSync, readFileSync, statSync } = require('fs');
      const { join } = require('path');
      function scan(dir) {
        for (const f of readdirSync(dir)) {
          const p = join(dir, f);
          if (statSync(p).isDirectory()) { scan(p); continue; }
          const t = readFileSync(p, 'utf8');
          if (/AKIA[0-9A-Z]{16}/.test(t)) process.stdout.write('FOUND:' + p + '\\n');
        }
      }
      scan('.agents');
    "`);
    assertTrue(!stdout.includes("FOUND:"), `AWS key found in .agents/: ${stdout}`);
  });

  await test(SUITE, "no Confluence API key value committed in .agents/", async () => {
    // Keys look like base64 ~32+ chars after 'CONFLUENCE_API_KEY='
    const files = [
      ".agents/task.json",
      ".agents/ownership.json",
      ".agents/langgraph.md",
      ".agents/handoffs/to-claude.md",
      ".agents/handoffs/to-codex.md",
      ".agents/README.md",
    ];
    for (const f of files) {
      const text = readText(f);
      if (!text) continue;
      // Flag if it looks like an actual key value (not just the env var name)
      const hasRawKey = /CONFLUENCE_API_KEY\s*=\s*[A-Za-z0-9+/]{20,}/.test(text);
      assertTrue(!hasRawKey, `Confluence API key value found in ${f}`);
    }
  });

  await test(SUITE, "langgraph.md references Confluence creds as env vars only", async () => {
    const text = readText(".agents/langgraph.md");
    assertDefined(text, ".agents/langgraph.md must exist");
    assertTrue(text!.includes("CONFLUENCE_API_KEY"), "langgraph.md must document CONFLUENCE_API_KEY env var");
    assertTrue(text!.includes("CONFLUENCE_BASE_URL"), "langgraph.md must document CONFLUENCE_BASE_URL env var");
  });

  await test(SUITE, "no private keys or bearer tokens in .agents/ messages", async () => {
    const inbox  = readText(".agents/messages/to-codex.jsonl") ?? "";
    const outbox = readText(".agents/messages/to-claude.jsonl") ?? "";
    const combined = inbox + outbox;
    assertTrue(!/-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----/.test(combined), "private key found in messages");
    assertTrue(!/Bearer [A-Za-z0-9\-._~+/]{40,}/.test(combined),              "bearer token found in messages");
  });

  // ── LangGraph readiness ────────────────────────────────────────────────────
  await test(SUITE, "task.json orchestration.framework is langgraph", async () => {
    const task = readJson(".agents/task.json") as { orchestration?: { framework?: string } } | null;
    assertEqual(task?.orchestration?.framework, "langgraph", "orchestration.framework must be 'langgraph'");
  });

  await test(SUITE, "task.json has cadence settings for polling", async () => {
    const task = readJson(".agents/task.json") as { cadenceSeconds?: number; statusCadenceSeconds?: number } | null;
    assertDefined(task!.cadenceSeconds,       "task.json must define cadenceSeconds");
    assertDefined(task!.statusCadenceSeconds, "task.json must define statusCadenceSeconds");
    assertTrue((task!.cadenceSeconds as number) <= 10,   "cadenceSeconds should be ≤ 10s");
    assertTrue((task!.statusCadenceSeconds as number) <= 60, "statusCadenceSeconds should be ≤ 60s");
  });
}
