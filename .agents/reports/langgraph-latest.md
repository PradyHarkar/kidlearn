# LangGraph coordination run
- source of truth: .agents/task.json
- cadence: poll every 5s, update every 30-60s

## Product
- objective: Deliver the next Codex workstream batch: U1 progress charts, U2 topic preferences, and U5 reward shop. U4 diagnostic UI is complete and awaiting Claude test pass.
- problem: Parents need a dashboard that shows learning progress, lets them set topic interests, and lets kids spend points on in-app rewards. The diagnostic page already exists and the dashboard badge now links into it, but the rest of the product stack still needs the richer parent/kid flows.
- user: Parent managing multiple children, plus the child using the learning and reward flows.
- use cases:
- Parent opens Progress tab and sees recent accuracy by subject
- Parent sets topic preferences so questions lean toward subjects the child likes
- Parent or child buys avatar/theme rewards with earned points
- Diagnostic badge sends the parent into the new diagnostic flow
- nfrs:
- Reuse the existing progress and reward data model where possible
- Keep topic preference filtering safe and reversible if no matching pool exists
- Do not break the current reward gift-card flow
- Keep the UI compact and mobile friendly
- acceptance:
- Progress tab shows progress summary charts / session history
- Topic preferences can be saved per child and affect question selection
- Reward shop route exists and items can be redeemed from the rewards page
- Existing diagnostic and reward gift-card flows still work
- Typecheck passes
- anti-scope:
- Do NOT change the diagnostic API contract
- Do NOT rewrite the weekly email flow unless needed for correctness
- Do NOT remove the existing gift card reward flow

## Architect
- split work into disjoint lanes with explicit ownership
- dispatch agent: codex
- workstreams:
- AGENT-FOUNDATION | owner=codex | branch=codex/agents-foundation | status=done | eta=35m
- U4-DIAGNOSTIC-UI | owner=codex | branch=codex/diagnostic-ui | status=done | eta=35m
- U1-PROGRESS-CHARTS | owner=codex | branch=codex/u1-progress-charts | status=in_progress | eta=40m
- U2-TOPIC-PREFERENCES | owner=codex | branch=codex/u2-topic-preferences | status=in_progress | eta=50m
- U5-REWARD-SHOP | owner=codex | branch=codex/u5-reward-shop | status=in_progress | eta=60m
- U3-WEEKLY-EMAIL | owner=shared | branch= | status=pending | eta=60m

## Coder
- implement only the owner lane for the current workstream
- keep runtime code, APIs, and UI changes inside the ownership map
- suggested Codex tasks:
- Add GET /api/progress/summary and dashboard progress charts
- Add child topic preferences API and topic-interest picker UI
- Add reward shop API and wire the rewards page to it
- Keep the existing diagnostic link and gift card flows intact

## Tester
- run the targeted suite after each dev change
- cover happy path, edge cases, and NFRs
- suggested Claude tasks:
- Test the new progress summary and dashboard charts
- Test topic preference persistence and question filtering
- Test reward shop browsing and redemption
- Verify the diagnostic page still passes the existing contract tests

## Security
- check secrets, public exposure, dangerous env usage, and unsafe workflow changes
- keep API keys out of git, handoffs, and generated reports

## Housekeeper
- verify repo cleanliness and launch readiness
- confirm typecheck + tests + security gates are green before merge

## Next target
- codex

