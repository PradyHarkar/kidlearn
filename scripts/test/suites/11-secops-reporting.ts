/**
 * SECOPS REPORTING TEST SUITE
 * Verifies the AWS scan reporter and markdown export behavior on local fixtures.
 */

import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  test,
  startSuite,
  assertTrue,
  assertEqual,
  assertDefined,
} from "../lib/assert";

const SUITE = "secops-reporting";

export async function runSecopsReportingSuite() {
  startSuite("11  SECOPS REPORTING");

  const { scanAwsWorkspace } = await import("../../../scripts/secops/scan-aws.mjs");
  const { exportSecopsReport, renderReport } = await import("../../../scripts/secops/export-report.mjs");

  const rootDir = mkdtempSync(path.join(tmpdir(), "kidlearn-secops-"));
  try {
    mkdirSync(path.join(rootDir, ".github", "workflows"), { recursive: true });
    mkdirSync(path.join(rootDir, ".claude"), { recursive: true });
    mkdirSync(path.join(rootDir, ".secops", "findings", "open"), { recursive: true });
    mkdirSync(path.join(rootDir, ".secops", "status"), { recursive: true });

    writeFileSync(
      path.join(rootDir, ".claude", "settings.local.json"),
      `{"buildLog":"https://example.s3.amazonaws.com/file?X-Amz-Signature=abc&X-Amz-Security-Token=def"}`
    );
    writeFileSync(
      path.join(rootDir, ".github", "workflows", "deploy.yml"),
      `env:\n  NEXT_PUBLIC_STRIPE_SECRET: leaked\n  blockPublicAccess: false\n`
    );
    writeFileSync(
      path.join(rootDir, ".secops", "findings", "open", "manual.json"),
      JSON.stringify(
        {
          findings: [
            {
              id: "manual-1",
              severity: "critical",
              title: "Manual critical exposure",
              filePath: "app/page.tsx",
              lineNumber: 1,
              evidence: "hardcoded value",
              remediation: "remove it",
            },
          ],
        },
        null,
        2
      )
    );
    writeFileSync(
      path.join(rootDir, ".secops", "status", "claude.json"),
      JSON.stringify({ agent: "claude", doingNow: "reporting", etaMinutes: 12, blocker: "none" }, null, 2)
    );

    await test(SUITE, "scanAwsWorkspace detects signed URLs and public exposure signals", async () => {
      const report = await scanAwsWorkspace(rootDir, { writeFindings: false });
      assertTrue(report.summary.critical >= 1, "expected at least one critical finding");
      assertTrue(report.summary.high >= 1, "expected at least one high finding");
      assertTrue(report.findings.some((finding: { filePath: string }) => finding.filePath.includes(".claude")), "expected .claude exposure to be scanned");
      assertTrue(report.findings.some((finding: { filePath: string }) => finding.filePath.includes("deploy.yml")), "expected workflow exposure to be scanned");
    });

    await test(SUITE, "exportSecopsReport renders markdown summary", async () => {
      const exported = await exportSecopsReport(rootDir);
      assertTrue(exported.openCritical >= 1, "expected at least one open critical finding");
      assertDefined(exported.markdown, "markdown");
      assertTrue(exported.markdown.includes("SecOps Report"), "report title should be present");
      assertTrue(exported.markdown.includes("Open Findings"), "open findings section should be present");
      assertTrue(exported.markdown.includes("Agent Status"), "agent status section should be present");
    });

    await test(SUITE, "renderReport includes manual findings", async () => {
      const state = await (async () => {
        const loaded = await exportSecopsReport(rootDir);
        return loaded.state;
      })();
      const markdown = renderReport(state);
      assertTrue(markdown.includes("Manual critical exposure"), "manual finding should appear in markdown");
      assertTrue(markdown.includes("reporting"), "status should appear in markdown");
      assertEqual(typeof markdown, "string", "markdown should be a string");
    });
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
}

if (process.argv[1]?.includes("11-secops-reporting")) {
  runSecopsReportingSuite()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error("[secops-reporting] fatal:", error);
      process.exit(1);
    });
}
