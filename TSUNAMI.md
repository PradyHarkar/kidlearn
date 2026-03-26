# 🌊 KidLearn TestTsunami
## LLM-Agnostic Test Plan

**Trigger phrase**: `TestTsunami`
**When you see this phrase**, immediately run the full test suite using the instructions below.
No clarification needed — it is pre-approved.

---

## Quick Start (30 seconds)

```bash
# Run everything against localhost
npm run test:tsunami

# Run against production (AWS)
KIDLEARN_URL=https://your-amplify-url.amplifyapp.com npm run test:tsunami:prod

# Run a single suite
npm run test:tsunami -- --suite adaptive   # unit tests only (no DB/server needed)
npm run test:tsunami -- --suite auth
npm run test:tsunami -- --suite children

# Keep test data for debugging
npm run test:tsunami -- --no-teardown --json
```

**Output**: Pass/fail per test + JSON report at `test-results.json` (with `--json`).

---

## What This Tests

| Suite | What | Type |
|-------|------|------|
| 06 adaptive | Difficulty algorithm, year advancement, grade→difficulty mapping | Pure unit |
| 01 auth | Register, login, CSRF, bad credentials, 401 gates | HTTP |
| 02 children | Create child (all countries/grades), difficulty assignment, 3-child limit | HTTP |
| 03 questions | Fetch by grade/subject/country, upload, partition fallback | HTTP |
| 04 progress | Submit session, stars/coins, adaptive adjustment, year advancement | HTTP |
| 05 subscription | Trial status, checkout shape, portal, country consistency | HTTP |

**Total test count**: ~60 tests across 6 suites.

---

## Manual Execution (for any LLM)

If you cannot run Node scripts, execute these tests manually using HTTP calls.

### Step 0 — Seed Test Data

Run once before testing:
```bash
npm run test:setup
```
Or if doing this manually, insert these records into DynamoDB directly via the AWS Console
or `aws dynamodb put-item`. See `scripts/test/fixtures.ts` for the exact records.

---

### Suite 01 — Auth

**Base assumption**: Test user `test.tsunami.au@kidlearn.test` / `TestTsunami123!` exists in DB.

| # | Request | Expected |
|---|---------|----------|
| 1.1 | `GET /api/auth/csrf` | `200` + body has `csrfToken` |
| 1.2 | Login via NextAuth credentials flow | `200` session cookie set, `GET /api/auth/session` returns `user.id` |
| 1.3 | Login with wrong password | Session NOT established |
| 1.4 | Login with unknown email | Session NOT established |
| 1.5 | `POST /api/register` with same email again | `409 Conflict` |
| 1.6 | `POST /api/register` with `email: "not-an-email"` | `400` |
| 1.7 | `POST /api/register` with `password: "short"` | `400` |
| 1.8 | `POST /api/register` with `country: "ZZ"` | `400` |
| 1.9 | `GET /api/children` without auth cookie | `401` |
| 1.10 | `GET /api/health` | `200` |

**Login flow**:
```
GET /api/auth/csrf  →  extract csrfToken
POST /api/auth/callback/credentials
  Content-Type: application/x-www-form-urlencoded
  body: email=test.tsunami.au@kidlearn.test&password=TestTsunami123!&csrfToken=<from above>&callbackUrl=/dashboard&json=true
→ Expect: redirect or 200; session cookie in response
GET /api/auth/session  →  Expect: { user: { id: "...", country: "AU" } }
```

---

### Suite 02 — Children

**Login as**: each country's test user before testing that country.

| # | Request | Expected |
|---|---------|----------|
| 2.1 | `GET /api/children` (logged in) | `200 { children: [...] }` |
| 2.2 | `POST /api/children` `{childName, grade:"year5", avatar}` (AU) | `201`, `child.currentDifficultyMaths === 6`, `child.ageGroup === "year5"` |
| 2.3 | `POST /api/children` `{grade:"year7"}` (AU) | `201`, difficulty=8, ageGroup="year7" **(not year3 fallback)** |
| 2.4 | `POST /api/children` `{grade:"year8"}` (UK) | `201`, difficulty=9, ageGroup="year8" |
| 2.5 | `POST /api/children` `{grade:"grade8"}` (US) | `201`, difficulty=9, ageGroup="year8" |
| 2.6 | `POST /api/children` `{grade:"class8"}` (IN) | `201`, difficulty=9, ageGroup="year8" |
| 2.7 | Create 4th child (same user) | `400 "Maximum 3 children"` |
| 2.8 | `POST /api/children` missing `grade` | `400` |

