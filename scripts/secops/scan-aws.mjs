#!/usr/bin/env node
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_IGNORE_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  "coverage",
  "cdk.out",
  "dist",
  "build",
  "out",
  ".secops",
]);

const MAX_FILE_BYTES = 1024 * 1024;
const SIGNALS = [
  {
    id: "aws-signed-url",
    severity: "critical",
    title: "AWS signed URL or session token is present",
    pattern: /X-Amz-(Signature|Security-Token|Credential|Date)=/i,
    remediation: "Remove the signed URL or token-bearing artifact and regenerate it outside the repo.",
  },
  {
    id: "aws-access-key",
    severity: "critical",
    title: "AWS access key material detected",
    pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/,
    remediation: "Rotate the key immediately and remove the exposed value from all tracked and generated files.",
  },
  {
    id: "private-key",
    severity: "critical",
    title: "Private key material detected",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    remediation: "Delete the key from the repository and rotate any credential that depended on it.",
  },
  {
    id: "public-key",
    severity: "medium",
    title: "Public key material detected in a sensitive context",
    pattern: /-----BEGIN PUBLIC KEY-----/,
    remediation: "Verify the key is intentionally public and not paired with a secret-bearing artifact or signature.",
  },
  {
    id: "public-access-config",
    severity: "high",
    title: "Public access configuration detected",
    pattern: /\b(public-read|allowPublicAccess|blockPublicAccess\s*:\s*false|publicAccessBlockConfiguration)\b/i,
    remediation: "Confirm the resource is meant to be public; otherwise lock it down and redeploy.",
  },
  {
    id: "secret-env-client",
    severity: "high",
    title: "Sensitive client-exposed env var naming detected",
    pattern: /\bNEXT_PUBLIC_[A-Z0-9_]*(SECRET|TOKEN|KEY|PASSWORD|PRIVATE|AWS|STRIPE)\b/i,
    remediation: "Move the value server-side and rename the client env var so it does not carry secret semantics.",
  },
  {
    id: "signed-url-log",
    severity: "high",
    title: "Signed URL or bearer token copied into a log or local artifact",
    pattern: /(Authorization:\s*Bearer\s+[A-Za-z0-9._-]+|X-Amz-Signature=|X-Amz-Security-Token=)/i,
    remediation: "Delete the artifact, rotate any token that was copied, and ensure logs are not committed.",
  },
];

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function shouldIgnore(relativePath) {
  const parts = relativePath.split(/[\\/]/);
  if (relativePath.startsWith("scripts/secops/")) return true;
  if (relativePath === "scripts/test/suites/11-secops-reporting.ts") return true;
  return parts.some((part) => DEFAULT_IGNORE_DIRS.has(part));
}

function isAppCodeFile(relativePath) {
  return /^(app|components|lib|scripts|types|infrastructure)\//.test(relativePath) || /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(relativePath);
}

async function collectFiles(rootDir, currentDir = rootDir, files = []) {
  const entries = await readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name);
    const relativePath = toPosix(path.relative(rootDir, absolutePath));
    if (shouldIgnore(relativePath)) continue;
    if (entry.isDirectory()) {
      await collectFiles(rootDir, absolutePath, files);
      continue;
    }
    files.push(relativePath);
  }
  return files;
}

function makeFinding(filePath, lineNumber, signal, line) {
  return {
    id: `${signal.id}:${filePath}:${lineNumber}`,
    category: "aws-exposure",
    severity: signal.severity,
    title: signal.title,
    filePath,
    lineNumber,
    evidence: line.trim(),
    remediation: signal.remediation,
    source: "scan-aws",
  };
}

export function scanTextForAwsSignals(filePath, content) {
  if (content.length > MAX_FILE_BYTES) return [];
  const findings = [];
  const lines = content.split(/\r?\n/);

  for (const signal of SIGNALS) {
    if (signal.id === "secret-env-client" && !isAppCodeFile(filePath)) continue;
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      if (!signal.pattern.test(line)) continue;
      findings.push(makeFinding(filePath, index + 1, signal, line));
    }
  }

  return findings;
}

export async function scanAwsWorkspace(rootDir = process.cwd(), options = {}) {
  const resolvedRoot = path.resolve(rootDir);
  const outputFile = path.join(resolvedRoot, ".secops", "findings", "open", "aws-scan.json");
  const files = await collectFiles(rootDir);
  const findings = [];

  for (const relativePath of files) {
    const absolutePath = path.join(rootDir, relativePath);
    let content = "";
    try {
      const buffer = await readFile(absolutePath);
      if (buffer.byteLength > MAX_FILE_BYTES) continue;
      content = buffer.toString("utf8");
    } catch {
      continue;
    }

    if (content.includes("\u0000")) continue;
    findings.push(...scanTextForAwsSignals(relativePath, content));
  }

  const summary = {
    critical: findings.filter((finding) => finding.severity === "critical").length,
    high: findings.filter((finding) => finding.severity === "high").length,
    medium: findings.filter((finding) => finding.severity === "medium").length,
    low: findings.filter((finding) => finding.severity === "low").length,
  };

  const report = {
    source: "scan-aws",
    scannedAt: new Date().toISOString(),
    rootDir: path.resolve(rootDir),
    scannedFiles: files.length,
    summary,
    findings,
  };

  if (options.writeFindings === true) {
    await mkdir(path.dirname(outputFile), { recursive: true });
    await writeFile(outputFile, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }

  return report;
}

function formatConsoleReport(report) {
  const lines = [];
  lines.push(`# AWS Exposure Scan`);
  lines.push(`- root: \`${report.rootDir}\``);
  lines.push(`- scanned files: ${report.scannedFiles}`);
  lines.push(`- findings: ${report.findings.length}`);
  lines.push(`- critical: ${report.summary.critical}, high: ${report.summary.high}, medium: ${report.summary.medium}, low: ${report.summary.low}`);
  if (report.findings.length) {
    lines.push("");
    lines.push("## Top Findings");
    for (const finding of report.findings.slice(0, 10)) {
      lines.push(`- [${finding.severity}] ${finding.filePath}:${finding.lineNumber} ${finding.title}`);
    }
  }
  return lines.join("\n");
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const rootArgIndex = process.argv.indexOf("--root");
  const rootDir = rootArgIndex >= 0 && process.argv[rootArgIndex + 1] ? process.argv[rootArgIndex + 1] : process.cwd();
  const json = args.has("--json");
  const writeFindings = args.has("--write") || args.has("--write-findings");
  const failOnCritical = args.has("--fail-on-critical");

  const report = await scanAwsWorkspace(rootDir, { writeFindings });
  process.stdout.write(`${json ? JSON.stringify(report, null, 2) : formatConsoleReport(report)}\n`);
  process.exit(failOnCritical && report.summary.critical > 0 ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error("[scan-aws] fatal:", error);
    process.exit(1);
  });
}
