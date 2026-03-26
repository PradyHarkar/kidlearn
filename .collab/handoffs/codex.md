# Codex Security Handoff
**Updated:** 2026-03-26T19:30:00+11:00

---

## Current Objective

The active workstream is the repo-native security and vulnerability agent under
`.secops/`. Diagnostic and tutor UI work are stale contexts for this turn.

## Codex branch and scope

- Branch: `codex/secops-core`
- Owns:
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

### Codex chunks
1. Scaffold `.secops` control plane and status scripts
2. Implement repo, git-history, and config scanners
3. Implement safe remediation for ignore/hardening actions
4. Run focused verification and publish initial findings

## Claude branch and scope

- Branch: `claude/secops-reporting`
- Owns:
  - `.secops/status/claude.json`
  - `.secops/findings/`
  - `.secops/playbooks/`
  - `scripts/secops/scan-aws.mjs`
  - `scripts/secops/export-report.mjs`
  - `.github/workflows/secops.yml`
  - `scripts/test/suites/11-secops-reporting.ts`

### Claude chunks
1. Implement AWS exposure signal scan
2. Implement secops findings export
3. Add incident response playbooks
4. Add CI gate for critical findings

## Coordination Contract

- Poll the other agent's secops status file every 5 seconds while actively working.
- Update own status every 30-60 seconds and on blocker changes.
- Do not revert or overwrite the other agent's files.
- No merge to `master` without explicit user approval.

## Current status

Codex has already:
- created the `.secops` scaffold
- hardened `.gitignore` for local agent artifacts
- created core status and polling scripts

Claude must ignore stale diagnostic/tutor prompts and stay on the security lane.
