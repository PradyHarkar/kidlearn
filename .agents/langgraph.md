# LangGraph Coordination Plan

This repo now has a real LangGraph runner in `scripts/agents/langgraph-orchestrator.ts`.
It reads the shared task file and walks the role graph product -> architect -> coder -> tester -> security -> housekeeper.

## Role Graph

0. `product`
   - owns requirement quality
   - defines use cases and acceptance ideas
   - brings industry-best and out-of-the-box features
   - checks NFRs like speed, reliability, clarity, safety, and maintainability
   - looks for churn reduction and user-pattern learning

1. `architect`
   - defines the problem
   - splits the work into lanes
   - writes the shared objective

2. `coder`
   - makes the code change
   - keeps write scope inside ownership

3. `tester`
   - adds or updates tests after each code change
   - verifies the behavioral contract

4. `security`
   - checks for secrets, exposure, unsafe config, and public leakage

5. `housekeeper`
   - checks repo organization and production readiness
   - confirms the repo is clean enough to launch

## State Machine

- shared task file is the graph input
- status files are the live agent state
- handoff files are the transition notes
- message files are the short conversation channel
- product should be consulted before implementation whenever the request is ambiguous or missing business detail
- the LangGraph runner can also emit a markdown report and a handoff file for Codex or Claude

## Cadence

- poll every 5 seconds
- update status every 30-60 seconds
- write a new handoff whenever the task changes materially

## How To Run

- `npm run agents:graph -- --explain`
- `npm run agents:graph -- --to claude`
- `npm run agents:graph:write`

The `--write` mode saves a report to `.agents/reports/langgraph-latest.md` and refreshes the target handoff file.

## Confluence Intake

Use Confluence as the requirement source of truth.

Recommended env vars:

- `CONFLUENCE_BASE_URL`
- `CONFLUENCE_SPACE_KEY`
- `CONFLUENCE_API_KEY`

Keep the API key out of git and out of handoff text.
