# Agent Collaboration Protocol

This folder is the shared coordination layer for Codex and Claude.

## Goal

Let either agent receive a new user request and turn it into a shared plan without
making the user repeat context in both windows.

## Rules

1. Never work on `master` directly.
2. Each agent must stay on its own branch until the user explicitly approves a merge.
3. Each agent must update its status file every 60 seconds while actively working.
4. If either agent receives a new user instruction, that agent must update:
   - `.collab/plan.json`
   - `.collab/handoffs/<agent>.md`
5. Each agent must read these files before starting new work:
   - `.collab/plan.json`
   - `.collab/ownership.json`
   - `.collab/status/codex.json`
   - `.collab/status/claude.json`
   - `.collab/handoffs/codex.md`
   - `.collab/handoffs/claude.md`
6. File ownership is strict unless both agents update the plan first.
7. If a task needs review, the agents should swap roles deliberately:
   - architect
   - coder
   - tester
   The current role split must be written into `.collab/plan.json`.

## Status Cadence

Every 60 seconds, each agent updates its status file with:

- `finished`
- `doingNow`
- `etaMinutes`
- `blocker`

Use `blocker: "none"` when not blocked.

## New Task Flow

When either agent receives a new user task:

1. Write the new objective and division of labor into `.collab/plan.json`.
2. Update that agent's handoff file with:
   - what changed
   - what the other agent should do
   - risks
3. Update that agent's status file.
4. The other agent must read the shared files before continuing.

## Single-Window Operation

If the user only talks to one agent, that agent becomes the dispatcher for the new
request and must update the shared files immediately so the other agent can pick it up
without asking the user again.

## Helper Scripts

- `node scripts/collab/show-status.mjs`
- `node scripts/collab/update-status.mjs ...`
- `node scripts/collab/set-task.mjs ...`
- `node scripts/collab/post-handoff.mjs ...`
