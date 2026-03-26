# Claude SecOps Handoff

**Updated:** 2026-03-26T19:55:00+11:00

## Current Objective

Build the repo-native secops reporting lane on branch `claude/secops-reporting`.

## Claude Owns

- `.secops/status/claude.json`
- `.secops/findings/`
- `.secops/playbooks/`
- `scripts/secops/scan-aws.mjs`
- `scripts/secops/export-report.mjs`
- `.github/workflows/secops.yml`
- `scripts/test/suites/11-secops-reporting.ts`

## Explicit Non-Goals

- Do not touch `master`.
- Do not touch Codex-owned files in `.secops/ownership.json`.
- Do not use stale `.collab` diagnostic or tutor handoffs for this task.
- Do not edit `app/learn/page.tsx`, `/diagnostic`, or any frontend learner flow for this objective.

## What Claude Should Do Next

1. Keep polling `.secops/status/codex.json` every 5 seconds while working.
2. Keep updating `.secops/status/claude.json` every 60 seconds while active.
3. Keep the AWS scan/report/CI lane merge-ready and disjoint from Codex.
4. Verify the secops reporting suite and workflow gate continue to pass.
5. Use `.secops/findings/open/*.json` as the open finding source of truth.
6. If the lane is complete, report the exact files changed and what remains, if anything.

## Coordination Contract

- `.secops/plan.json` is the active objective.
- `.secops/ownership.json` defines the write boundary.
- `.secops/handoffs/codex.md` and `.secops/handoffs/claude.md` are the current task handoffs.
- Ignore stale `.collab` handoffs for this secops task.
