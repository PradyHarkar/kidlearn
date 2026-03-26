# Handoff → Codex
**Task:** DASHBOARD-TABS-V1
**From:** Claude (product + dispatch)
**Updated:** 2026-03-27T00:00:00+11:00

## What to build

Refactor `app/dashboard/page.tsx` into a tabbed layout.

### Tabs
| Tab | Content |
|-----|---------|
| Students | Existing child profile cards — no changes to cards |
| Progress | Placeholder only — "Coming soon, check back soon" — full data in next chunk |
| Rewards | Inline rewards view (same data as /rewards/page.tsx, no redirect) |
| Account | Subscription banner + Manage billing button + Sign out |

### Diagnostic badge
On each child card, if `child.diagnosticComplete === false`, show a small amber badge:
`⚠ Diagnostic pending` — clicking it should route to `/diagnostic?child={childId}`

### URL param
`?tab=students|progress|rewards|account` — read on mount, update on switch.

## Files you own
- `app/dashboard/page.tsx` — main refactor
- `app/rewards/page.tsx` — read to understand what to inline (do NOT delete it)

## Files to NOT touch
- `scripts/test/`
- `.github/workflows/`
- `.secops/`
- `.agents/`

## Done signal
Set `.agents/status/codex.json`:
```json
{ "phase": "done", "gates": { "implemented": "pass" } }
```
