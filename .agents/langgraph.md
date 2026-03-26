# LangGraph Coordination Plan

This repo uses LangGraph as the conceptual orchestrator for a repo-native multi-agent workflow.

## Role Graph

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

## Cadence

- poll every 5 seconds
- update status every 30-60 seconds
- write a new handoff whenever the task changes materially

## Confluence Intake

Use Confluence as the requirement source of truth.

Recommended env vars:

- `CONFLUENCE_BASE_URL`
- `CONFLUENCE_SPACE_KEY`
- `CONFLUENCE_API_KEY`

Keep the API key out of git and out of handoff text.