**Difficulty table to verify**:
```
AU: foundation=1, year1=2, year3=4, year5=6, year6=7, year7=8, year8=9
US: kindergarten=1, grade5=6, grade8=9
IN: class1=2, class8=9
UK: reception=1, year7=8, year8=9
```

---

### Suite 03 — Questions

| # | Request | Expected |
|---|---------|----------|
| 3.1 | `GET /api/questions?subject=maths&childId=<year5-child>` | `200`, `ageGroup="year5"`, `difficulty` in range 5–7, `questions.length >= 1` |
| 3.2 | Same without auth | `401` |
| 3.3 | `GET /api/questions?childId=<id>` (no subject) | `400` |
| 3.4 | `GET /api/questions?subject=maths` (no childId) | `400` |
| 3.5 | `GET /api/questions?subject=maths&childId=does-not-exist` | `404` |
| 3.6 | `POST /api/questions/upload` with 3 valid questions + secret | `200 { uploaded: 3, failed: 0 }` |
| 3.7 | `POST /api/questions/upload` no auth, no secret | `401` |
| 3.8 | `GET /api/questions?subject=english&childId=<id>` | `200` or `404` (both valid) |
| 3.9 | `GET /api/questions?subject=science&childId=<id>` | `200` or `404` (both valid) |

---

### Suite 04 — Progress

| # | Request | Expected |
|---|---------|----------|
| 4.1 | Submit 10/10 correct | `200`, `starsEarned=3`, `coinsEarned>0`, `accuracy=100` |
| 4.2 | Submit 7/10 correct | `200`, `starsEarned=2` |
| 4.3 | Submit 4/10 correct | `200`, `starsEarned=1` |
| 4.4 | Submit 3 consecutive correct | `200`, `difficultyEnd > difficultyStart` |
| 4.5 | Submit 2 consecutive wrong | `200`, `difficultyEnd <= difficultyStart` |
| 4.6 | Submit without auth | `401` |
| 4.7 | Submit for nonexistent child | `404` |
| 4.8 | `GET /api/progress?childId=<id>` | `200 { progress: [...] }` |

**Submit body shape**:
```json
{
  "childId": "<id>",
  "subject": "maths",
  "questions": [
    { "questionId": "q1", "correct": true, "timeSpent": 3000, "difficulty": 4, "topic": "addition" }
  ]
}
```

---

### Suite 05 — Subscription

| # | Request | Expected |
|---|---------|----------|
| 5.1 | `GET /api/subscription/status` (trial user) | `200`, `status="trial"`, `daysRemaining` 0–7 |
| 5.2 | Same without auth | `401` |
| 5.3 | `POST /api/subscription/checkout` `{plan:"monthly"}` | `400` (invalid plan) |
| 5.4 | `POST /api/subscription/checkout` without auth | `401` |
| 5.5 | `POST /api/subscription/checkout` `{plan:"weekly"}` | `200 {url: "https://checkout.stripe.com/..."}` OR `500 {error: "Missing env var STRIPE_PRICE_..."}` |
| 5.6 | `POST /api/subscription/portal` (no Stripe customer) | `400`/`404`/`500` with `error` field present |

**Stripe env var check** (if 5.5 fails with env error):
```
Required in Amplify Console → Environment variables:
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_AU_WEEKLY
STRIPE_PRICE_AU_ANNUAL
STRIPE_PRICE_US_WEEKLY
STRIPE_PRICE_US_ANNUAL
STRIPE_PRICE_IN_WEEKLY
STRIPE_PRICE_IN_ANNUAL
STRIPE_PRICE_UK_WEEKLY
STRIPE_PRICE_UK_ANNUAL
```

