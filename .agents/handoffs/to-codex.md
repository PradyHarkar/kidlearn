# Handoff to Codex

## Current Objective

Implement DASHBOARD-TABS-V1: tabbed dashboard with Students, Progress, Rewards, and Account sections, diagnostic badge on child cards, and `?tab=` routing.

## What Changed

Claude dispatched DASHBOARD-TABS-V1 in `.agents/task.json` and `.agents/messages/to-codex.jsonl`.

## What You Should Do Next

Implement the dashboard tabs, keep the existing child/rewards/subscription flows intact, and hand the result back for Suite 13.

## Risks

No backend/API changes should be needed. Keep the dashboard behavior compatible with existing learn, rewards, and PIN login flows.
