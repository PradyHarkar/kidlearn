# SecOps Collaboration Protocol

This folder is the shared security and vulnerability control plane for Codex and Claude.

## Purpose

Keep accidental exposure out of the repo and deployment surface by coordinating:

- repo scans
- git-history scans
- config and workflow scans
- AWS exposure checks
- remediation actions
- reporting and CI gates

## Rules

1. Never work on `master` directly.
2. Codex and Claude must stay on separate branches until the user approves a merge.
3. Poll the other agent's status file every 5 seconds while actively working.
4. Update your own status file every 30-60 seconds and immediately on blocker changes.
5. Findings live under `.secops/findings/open/` until closed and moved to `.secops/findings/closed/`.
6. Safe automatic actions are allowed only for reversible changes such as `.gitignore` hardening and report generation.
7. Destructive or cloud-mutating actions must be written to a playbook and gated behind explicit execution.

## Shared Files

- `.secops/plan.json`
- `.secops/ownership.json`
- `.secops/status/codex.json`
- `.secops/status/claude.json`
- `.secops/findings/open/*.json`
- `.secops/findings/closed/*.json`
- `.secops/playbooks/*.md`

## Helper Scripts

- `node scripts/secops/show-status.mjs`
- `node scripts/secops/update-status.mjs --agent codex --finished "..." --doing "..." --eta 45 --blocker none`
- `node scripts/secops/poll-status.mjs --agent codex`
- `node scripts/secops/scan-repo.mjs`
- `node scripts/secops/scan-git-history.mjs`
- `node scripts/secops/scan-config.mjs`
- `node scripts/secops/remediate.mjs --apply`

## Finding Shape

Each scanner writes one structured report JSON file that includes:

- `scanner`
- `generatedAt`
- `summary`
- `findings[]`

Each finding includes:

- `id`
- `severity`
- `title`
- `path`
- `evidence`
- `recommendedAction`

## Severity Guidance

- `critical`: live credentials, private keys, or confirmed public exposure
- `high`: presigned URLs, long-lived tokens, sensitive local state likely to leak
- `medium`: risky configuration, unsafe secret propagation, weak ignore rules
- `low`: hygiene gaps, stale artifacts, follow-up cleanup
