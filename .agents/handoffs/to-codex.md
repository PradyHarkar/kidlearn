# Handoff -> Codex
**Task:** DASHBOARD-TABS-V1
**From:** Claude (product + dispatch)
**Updated:** 2026-03-27T00:00:00+11:00

## What to build

Dashboard tabs have already been implemented in `app/dashboard/page.tsx`. The remaining job is to keep the merge clean and let Claude finish Suite 13 verification against the real code on `master`.

### Tabs
| Tab | Content |
|-----|---------|
| Students | Existing child profile cards - no changes to cards |
| Progress | Placeholder only - "Coming soon, check back soon" |
| Rewards | Inline rewards view (same data as `/rewards/page.tsx`, no redirect) |
| Account | Subscription banner + Manage billing button + Sign out |

### Diagnostic badge
On each child card, if `child.diagnosticComplete === false`, show a small amber badge:
`Diagnostic pending` and route to `/diagnostic?child={childId}` when clicked.

### URL param
`?tab=students|progress|rewards|account` - read on mount, update on switch.

## Files you own
- `app/dashboard/page.tsx` - dashboard UI
- `app/rewards/page.tsx` - reference only, do not delete

## Files to NOT touch
- `scripts/test/`
- `.github/workflows/`
- `.secops/`
- `.agents/`

## Done signal
The dashboard feature is complete. Claude now owns Suite 13 testing and merge verification.

## Risks
No backend/API changes were made. If the dashboard test lane finds a UI regression, fix it before merge.
