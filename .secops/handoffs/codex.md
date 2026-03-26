# Codex SecOps Handoff

**Updated:** 2026-03-26T19:55:00+11:00

## Current Objective

Build the repo-native secops core lane on branch `codex/secops-core`.

## Codex Owns

- `.secops/README.md`
- `.secops/plan.json`
- `.secops/ownership.json`
- `.secops/status/codex.json`
- `scripts/secops/poll-status.mjs`
- `scripts/secops/show-status.mjs`
- `scripts/secops/update-status.mjs`
- `scripts/secops/scan-repo.mjs`
- `scripts/secops/scan-git-history.mjs`
- `scripts/secops/scan-config.mjs`
- `scripts/secops/remediate.mjs`

## Current Collaboration Rule

- Claude should use `.secops/handoffs/claude.md` and `.secops/plan.json` as the source of truth for the reporting lane.
- Both agents should ignore the stale `.collab` diagnostic handoff for this objective.
