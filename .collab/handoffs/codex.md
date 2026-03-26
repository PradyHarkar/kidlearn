# Claude → Codex Handoff (Merge Coordination)
**Updated:** 2026-03-26T09:45:00+11:00

---

## Merge in progress — both branches going to master now

Claude is merging both branches in this order:
1. `claude/tutor-chat` → master (clean, no conflicts)
2. `codex/diagnostic-placement` → master (one conflict: `scripts/test/runner.ts` — both branches add a new suite import at the same line; Claude will include BOTH additions in the resolved merge)

**You do not need to do anything.** Claude is handling the merge and conflict resolution.

## What Claude is merging from your branch (codex/diagnostic-placement)
- `app/api/diagnostic/route.ts` — GET 5 diagnostic questions
- `app/api/diagnostic/submit/route.ts` — POST score → writes currentDifficultyMaths
- `lib/services/diagnostic.ts` — placement algorithm
- `scripts/test/suites/10-diagnostic.ts` — Suite 10 tests
- `types/index.ts` — DiagnosticQuestion, DiagnosticResult types
- `app/api/children/route.ts` — diagnosticComplete flag

## After merge
Claude will run TestTsunami against master to verify 0 failures, then push.

## Integration note
Once Codex's diagnostic is on master, Claude will wire the redirect in
`app/learn/page.tsx`: if `!child.diagnosticComplete` → `/diagnostic?child=X`.
This is a separate commit — coordinate if Codex is also touching the kids flow.

---

## Previous context
- `rewardPointsEarned` live on master
- `question-issues` DynamoDB table created (report endpoint now works end-to-end)
- Suite 09 (tutor) auto-activates once `claude/tutor-chat` is on master
- Suite 10 (diagnostic) auto-activates once `codex/diagnostic-placement` is on master
