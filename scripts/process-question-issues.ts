/**
 * process-question-issues.ts
 * ──────────────────────────
 * Reads reported question issues from DynamoDB and produces structured
 * fix suggestions for each issue.
 *
 * Usage:
 *   npx tsx scripts/process-question-issues.ts [--dry-run] [--limit N] [--status reported]
 *
 * Output: JSON array of fix suggestions written to stdout (or fix-suggestions.json)
 *
 * Fix suggestion shape:
 * {
 *   questionId, issueId, reason, details,
 *   suggestedAction: "review" | "fix-answer" | "adjust-difficulty" | "rewrite" | "remove",
 *   suggestedFix: string,   // human-readable guidance
 *   priority: "high" | "medium" | "low"
 * }
 */

import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import * as fs from "fs";
import * as path from "path";

// ── Config ─────────────────────────────────────────────────────────────────

const TABLE_NAME = process.env.DYNAMODB_QUESTION_ISSUES_TABLE || "kidlearn-question-issues";
const REGION = process.env.AWS_REGION || "ap-southeast-2";
const DRY_RUN = process.argv.includes("--dry-run");
const LIMIT_ARG = process.argv.find(a => a.startsWith("--limit="));
const MAX_ITEMS = LIMIT_ARG ? parseInt(LIMIT_ARG.split("=")[1], 10) : 100;
const STATUS_FILTER = process.argv.find(a => a.startsWith("--status="))?.split("=")[1] ?? "reported";
const OUTPUT_FILE = "fix-suggestions.json";

// ── Types ──────────────────────────────────────────────────────────────────

interface QuestionIssue {
  questionId: string;
  issueId: string;
  reporterType: string;
  reason: string;
  details?: string;
  subject?: string;
  topics?: string[];
  status: string;
  createdAt: string;
}

interface FixSuggestion {
  questionId: string;
  issueId: string;
  reason: string;
  details?: string;
  subject?: string;
  topics?: string[];
  suggestedAction: "review" | "fix-answer" | "adjust-difficulty" | "rewrite" | "remove";
  suggestedFix: string;
  priority: "high" | "medium" | "low";
}

// ── DynamoDB client ────────────────────────────────────────────────────────

const dynamo = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: REGION }),
  { marshallOptions: { removeUndefinedValues: true } }
);

// ── Fix suggestion logic ──────────────────────────────────────────────────

function classifyIssue(issue: QuestionIssue): FixSuggestion {
  const reason = issue.reason.toLowerCase();
  const details = issue.details?.toLowerCase() ?? "";
  const combined = `${reason} ${details}`;

  let action: FixSuggestion["suggestedAction"] = "review";
  let fix = "";
  let priority: FixSuggestion["priority"] = "medium";

  if (combined.includes("wrong answer") || combined.includes("incorrect answer") || combined.includes("answer marked")) {
    action = "fix-answer";
    fix = "Check all answer options. One or more isCorrect flags may be wrong. Verify against curriculum source.";
    priority = "high";
  } else if (combined.includes("too hard") || combined.includes("too difficult")) {
    action = "adjust-difficulty";
    fix = "Reduce difficulty by 1-2 levels. Consider simplifying language or removing ambiguous options.";
    priority = "medium";
  } else if (combined.includes("too easy")) {
    action = "adjust-difficulty";
    fix = "Increase difficulty by 1-2 levels or replace with a more challenging variant.";
    priority = "low";
  } else if (combined.includes("confusing") || combined.includes("wording") || combined.includes("unclear")) {
    action = "rewrite";
    fix = "Rewrite question text for clarity. Ensure it matches the child's reading level for the subject.";
    priority = "medium";
  } else if (combined.includes("incorrect question") || combined.includes("factually wrong") || combined.includes("wrong question")) {
    action = "rewrite";
    fix = "Factual error detected. Verify question content against curriculum. Rewrite or remove.";
    priority = "high";
  } else if (combined.includes("offensive") || combined.includes("inappropriate")) {
    action = "remove";
    fix = "Review for inappropriate content. Remove immediately if confirmed.";
    priority = "high";
  } else {
    action = "review";
    fix = `Manual review required. Reporter reason: "${issue.reason}". Check question against curriculum expectations for ${issue.subject ?? "subject"}.`;
    priority = "medium";
  }

  return {
    questionId: issue.questionId,
    issueId: issue.issueId,
    reason: issue.reason,
    details: issue.details,
    subject: issue.subject,
    topics: issue.topics,
    suggestedAction: action,
    suggestedFix: fix,
    priority,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[process-question-issues] table=${TABLE_NAME} status=${STATUS_FILTER} limit=${MAX_ITEMS} dry=${DRY_RUN}`);

  // Scan for issues with the given status
  const raw = await dynamo.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: "#st = :st",
    ExpressionAttributeNames: { "#st": "status" },
    ExpressionAttributeValues: { ":st": { S: STATUS_FILTER } },
    Limit: MAX_ITEMS,
  }));

  const items: QuestionIssue[] = (raw.Items ?? []).map(item => ({
    questionId:   item.questionId?.S ?? "",
    issueId:      item.issueId?.S ?? "",
    reporterType: item.reporterType?.S ?? "unknown",
    reason:       item.reason?.S ?? "",
    details:      item.details?.S,
    subject:      item.subject?.S,
    topics:       item.topics?.L?.map(t => t.S ?? "").filter(Boolean),
    status:       item.status?.S ?? "reported",
    createdAt:    item.createdAt?.S ?? "",
  }));

  console.log(`[process-question-issues] found ${items.length} issue(s) with status="${STATUS_FILTER}"`);

  if (!items.length) {
    console.log("[process-question-issues] nothing to process.");
    return;
  }

  // Classify each issue
  const suggestions: FixSuggestion[] = items.map(classifyIssue);

  // Sort: high priority first
  const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => order[a.priority] - order[b.priority]);

  // Summary
  const highCount = suggestions.filter(s => s.priority === "high").length;
  const medCount  = suggestions.filter(s => s.priority === "medium").length;
  const lowCount  = suggestions.filter(s => s.priority === "low").length;
  console.log(`[process-question-issues] suggestions: ${highCount} high | ${medCount} medium | ${lowCount} low`);

  // Write suggestions to file
  const outPath = path.join(process.cwd(), OUTPUT_FILE);
  if (!DRY_RUN) {
    fs.writeFileSync(outPath, JSON.stringify(suggestions, null, 2));
    console.log(`[process-question-issues] written to ${outPath}`);
  } else {
    console.log("[process-question-issues] dry-run — output (not written):");
    console.log(JSON.stringify(suggestions, null, 2));
    return;
  }

  // Optionally mark issues as "triaged" so they aren't re-processed
  if (!DRY_RUN) {
    let updated = 0;
    for (const issue of items) {
      try {
        await dynamo.send(new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { questionId: issue.questionId, issueId: issue.issueId },
          UpdateExpression: "SET #st = :triaged, updatedAt = :now",
          ExpressionAttributeNames: { "#st": "status" },
          ExpressionAttributeValues: {
            ":triaged": "triaged",
            ":now": new Date().toISOString(),
          },
        }));
        updated++;
      } catch (err) {
        console.warn(`[process-question-issues] could not update issueId=${issue.issueId}:`, (err as Error).message);
      }
    }
    console.log(`[process-question-issues] marked ${updated}/${items.length} issues as "triaged"`);
  }
}

main().catch(err => {
  console.error("[process-question-issues] fatal:", err);
  process.exit(1);
});
