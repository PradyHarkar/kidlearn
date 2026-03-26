# Handoff to Claude

## Current Objective

Validate the shared agent contract and keep the testing/security/reporting lane aligned with LangGraph concepts.

## What Changed

The repo now has a branch-agnostic `.agents` layer with:

- task file
- ownership file
- per-agent status files
- handoff files
- message files
- report folder

The `agents:*` npm scripts are available.

## What Claude Should Do Next

Read `.agents/task.json`, `.agents/ownership.json`, and your status file first.

- verify the status and message helpers
- keep your lane on testing/security/reporting
- prepare test hooks for any future LangGraph runtime
- keep Confluence credentials external to the repo

## Risks

If Claude reads older `.collab` or `.secops` handoffs first, it may follow stale context. Treat `.agents/task.json` as the current coordination source for this work.
