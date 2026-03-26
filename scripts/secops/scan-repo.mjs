#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const ROOT = process.cwd();
const OUTPUT = resolve(".secops/findings/open/repo-findings.json");
const SKIP_DIRS = new Set([".git", ".next", "node_modules", "cdk.out", ".secops/findings"]);
const TEXT_EXTENSIONS = new Set([
  ".md", ".txt", ".json", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".yml", ".yaml", ".env",
  ".toml", ".ini", ".sh", ".ps1", ".html", ".css", ".sql", ".csv", ".log", ".pub", ""
]);
const SELF_SCAN_SAFE_PATHS = [
  /^scripts\/secops\//,
  /^scripts\/test\/suites\/11-secops-reporting\.ts$/
];

const PATTERNS = [
  {
    id: "private-key",
    severity: "critical",
    title: "Private key material present",
    regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/m,
    recommendation: "Remove the key from the repo/workspace, rotate it, and store the replacement in a secret manager."
  },
  {
    id: "aws-access-key",
    severity: "critical",
    title: "AWS access key pattern present",
    regex: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/,
    recommendation: "Rotate the credential and move it out of tracked files."
  },
  {
    id: "github-token",
    severity: "critical",
    title: "GitHub token pattern present",
    regex: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
    recommendation: "Revoke the token and replace it with a secret-managed value."
  },
  {
    id: "stripe-secret",
    severity: "high",
    title: "Stripe secret-like value present",
    regex: /\b(?:sk|rk|whsec)_(?:live|test)_[A-Za-z0-9]{12,}\b/,
    recommendation: "Move Stripe secrets to the environment or a managed secret store."
  },
  {
    id: "presigned-url",
    severity: "high",
    title: "Presigned or signed cloud URL present",
    regex: /X-Amz-Signature=|X-Amz-Security-Token=|Signature=|sig=/,
    recommendation: "Remove signed URLs from local state and avoid committing transient cloud artifacts."
  },
  {
    id: "ssh-public-key",
    severity: "medium",
    title: "SSH public key material present",
    regex: /\bssh-(?:rsa|ed25519)\s+[A-Za-z0-9+/=]+(?:\s.*)?$/,
    recommendation: "Confirm this key is intended to be public and keep it out of tracked files unless required."
  }
];

const PATH_RULES = [
  {
    id: "agent-local-state",
    severity: "high",
    title: "Agent local state is present and should stay ignored",
    regex: /^\.claude\//,
    recommendation: "Keep agent state untracked and ignored.",
    bucket: ".claude/"
  },
  {
    id: "debug-log",
    severity: "medium",
    title: "Debug/runtime log present in workspace",
    regex: /^\.codex-dev.*\.log$/,
    recommendation: "Keep runtime logs ignored and out of commits.",
    bucket: null
  },
  {
    id: "generated-artifact",
    severity: "medium",
    title: "Generated artifact directory present",
    regex: /^generated\//,
    recommendation: "Keep generated artifacts out of the repo unless explicitly versioned.",
    bucket: "generated/"
  },
  {
    id: "test-report",
    severity: "medium",
    title: "Local test report artifact present",
    regex: /^test-results\.json$/,
    recommendation: "Avoid committing local test reports.",
    bucket: "test-results.json"
  }
];

function gitLines(args) {
  try {
    const output = execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return output.split(/\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
}

const tracked = new Set(gitLines(["ls-files", "--full-name"]));
const untracked = new Set(gitLines(["ls-files", "--others", "--exclude-standard", "--full-name"]));
const emittedPathRules = new Set();

function traverse(directory, bucket = []) {
  const entries = readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    const relPath = relative(ROOT, fullPath).replace(/\\/g, "/");

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(relPath) || SKIP_DIRS.has(entry.name)) {
        continue;
      }
      traverse(fullPath, bucket);
      continue;
    }

    bucket.push(relPath);
  }

  return bucket;
}

function isTextCandidate(path) {
  const extension = extname(path).toLowerCase();
  return TEXT_EXTENSIONS.has(extension);
}

function addFinding(findings, finding) {
  findings.push({
    ...finding,
    filePath: finding.filePath || finding.path,
    remediation: finding.remediation || finding.recommendedAction,
    category: finding.category || "repo-exposure",
    source: tracked.has(finding.path) ? "tracked" : untracked.has(finding.path) ? "untracked" : "workspace"
  });
}

const findings = [];
for (const relPath of traverse(ROOT)) {
  for (const rule of PATH_RULES) {
    if (rule.regex.test(relPath)) {
      const bucket = rule.bucket || relPath;
      const key = `${rule.id}:${bucket}`;
      if (emittedPathRules.has(key)) {
        continue;
      }
      emittedPathRules.add(key);
      addFinding(findings, {
        id: key,
        severity: rule.severity,
        title: rule.title,
        path: bucket,
        filePath: bucket,
        evidence: relPath,
        remediation: rule.recommendation,
        category: "repo-hygiene"
      });
    }
  }

  if (!existsSync(relPath) || !isTextCandidate(relPath)) {
    continue;
  }

  if (SELF_SCAN_SAFE_PATHS.some((pattern) => pattern.test(relPath))) {
    continue;
  }

  const absolutePath = resolve(relPath);
  const size = statSync(absolutePath).size;
  if (size > 1024 * 1024) {
    continue;
  }

  let content = "";
  try {
    content = readFileSync(absolutePath, "utf8");
  } catch {
    continue;
  }

  for (const pattern of PATTERNS) {
    const match = content.match(pattern.regex);
    if (!match) {
      continue;
    }

    addFinding(findings, {
      id: `${pattern.id}:${relPath}`,
      severity: pattern.severity,
      title: pattern.title,
      path: relPath,
      filePath: relPath,
      evidence: match[0].slice(0, 160),
      remediation: pattern.recommendation
    });
  }
}

mkdirSync(resolve(".secops/findings/open"), { recursive: true });
const report = {
  scanner: "repo",
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
console.log(`Repo scan complete: ${findings.length} findings -> ${relative(ROOT, OUTPUT)}`);
