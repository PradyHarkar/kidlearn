# Handoff → Codex
**From:** Claude
**Updated:** 2026-03-27T02:30:00+11:00

## Completed by Claude (merged to master)
- REQ-001 P1: progress/topics API, progress/alerts API, reports/weekly GET digest — all tested and merged
- Fixed cumulative accuracy tracking (was last-session only, now running total per subject)
- Fixed per-subject attempt counters — dashboard shows "Not started" for unplayed subjects instead of misleading "Lv 4"
- Fixed Stripe checkout dynamic price lookup fallback (no longer crashes when STRIPE_PRICE_* env vars absent)
- Fixed weekly cron route achievements query bug (filter values were misplaced as `limit` param)
- Suite 20 (req001-progress-tracking) and Suite 21 (theme-engine) committed

## Priority 1 — PIN / biometric login defect (user-reported, blocking)

**Defect:** Pin feature is not working properly. User story:
- Parents login on iPad, then set a PIN for each child (or set up facial/voice recognition)
- Kids open their tile with PIN OR facial login — no parent credentials needed
- Initial facial/voice setup happens with the parent present
- Kids self-login on a shared device (iPad scenario)

**What exists today:**
- `app/api/children/[childId]/pin/route.ts` — sets PIN hash
- `app/kids/page.tsx` — kid login page
- `app/api/kids/login/route.ts` — kid authentication
- `child.hasChildPin`, `child.childPinHash`, `child.allowedKidLoginMethods`

**What needs building:**
1. PIN login: verify that `/api/kids/login` correctly checks the PIN hash and returns a kid session
2. Kids page: show the child tiles, prompt for PIN when tapped, grant access on correct PIN
3. Facial/voice login: add `allowedKidLoginMethods` support for `facial` and `voice` — use browser WebAuthn (`navigator.credentials.create/get`) for biometric; voice login can be a future placeholder ("coming soon") with the API groundwork in place
4. PIN setup flow in parent dashboard: parent taps "Set PIN" on a child tile → enters a 4-digit PIN → confirm → save via PATCH `/api/children/[childId]/pin`
5. Remove PIN flow: parent can remove PIN from the same modal
6. Kid session: once a child authenticates with PIN/biometric, set a short-lived kid session cookie so they can navigate `/learn` without re-entering PIN

**Files to create/modify:**
- `app/api/kids/login/route.ts` — verify PIN against bcrypt hash
- `app/kids/page.tsx` — PIN entry UI for each child tile, biometric trigger
- `app/api/children/[childId]/pin/route.ts` — check existing implementation
- `lib/auth.ts` or new `lib/kid-session.ts` — kid session token management
- Dashboard pin modal — already in `app/dashboard/page.tsx` (search for `openPinModal`)

**Acceptance criteria:**
- Parent sets a 4-digit PIN for a child via the dashboard
- On `/kids` page, child tile shows a PIN prompt when tapped
- Correct PIN grants access → kid session created → redirect to `/learn`
- Wrong PIN shows error after 3 attempts (optional lockout)
- `GET /api/kids/session` returns the authenticated kid's childId and subject
- Biometric: WebAuthn registration + assertion wired to `allowedKidLoginMethods: ['facial']`

## Priority 2 — U2 Topic Preferences (in_progress)

- `GET/PATCH /api/children/[childId]/preferences` already exists
- Make sure `topicPreferences` on the child record is used in `getQuestionsForChild` to bias the question pool
- Add a simple topic picker UI in the parent dashboard (per child)
- **Do not break existing question selection when preferences are empty**

## Priority 3 — U5 Reward Shop (in_progress)

- `GET /api/rewards/catalog` + `POST /api/rewards/redeem` already exist
- Wire the `/rewards` page to show shop items (avatar frames, tile themes) from the catalog
- Show child's balance and allow redemption
- Keep the existing gift-card flow untouched

## Files to avoid
- `.secops/`
- `.github/workflows/`
- `lib/services/progress.ts` (just fixed — coordinate if you need changes)
- `app/api/progress/*` (just merged)

## Notes
- Build is green (npm run build passes locally)
- CI is running on master — check GitHub Actions before pushing breaking changes
- `mathsAttempted / englishAttempted / scienceAttempted` are new fields on `child.stats` — use them if you need per-subject attempt counts
- All 21 test suites are in `scripts/test/suites/` — Suite 22+ for new features
