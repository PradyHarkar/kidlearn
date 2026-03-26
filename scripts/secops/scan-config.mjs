#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const OUTPUT = resolve(".secops/findings/open/config-findings.json");
const findings = [];

function addFinding(id, severity, title, path, evidence, recommendedAction) {
  findings.push({
    id,
    category: "config-risk",
    severity,
    title,
    path,
    filePath: path,
    evidence,
    remediation: recommendedAction
  });
}

function read(path) {
  if (!existsSync(path)) {
    return "";
  }
  return readFileSync(path, "utf8");
}

const gitignore = read(".gitignore");
const requiredIgnores = [".claude/", ".codex-dev.log", ".codex-dev.err.log", "generated/", "test-results.json"];
for (const entry of requiredIgnores) {
  if (!gitignore.includes(entry)) {
    addFinding(
      `gitignore:${entry}`,
      "medium",
      "Sensitive local artifact is not ignored",
      ".gitignore",
      entry,
      "Add the pattern to `.gitignore` so local agent state and generated files do not leak into commits."
    );
  }
}

const claudeLocalSettings = read(".claude/settings.local.json");
if (claudeLocalSettings) {
  addFinding(
    "claude-local-settings",
    "high",
    "Local Claude settings file exists in workspace",
    ".claude/settings.local.json",
    "Local agent settings can contain URLs, tokens, or copied command history.",
    "Keep this file ignored and do not commit it."
  );

  if (/X-Amz-Signature=|X-Amz-Security-Token=/.test(claudeLocalSettings)) {
    addFinding(
      "claude-local-settings-signed-url",
      "high",
      "Local Claude settings contain signed AWS URLs",
      ".claude/settings.local.json",
      "Signed AWS URL markers were detected.",
      "Remove transient URLs from local agent state and avoid copying them into tracked files."
    );
  }
}

const vercelConfig = read("vercel.json");
if (/AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY/.test(vercelConfig)) {
  addFinding(
    "vercel-raw-aws-credentials",
    "medium",
    "Vercel configuration references raw AWS credential variables",
    "vercel.json",
    "AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY env mappings are present.",
    "Prefer short-lived credentials or platform-native secret references where possible."
  );
}

const deployWorkflow = read(".github/workflows/deploy-dev.yml");
if (/APP_AWS_ACCESS_KEY_ID|APP_AWS_SECRET_ACCESS_KEY/.test(deployWorkflow)) {
  addFinding(
    "workflow-long-lived-aws-credentials",
    "medium",
    "Deploy workflow propagates raw AWS app credentials",
    ".github/workflows/deploy-dev.yml",
    "APP_AWS_ACCESS_KEY_ID / APP_AWS_SECRET_ACCESS_KEY are synced into Amplify.",
    "Prefer OIDC or narrower-scoped managed credentials over long-lived keys."
  );
}

if (/\b(?:echo|Write-Host|printf)\b[^\n]*\$\{\{\s*secrets\./i.test(deployWorkflow)) {
  addFinding(
    "workflow-secret-echo-risk",
    "high",
    "Workflow appears to print or echo secrets-adjacent content",
    ".github/workflows/deploy-dev.yml",
    "A broad check found both secrets references and print-like statements.",
    "Review workflow logging to ensure secrets never reach logs."
  );
}

mkdirSync(resolve(".secops/findings/open"), { recursive: true });
const report = {
  scanner: "config",
  generatedAt: new Date().toISOString(),
  summary: {
    totalFindings: findings.length,
    critical: findings.filter((item) => item.severity === "critical").length,
    high: findings.filter((item) => item.severity === "high").length,
    medium: findings.filter((item) => item.severity === "medium").length,
    low: findings.filter((item) => item.severity === "low").length
  },
  findings
};

writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Config scan complete: ${findings.length} findings -> ${relative(process.cwd(), OUTPUT)}`);
