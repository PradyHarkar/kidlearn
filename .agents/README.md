# Agents Coordination

This folder is the branch-agnostic coordination layer for Codex, Claude, and any future agent.

## Purpose

Use this when you want one shared place for:

- current task definition
- file ownership
- live agent status
- handoffs
- messages between agents
- launch/readiness reports

## How It Works

1. Write the task once in `.agents/task.json`.
2. Assign file ownership in `.agents/ownership.json`.
3. Each agent updates its own status file:
   - `.agents/status/codex.json`
   - `.agents/status/claude.json`
4. Each agent writes messages to its own inbox/outbox files under `.agents/messages/`.
5. Handoffs live in `.agents/handoffs/`.
6. Use `scripts/agents/set-task.mjs` to update the task file and `scripts/agents/post-handoff.mjs` to write a human-readable handoff.
7. Use `.agents/nodes.md` as the LangGraph node contract and `.agents/prompts/claude-product.md` when Claude should act as the product owner.
8. Run `npm run agents:graph` when you want the real LangGraph coordinator to generate a product/architect/coder/tester/security/housekeeper report from the shared task file.

## Cadence

- Poll the other agent every 5 seconds while actively working.
- Update your own status every 30-60 seconds.
- Always include:
  - `finished`
  - `doingNow`
  - `etaMinutes`
  - `blocker`

## LangGraph Fit

LangGraph now orchestrates the roles and transitions through `scripts/agents/langgraph-orchestrator.ts`, but this folder stays the source of truth.

Recommended roles:

- product
- architect
- coder
- tester
- security
- housekeeper

Suggested task flow:

1. Confluence page becomes the input.
2. Product role turns the requirement into a crisp problem statement, use cases, NFRs, and churn risks.
3. Codex writes the shared objective into `.agents/task.json`.
4. Claude reads the same task file and takes testing/security/reporting.
5. The graph transitions through product -> architect -> coder -> tester -> security -> housekeeper.
6. If the request is vague, product must run before any coding starts.

## Confluence Fit

If requirements live in Confluence, keep the source page link or pasted requirements in the task file.

Use environment variables or your secret manager for credentials such as:

- `CONFLUENCE_BASE_URL`
- `CONFLUENCE_SPACE_KEY`
- `CONFLUENCE_API_KEY`

Never commit the API key into git.
