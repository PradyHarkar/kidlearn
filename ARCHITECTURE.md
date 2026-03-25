# KidLearn Architecture

## Status

This document describes the codebase as it exists today, not the ideal target state.

KidLearn has a solid MVP structure, but it is not yet fully production-grade. The main architectural work in progress is consolidating domain models, extracting services, and improving testability and operational readiness.

## Runtime Architecture

- Web app: Next.js 14 App Router
- UI: React 18, Tailwind CSS, Framer Motion
- API surface: Next.js route handlers under `app/api/*`
- Authentication: NextAuth credentials flow with JWT sessions
- Primary datastore: DynamoDB
- Billing: Stripe
- AI/content generation: AWS Bedrock

## Deployment Reality

The repository currently contains:
- Amplify deployment configuration in `amplify.yml`
- CDK infrastructure in `infrastructure/`
- application code that expects AWS-managed services

Older documentation referred to Vercel as the primary hosting platform, but the repo now reflects a stronger AWS/Amplify deployment direction. That mismatch should be treated as technical-documentation drift and not as a reliable production decision record.

## Code Organization

- `app/`
  UI routes and route handlers
- `components/`
  shared presentation components
- `lib/`
  authentication, DynamoDB helpers, curriculum logic, adaptive logic, billing helpers, and service-adjacent modules
- `types/`
  shared domain types
- `scripts/`
  setup and seed utilities
- `infrastructure/`
  AWS CDK application and stack definitions

## Current Domain Model

The codebase currently mixes several learner-level concepts:
- `country`
- `grade`
- `ageGroup`
- legacy `yearLevel`
- legacy `prep`
- newer `foundation`

The intended direction appears to be:

`country -> grade -> ageGroup`

Where:
- `grade` is the country-facing label shown to users
- `ageGroup` is the internal content partition key
- `yearLevel` exists mainly for legacy compatibility

This area is the largest current source of architecture risk because it affects:
- child creation
- question retrieval
- adaptive progression
- persistence shape
- curriculum mapping

## Data Layer

DynamoDB is used for core entities such as:
- users
- children
- questions
- progress
- achievements
- subscriptions
- sessions

The current data-access approach is helper-based rather than repository-based. It works for an MVP, but it makes deeper business logic harder to test and easier to spread across route handlers.

## Business Logic Shape

The app currently has useful domain helpers in `lib/`, but responsibilities are still blended:
- route handlers perform transport work and some business logic
- helper modules contain both persistence orchestration and domain rules
- adaptive logic is documented more strongly than it is implemented

The target direction should be:
- thin route handlers
- explicit services by domain
- entity-focused repositories for DynamoDB access
- pure, tested decision logic where practical

## Testing And Quality

Current baseline:
- linting is available
- type checking is now available via `npm run typecheck`
- there is not yet a meaningful automated test suite

That means the repo has basic static checks but not enough protection for production-grade refactoring or high-confidence releases.

## Security And Operational Posture

Current strengths:
- authenticated routes use server-side session checks
- billing and infrastructure integration paths exist
- secrets-manager support is present

Current gaps:
- limited automated test coverage
- incomplete production observability
- documentation drift
- domain-model ambiguity
- route handlers still carrying business logic

## Architecture Assessment

What is already good:
- sensible Next.js app structure
- clear product direction
- typed models
- strong use of managed AWS services

What needs hardening next:
1. canonical domain model
2. service and repository layers
3. adaptive-engine correctness
4. persistence safety and idempotency
5. automated tests
6. observability and production controls

## Near-Term Architecture Principles

The next phase of work should follow these rules:
- one canonical source of truth for learner progression
- thin controllers, explicit services
- entity-focused data access
- idempotent writes for user-progress flows
- backward-compatible migrations instead of silent schema drift
- documentation must match deployed reality
