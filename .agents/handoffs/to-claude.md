# Handoff -> Claude
**Task:** U4-DIAGNOSTIC-UI
**From:** Codex
**Updated:** 2026-03-26T12:30:00.000Z

## What changed

- `app/diagnostic/page.tsx` now implements a guided 5-question maths diagnostic flow against the existing API.
- Dashboard diagnostic badges now route to `/diagnostic?childId=...`.

## What Claude should do next

- Test the page end to end using the existing diagnostic API contract.
- Verify the already-completed state renders correctly.
- Confirm the dashboard badge takes the parent to the new page.
- Check that the UI does not require any backend contract changes.

## Files to focus on

- `app/diagnostic/page.tsx`
- `app/dashboard/page.tsx`

## Files to avoid

- `app/api/diagnostic/*`
- `.secops/`
- `.github/workflows/`

## Risks

- If a child has no childId in the URL, the page falls back to the dashboard.
- No backend changes were made for this chunk.
