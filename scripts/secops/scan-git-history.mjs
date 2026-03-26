#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const OUTPUT = resolve(".secops/findings/open/git-history-findings.json");
const HISTORY_PATTERNS = [
  {
    id: "history-private-key",
    severity: "critical",
    title: "Private key material appears in git history",
    regex: "BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY",
    recommendation: "Rotate the key and plan history cleanup or secret revocation."
  },
  {
    id: "history-aws-key",
    severity: "critical",
    title: "AWS access key pattern appears in git history",
    regex: "(AKIA|ASIA)[0-9A-Z]{16}",
    recommendation: "Rotate the key and audit where it was used."
  },
  {
    id: "history-gh-token",
    severity: "critical",
    title: "GitHub token pattern appears in git history",
    regex: "gh[pousr]_[A-Za-z0-9_]{20,}",
    recommendation: "Revoke the token and scrub history if needed."
  },
  {
    id: "history-signed-url",
    severity: "high",
    title: "Signed cloud URL appears in git history",
    regex: "X-Amz-Signature=|X-Amz-Security-Token=",
    recommendation: "Remove transient signed URLs and rotate any exposed credentials."
  },
  {
    id: "history-public-key",
    severity: "medium",
    title: "Public key material appears in git history",
    regex: "BEGIN PUBLIC KEY|ssh-ed25519|ssh-rsa",
    recommendation: "Verify the key is intentionally public and not bundled with sensitive metadata."
  }
];

function runGit(pattern) {
  try {
    return execFileSync(
      "git",
      ["log", "--all", "-G", pattern, "--date=iso-strict", "--pretty=format:%H%x09%aI%x09%s", "--name-only", "--no-ext-diff"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    );
  } catch {
    return "";
  }
}

const findings = [];
for (const pattern of HISTORY_PATTERNS) {
  const output = runGit(pattern.regex);
  if (!output.trim()) {
    continue;
  }

  const lines = output.split(/\r?\n/);
  let currentCommit = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (line.includes("\t")) {
      const [commit, committedAt, subject] = line.split("\t");
      currentCommit = { commit, committedAt, subject };
      continue;
    }

    if (!currentCommit) {
      continue;
    }

    findings.push({
      id: `${pattern.id}:${currentCommit.commit}:${line}`,
      category: "git-history",
      severity: pattern.severity,
      title: pattern.title,
      path: line,
      filePath: line,
      evidence: `${currentCommit.commit} ${currentCommit.committedAt} ${currentCommit.subject}`,
      remediation: pattern.recommendation
    });
  }
}

mkdirSync(resolve(".secops/findings/open"), { recursive: true });
const uniqueFindings = Array.from(new Map(findings.map((finding) => [finding.id, finding])).values());
const report = {
  scanner: "git-history",
  generatedAt: new Date().toISOString(),
  summary: {
    totalFindings: uniqueFindings.length,
    critical: uniqueFindings.filter((item) => item.severity === "critical").length,
    high: uniqueFindings.filter((item) => item.severity === "high").length,
    medium: uniqueFindings.filter((item) => item.severity === "medium").length,
    low: uniqueFindings.filter((item) => item.severity === "low").length
  },
  findings: uniqueFindings
};

writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Git-history scan complete: ${uniqueFindings.length} findings -> ${relative(process.cwd(), OUTPUT)}`);
