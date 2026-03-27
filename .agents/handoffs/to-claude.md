# Handoff -> Claude
**Task:** Test coverage + regression hardening for subscription, progress scoring, and REQ-001 P1 tracking
**From:** Codex
**Updated:** 2026-03-27T00:00:00+11:00

## What changed

- Added `GET /api/progress/topics` for subject/topic performance summaries.
- Added `GET /api/progress/alerts` for "needs help" alerts when recent accuracy drops below 50%.
- Added `GET /api/reports/weekly` in-app digest support alongside the existing cron email route.
- Wired the dashboard Progress tab to show a focused child selector, subject donut charts, smart alerts, and weekly digest cards.
- The existing streak fields (`streakDays`, `lastActiveDate`) continue to update from completed sessions.
- Theme-aware child tiles and a tighter dashboard/rewards shell are already in place.
- Subscription checkout and portal still need regression coverage on the current branch.

## What Claude should test next

- `GET /api/progress/topics?childId=...`
- `GET /api/progress/alerts?childId=...`
- `GET /api/reports/weekly?childId=...`
- dashboard Progress tab rendering on laptop and tablet widths
- the donut chart / topic drill-down layout for a selected child
- smart alert visibility and CTA behavior
- streak badge still updates from completed sessions
- subscription checkout button flows from `/pricing`
- `POST /api/subscription/checkout` returns either a valid Stripe URL or a descriptive error
- `POST /api/subscription/portal` returns a meaningful message when no customer exists
- progress summaries never reuse one subject's score for untouched subjects
- dashboard links continue to work on the Students / Progress / Rewards / Account tabs
- child tile theme defaults and appearance persistence do not regress
- responsive behavior on laptop and iPad widths for the theme-aware dashboard and learn shell

## Files to focus on

- `app/api/progress/topics/route.ts`
- `app/api/progress/alerts/route.ts`
- `app/api/reports/weekly/route.ts`
- `lib/services/performance-insights.ts`
- `app/dashboard/page.tsx`
- `app/pricing/page.tsx`
- `app/rewards/page.tsx`
- `app/learn/page.tsx`
- `app/api/subscription/checkout/route.ts`
- `app/api/subscription/portal/route.ts`
- `lib/services/progress.ts`
- `lib/services/questions.ts`
- `types/index.ts`

## Files to avoid

- `app/api/diagnostic/*`
- `.secops/`
- `.github/workflows/`

## Notes

- The weekly email cron route still exists and should remain intact.
- The old reward, topic preferences, and diagnostic flows are intentionally untouched.
- Keep the test focus on coverage and responsiveness, not new feature changes.
- The immediate goal is to catch the two reported defects:
  1. subscription select / checkout error
  2. progress percentages showing the same value for untouched subjects
- Build a regression suite that proves:
  - one-subject submissions only affect that subject
  - untouched subjects remain zeroed
  - dashboard progress cards render the per-subject values from the backend
  - the pricing screen does not break when a plan is selected
  - all important dashboard and rewards links still resolve
- Prefer small, deterministic HTTP and render tests over broad end-to-end flows.
