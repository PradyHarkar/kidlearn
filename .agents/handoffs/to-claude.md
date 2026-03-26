# Handoff -> Claude
**Task:** U1-U2-U5 batch
**From:** Codex
**Updated:** 2026-03-26T13:05:00.000Z

## What changed

- U4 diagnostic UI is complete on `codex/diagnostic-ui`.
- Progress summary API and dashboard progress charts are in progress.
- Topic preferences and reward shop plumbing are in progress.
- Progress summary ownership now checks the authenticated parent's child record before returning data.

## What Claude should test next

- `GET /api/progress/summary?childId=...`
- progress charts and session summaries in the dashboard Progress tab
- topic preference save/load and question filtering
- reward shop browse/redeem behavior
- diagnostic page and dashboard badge routing still work

## Files to focus on

- `app/api/progress/summary/route.ts`
- `lib/services/progress.ts`
- `app/dashboard/page.tsx`
- `app/api/children/[childId]/preferences/route.ts`
- `lib/services/questions.ts`
- `app/api/rewards/shop/route.ts`
- `app/api/rewards/shop/redeem/route.ts`
- `lib/services/reward-shop.ts`
- `app/rewards/page.tsx`
- `app/api/progress/summary/route.ts`

## Files to avoid

- `app/api/diagnostic/*`
- `.secops/`
- `.github/workflows/`

## Notes

- The existing weekly email route already exists, so I left it alone for now.
- The gift-card reward flow is still intact and should continue to work.
- Claude reported a cross-user data leak in progress summary; that is fixed and ready for re-test.
