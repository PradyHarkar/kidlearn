# KidLearn

KidLearn is a Next.js learning platform for primary-school students with:
- parent authentication
- child profiles
- adaptive lesson flow
- DynamoDB-backed progress tracking
- subscription billing
- optional AI-assisted content generation via AWS Bedrock

This repository is currently in an architecture-hardening phase. The app works, but the codebase is being aligned toward a production-grade model with cleaner domain boundaries, better testability, and more accurate documentation.

## Current Stack

- Frontend: Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Framer Motion
- Backend: Next.js route handlers
- Data: AWS DynamoDB
- Auth: NextAuth credentials provider
- Billing: Stripe
- AI: AWS Bedrock
- Infra: AWS CDK and Amplify-related deployment assets are present in-repo

## Repo Layout

- `app/`: routes, pages, and API handlers
- `components/`: shared UI components
- `lib/`: application logic and infrastructure helpers
- `types/`: shared TypeScript types
- `scripts/`: setup and seed scripts
- `infrastructure/`: AWS CDK app and stack definitions

## Local Development

1. Install dependencies:

```bash
npm ci
```

2. Configure environment variables in `.env.local`.

3. Start the app:

```bash
npm run dev
```

4. Open `http://localhost:3000`.

## Quality Checks

Run the current engineering checks with:

```bash
npm run lint
npm run typecheck
```

## Question Bank Pipeline

The repo now includes a bulk question-bank generator for building large curriculum partitions in the existing DynamoDB questions table.

Generate one class/subject bank to JSON:

```bash
npm run generate:questions -- --ageGroup year1 --subject maths --count 10000 --out generated/year1-maths.json
```

Generate the full matrix for all classes and subjects:

```bash
npm run generate:questions -- --count 10000 --out generated/full-question-bank.json
```

Generate all supported countries with country-specific partitions:

```bash
npm run generate:questions -- --allCountries --count 10000
```

Write sharded files per partition for later DB ingestion:

```bash
npm run generate:questions -- --allCountries --count 10000 --splitByPartition --outDir generated/full-bank
```

Upload directly to DynamoDB:

```bash
npm run generate:questions -- --ageGroup year1 --subject maths --count 10000 --upload
```

The questions are stored under country-aware partitions such as `maths#year3#AU`, with fallback support for older generic `subject#ageGroup` partitions.

## Current Architecture Notes

- The product model is evolving from a smaller MVP into a broader curriculum platform.
- There is active cleanup around learner-level concepts such as `grade`, `ageGroup`, and legacy `yearLevel`.
- Deployment assets currently point more strongly to AWS/Amplify than the older docs suggested.
- The repository still needs deeper production work in testing, service boundaries, security hardening, and observability.

## Important Caveat

Do not treat older markdown docs as production truth without checking the current code. The architecture documentation is being updated to match the implementation.