---

### Suite 06 — Adaptive Engine (unit, no HTTP)

These are pure function tests that can be run without a server.

Run: `npm run test:tsunami -- --suite adaptive`

| # | Input | Expected |
|---|-------|----------|
| 6.1 | `calculateDifficultyAdjustment(5, 3, 0)` | `6` |
| 6.2 | `calculateDifficultyAdjustment(5, 0, 2)` | `4` |
| 6.3 | `calculateDifficultyAdjustment(5, 2, 0)` | `5` (no change) |
| 6.4 | `calculateDifficultyAdjustment(10, 3, 0)` | `10` (capped at max) |
| 6.5 | `calculateDifficultyAdjustment(1, 0, 2)` | `1` (capped at min) |
| 6.6 | `shouldAdvanceYearLevel(95, 9, "year3")` | `true` |
| 6.7 | `shouldAdvanceYearLevel(95, 9, "year8")` | `false` (top level) |
| 6.8 | `shouldAdvanceYearLevel(80, 9, "year3")` | `false` (accuracy < 90) |
| 6.9 | `nextYearLevel("year3")` | `"year4"` |
| 6.10 | `nextYearLevel("year8")` | `"year8"` (stays at top) |
| 6.11 | `gradeToAgeGroup("AU", "year7")` | `"year7"` (regression: was "year3") |
| 6.12 | `gradeToAgeGroup("AU", "year8")` | `"year8"` (regression: was "year3") |
| 6.13 | `gradeToAgeGroup("US", "grade8")` | `"year8"` |
| 6.14 | `gradeToAgeGroup("UK", "year7")` | `"year7"` |
| 6.15 | `getInitialDifficultyForAgeGroup("year5")` | `6` |
| 6.16 | `getInitialDifficultyForAgeGroup("prep")` | `1` |

---

## Known Issues / What To Watch For

| Symptom | Root Cause | Status |
|---------|-----------|--------|
| Stripe checkout returns 500 | `STRIPE_PRICE_*` env vars missing from Amplify | ⚠ Check env vars |
| New child difficulty = 1 for Year 5+ | Old deployed code — fix in commit `8c2de19` | ✅ Fixed (deploy needed) |
| Existing child "Ved" sees basic questions | DynamoDB has `currentDifficultyMaths=1` — needs backfill | ⚠ Run `npm run backfill:difficulty` |
| AU Year 7 child maps to year3 questions | AU curriculum only had up to year6 | ✅ Fixed in commit `8c2de19` |
| Year advancement only from "prep" | Bug in `shouldAdvanceYearLevel` | ✅ Fixed in commit `8c2de19` |
| Year advancement always → year3 | Hardcoded in `submitProgressForChild` | ✅ Fixed in commit `8c2de19` |

---

## Test Data Reference

All test records have `_testFixture: true` in DynamoDB and IDs starting with `tt-`.
Run `npm run test:teardown` to remove them all.

| Record | ID / Email |
|--------|-----------|
| AU test user | `test.tsunami.au@kidlearn.test` |
| US test user | `test.tsunami.us@kidlearn.test` |
| IN test user | `test.tsunami.in@kidlearn.test` |
| UK test user | `test.tsunami.uk@kidlearn.test` |
| AU Year 5 child | `tt-child-au-year5` |
| AU Year 7 child | `tt-child-au-year7` |
| "Ved regression" child | `tt-child-ved-regression` (stored diff=1, ageGroup=year5) |
| Test questions | `tt-q-*` prefix, partitions: `maths#year5#AU`, `maths#year7#AU`, etc. |

---

## Interpreting Results

```
✓ green = pass
✗ red   = fail (message shows expected vs actual)

Exit code 0 = all pass
Exit code 1 = any failure
```

A failing adaptive unit test means a regression in the core algorithm.
A failing auth test means the deployed code has a runtime issue.
A failing Stripe test with "Missing env var" means Amplify needs those env vars set.

---

*This file is the contract between the product and any future LLM or human tester.
Update it whenever behaviour changes.*
