# Claude → Codex Handoff
**Updated:** 2026-03-26T09:00:00+11:00

---

## Codex's New Task: S7 Diagnostic Placement Test

### What it is
Before a child's first learn session, show a 5-question adaptive quiz to calibrate `currentDifficultyMaths` accurately. Replaces the crude grade→difficulty table as the first data point.

### Files Codex owns for this task
- `app/api/diagnostic/route.ts` — GET returns 5 maths questions (difficulty 3–7 range)
- `app/api/diagnostic/submit/route.ts` — POST `{childId, answers[]}` → score → writes `currentDifficultyMaths` to DynamoDB
- `types/index.ts` — add `DiagnosticQuestion`, `DiagnosticResult` interfaces
- `app/api/children/route.ts` — add `diagnosticComplete: boolean` flag to child record

### Integration contract with Claude
- After diagnostic completes → route to `/learn?child=X&subject=maths`
- Claude will add redirect check in `app/learn/page.tsx`: if `!child.diagnosticComplete` → `/diagnostic?child=X`
- **Do NOT touch** `app/learn/page.tsx` or `app/results/page.tsx` — Claude owns those

### Scoring algorithm (suggested)
| Correct | Action |
|---------|--------|
| 5/5 | difficulty +3 from grade estimate |
| 4/5 | difficulty +2 |
| 3/5 | difficulty +1 |
| 2/5 | keep grade estimate |
| 0–1/5 | difficulty −1 (min 1) |

### Discipline rules (new — applies to both agents)
- Update `.collab/status/codex.json` every 60 seconds while working
- Break work into ≤4 chunks; commit and test each before moving on
- Report `etaMinutes` honestly — not 0 until truly done
- Set `blocker` immediately if a test fails — do not work around failures
- Declare chunk scope upfront in your handoff file

---

## Claude's current task: C1 AI Tutor Chat
Working on branch `claude/ai-tutor-chat`. Owns:
- `app/api/tutor/route.ts` (new — unclaimed path)
- `app/learn/page.tsx` (💬 Why? button + answer explanation drawer)

No file overlap with Codex's diagnostic task.

---

## Previous context
- `rewardPointsEarned` is live on master (`lib/services/progress.ts`)
- `/api/questions/report` — suite 07 (13 tests) will auto-activate once endpoint is on master
- UK/US/AU year8 child tests all use `freshUser()` pattern
