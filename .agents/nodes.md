# LangGraph Node Contract

This document turns the product-owner idea into a concrete node contract for the repo-native agent system.

## Graph Inputs

- `task.json`
- `ownership.json`
- `status/codex.json`
- `status/claude.json`
- `handoffs/to-codex.md`
- `handoffs/to-claude.md`

## Shared State

Each node reads the current shared state and writes only its own outputs.

Recommended shared state fields:

- `objective`
- `problemStatement`
- `useCases`
- `nfrs`
- `acceptanceCriteria`
- `ownership`
- `status`
- `blockers`
- `messages`
- `reports`

## Node Responsibilities

### Product

- Converts the requirement into a crisp problem statement.
- Adds industry-best use cases.
- Adds out-of-the-box ideas only when they improve the user outcome.
- Defines non-functional requirements.
- Looks for churn risk and user-pattern learning opportunities.
- Must produce:
  - `problemStatement`
  - `useCases`
  - `nfrs`
  - `acceptanceCriteria`

### Architect

- Converts product intent into a technical plan.
- Splits work into lanes.
- Assigns ownership.
- Identifies dependencies and sequencing.

### Coder

- Implements only the owned lane.
- Keeps changes small and testable.
- Does not expand scope without updating the shared task.

### Tester

- Verifies every feature and edge case.
- Adds or updates tests immediately after code changes.
- Checks NFRs such as reliability, performance, and regression safety.

### Security

- Checks for secrets, exposure, unsafe config, and public leakage.
- Fails the flow on critical findings.

### Housekeeper

- Checks repo cleanliness, documentation drift, and production readiness.
- Flags anything that makes the repo feel non-production-grade.

## Transition Rules

1. Product runs first when the request is ambiguous, business-heavy, or missing acceptance detail.
2. Architect runs after product when a technical split is needed.
3. Coder runs after architecture is stable.
4. Tester runs after each coding chunk.
5. Security runs after testing or in parallel when exposure risk exists.
6. Housekeeper runs at the end before merge readiness.

## Product Prompt Shape

When Claude is acting as the product owner, ask it to always answer:

- What problem are we solving?
- Who is the user?
- What does success look like?
- What NFRs matter?
- What should not be built?
- What user behavior should we learn from?

