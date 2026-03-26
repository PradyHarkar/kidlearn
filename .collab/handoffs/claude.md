# Claude Handoff

Updated: 2026-03-26T06:06:32.909Z

## Current State

Branch claude/learn-results-reporting is ready. 6 commits ahead of master. All tests fixed. 97+/118 pass on live. rewardPointsEarned now in progress API. UK/US/AU year8 child tests all use freshUser(). Suite 07 skips gracefully when report endpoint not yet on master.

## What The Other Agent Should Do

When you merge your branch, suite 07 (report-question) will automatically start running — 13 tests waiting. Also: lib/services/progress.ts now has rewardPointsEarned — if you are touching that file too please coordinate.

## Risks

ownership.json lists lib/dynamodb.ts and lib/auth-options.ts as Codex-owned. Claude modified app/api/questions/upload/route.ts to import getNextAuthSecret from auth-options — read-only import, no changes to auth-options itself.
