# Claude → Codex Handoff Note
_Last updated: 2026-03-26 | Branch: claude/learn-results-reporting_

---

## What Claude shipped

### Branch
`claude/learn-results-reporting` — 3 commits ahead of master.

### Files changed (do NOT conflict with Codex-owned files)

| File | What changed |
|---|---|
| `app/learn/page.tsx` | 20-question sessions, 🚩 report modal, 🏅 reward points counter |
| `app/results/page.tsx` | Reward points banner, "Next 20 Questions" routing, "Done for Now" |
| `app/page.tsx` | Added "🧒 Kid Login" button → `/kids/login` |
| `scripts/process-question-issues.ts` | NEW: reads issues DB, outputs fix-suggestions.json |
| `scripts/test/suites/07-report-question.ts` | NEW: 13 tests for POST /api/questions/report |
| `scripts/test/suites/08-session-shape.ts` | NEW: 8 tests verifying result shape for results page |
| `scripts/test/runner.ts` | Registered suites 07 + 08 |
| `app/api/questions/upload/route.ts` | Uses `getNextAuthSecret()` — fixes Lambda auth |
| `scripts/test/suites/02-children.ts` | US grade8 uses freshUser() |
| `scripts/test/lib/http.ts` | Cookie parsing fix (getSetCookie) |

---

## What Codex needs to know

### 1. Report endpoint (`POST /api/questions/report`) — YOU own it, Claude calls it
Claude wired the learn page to call your endpoint with this exact payload:
```json
{
  "questionId": "<id>",
  "childId": "<id or undefined>",
  "subject": "maths|english|science",
  "topics": ["topic1", "topic2"],
  "reason": "<user-selected reason string>",
  "details": "<optional free text>"
}
```
**NOT sent**: `reporterType`, `reporterId` — your backend derives these from actorSession.
**Auth**: The learn page uses the parent NextAuth session cookie (not kid session yet).
Kid session will work too once your PIN login is live — `actorSession` handles both.

### 2. Kid Login link on landing page
`app/page.tsx` now has a "🧒 Kid Login" button that routes to `/kids/login`.
That's your route (`app/kids/login/`). Make sure it exists. If the path is different, let me know.

### 3. Results page "Next 20 Questions" routing
`app/results/page.tsx` routes to `/learn?child=${result.childId}&subject=${result.subject}`.
This uses `result.childId` and `result.subject` from `POST /api/progress` response.
Claude verified both fields are present in the progress API response (suite 08 tests cover this).

### 4. New test suites (both should pass once your endpoints are stable)
- `npm run test:tsunami -- --suite report` — tests your `/api/questions/report` endpoint
- `npm run test:tsunami -- --suite session-shape` — tests progress result shape

To run just these two:
```bash
npx tsx scripts/test/runner.ts --suite report --no-setup --no-teardown --url <URL>
npx tsx scripts/test/runner.ts --suite session-shape --no-setup --no-teardown --url <URL>
```

---

## Outstanding items on Claude's side

1. **Upload route** (`app/api/questions/upload/route.ts`) — `getNextAuthSecret()` fix is in.
   The test (`suite 03`) will still skip if `NEXTAUTH_SECRET` env var isn't set locally.

2. **process-question-issues.ts** — reads `kidlearn-question-issues` DynamoDB table.
   This is the same table your `createQuestionIssue()` writes to. No conflict.

3. **Backfill** — `npm run backfill:difficulty` still needs to be run on prod against live DynamoDB to fix existing children (like "Ved") who have `currentDifficultyMaths: 1`.

---

## Files Codex should NOT touch (Claude's lane)
- `app/learn/page.tsx`
- `app/results/page.tsx`
- `app/page.tsx`
- `scripts/process-question-issues.ts`
- `scripts/test/suites/07-*.ts`, `08-*.ts`
- `app/api/questions/upload/route.ts`
