# Coordination Rules

This file is the universal source of truth for multi-agent work in this repo.

## Master Branch Rules

**Coordination files go directly to master — no PR, no branch.**
This includes: `.agents/task.json`, `.agents/status/`, `.agents/handoffs/`,
`.agents/messages/`, `COORDINATION.md`.

**Code never goes directly to master.**
All product changes (app/, lib/, types/, scripts/test/) go on a feature branch
and wait for explicit user approval before merging.

**Master is the restoration point.**
If any feature branch causes problems, `git reset --hard <last good commit>`
on master restores the last clean state instantly.

**You are the merge gate.**
No feature branch touches master without the user saying yes.

## Priority Order

1. Current branch shown by `git branch --show-current`.
2. The active plan file for the task family:
   - `.agents/task.json` for branch-agnostic multi-agent coordination
   - `.collab/plan.json` for general product work
   - `.secops/plan.json` for security/vulnerability work
3. The corresponding ownership file.
4. The active status files for the two agents.
5. The active handoff and message files for the two agents.

If any older note conflicts with the active plan, the active plan wins.

## Stale Context

- Treat older handoffs as historical once the plan changes.
- Do not continue a previous objective just because it appears in chat history or an old handoff file.
- Before a commit, verify the current branch again if the shared worktree may have drifted.

## Agent Discipline

- Poll the other agent's status file on the cadence required by the active plan.
- Update your own status file regularly with honest ETA and blockers.
- Keep file ownership disjoint unless the plan explicitly says otherwise.
- Put any cross-agent disagreement into the handoff files, not into memory.

## Handoff Rule

When you start a new objective, write the current objective and the exact file split into the relevant plan and handoff files before doing broad edits.

For cross-agent conversation, use `.agents/` as the shared mailbox and keep the other files as task-family-specific overlays.
