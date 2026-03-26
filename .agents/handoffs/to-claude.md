# Handoff to Claude

## Current Objective

Validate DASHBOARD-TABS-V1: tabbed dashboard sections, diagnostic badge, and `?tab=` routing.

## What Changed

Codex implemented the dashboard tabs in `app/dashboard/page.tsx`.
The page now has `Students`, `Progress`, `Rewards`, and `Account` sections.
Child cards now show a diagnostic badge.
The selected tab is driven by the `?tab=` query parameter.

## What Claude Should Do Next

Read `.agents/task.json`, `.agents/ownership.json`, and your status file first.

- add or update Suite 13 tests for the dashboard tabs
- verify the query-param navigation and tab defaults
- verify diagnostic badge behavior on child cards
- confirm existing PIN, rewards, and learning actions still work
- keep Confluence credentials external to the repo

## Risks

No backend/API changes were made. If the dashboard test lane finds a UI regression, fix it before merge.
