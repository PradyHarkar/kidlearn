#!/usr/bin/env node
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const OPEN_DIR = path.join(".secops", "findings", "open");
const CLOSED_DIR = path.join(".secops", "findings", "closed");
const STATUS_DIR = path.join(".secops", "status");

function normalizeFinding(finding, sourceFile) {
  return {
    id: finding.id ?? `${sourceFile}:${finding.filePath ?? "unknown"}:${finding.lineNumber ?? 0}`,
    category: finding.category ?? "unknown",
    severity: finding.severity ?? "low",
    title: finding.title ?? "Untitled finding",
    filePath: finding.filePath ?? "unknown",
    lineNumber: finding.lineNumber ?? null,
    evidence: finding.evidence ?? "",
    remediation: finding.remediation ?? "",
    source: finding.source ?? sourceFile,
    status: finding.status ?? (sourceFile.includes("closed") ? "closed" : "open"),
  };
}

async function readJsonFile(filePath) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function collectJsonFiles(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json")).map((entry) => path.join(dir, entry.name));
  } catch {
    return [];
  }
}

export async function loadSecopsState(rootDir = process.cwd()) {
  const openFiles = await collectJsonFiles(path.join(rootDir, OPEN_DIR));
  const closedFiles = await collectJsonFiles(path.join(rootDir, CLOSED_DIR));
  const statusFiles = await collectJsonFiles(path.join(rootDir, STATUS_DIR));

  const findings = [];
  for (const filePath of [...openFiles, ...closedFiles]) {
    try {
      const parsed = await readJsonFile(filePath);
      const sourceFile = path.relative(rootDir, filePath);
      const entries = Array.isArray(parsed.findings)
        ? parsed.findings
        : Array.isArray(parsed)
        ? parsed
        : [];
      for (const entry of entries) {
        findings.push(normalizeFinding(entry, sourceFile));
      }
    } catch {
      continue;
    }
  }

  const statuses = [];
  for (const filePath of statusFiles) {
    try {
      const parsed = await readJsonFile(filePath);
      statuses.push({ file: path.relative(rootDir, filePath), ...parsed });
    } catch {
      continue;
    }
  }

  return { rootDir: path.resolve(rootDir), findings, statuses };
}

function summarizeFindings(findings) {
  const summary = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const finding of findings) {
    if (finding.severity in summary) {
      summary[finding.severity]++;
    }
  }
  return summary;
}

export function renderReport(state) {
  const openFindings = state.findings.filter((finding) => finding.status !== "closed");
  const summary = summarizeFindings(openFindings);
  const lines = [];

  lines.push("# SecOps Report");
  lines.push(`- root: \`${state.rootDir}\``);
  lines.push(`- open findings: ${openFindings.length}`);
  lines.push(`- critical: ${summary.critical}, high: ${summary.high}, medium: ${summary.medium}, low: ${summary.low}`);

  if (state.statuses.length) {
    lines.push("");
    lines.push("## Agent Status");
    for (const status of state.statuses.sort((a, b) => String(a.agent ?? a.file).localeCompare(String(b.agent ?? b.file)))) {
      lines.push(`- ${status.agent ?? status.file}: ${status.doingNow ?? "unknown"} (eta ${status.etaMinutes ?? "?"}m, blocker ${status.blocker ?? "unknown"})`);
    }
  }

  if (openFindings.length) {
    lines.push("");
    lines.push("## Open Findings");
    for (const finding of openFindings.slice(0, 50)) {
      lines.push(`- [${finding.severity}] ${finding.filePath}:${finding.lineNumber ?? 0} ${finding.title}`);
      if (finding.evidence) {
        lines.push(`  - ${finding.evidence}`);
      }
    }
  } else {
    lines.push("");
    lines.push("## Open Findings");
    lines.push("- none");
  }

  return lines.join("\n");
}

export async function exportSecopsReport(rootDir = process.cwd()) {
  const state = await loadSecopsState(rootDir);
  const markdown = renderReport(state);
  const openCritical = state.findings.filter((finding) => finding.status !== "closed" && finding.severity === "critical").length;
  return { state, markdown, openCritical };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const rootIndex = process.argv.indexOf("--root");
  const rootDir = rootIndex >= 0 && process.argv[rootIndex + 1] ? process.argv[rootIndex + 1] : process.cwd();
  const outputIndex = process.argv.indexOf("--output");
  const outputFile = outputIndex >= 0 && process.argv[outputIndex + 1] ? process.argv[outputIndex + 1] : null;
  const json = args.has("--json");
  const failOnCritical = args.has("--fail-on-critical");

  const { state, markdown, openCritical } = await exportSecopsReport(rootDir);

  if (outputFile) {
    await mkdir(path.dirname(outputFile), { recursive: true });
    await writeFile(outputFile, `${markdown}\n`, "utf8");
  }

  if (json) {
    process.stdout.write(`${JSON.stringify({ ...state, markdown }, null, 2)}\n`);
  } else {
    process.stdout.write(`${markdown}\n`);
  }

  if (failOnCritical && openCritical > 0) {
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error("[export-report] fatal:", error);
    process.exit(1);
  });
}
