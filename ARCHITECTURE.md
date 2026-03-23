# KidLearn — Architecture & Documentation

## Project Overview
KidLearn is a production-ready adaptive edutech platform for Prep (age 5-6) and Year 3 (age 8-9) students, focused on Maths and English with adaptive difficulty.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes (serverless)
- **Database**: AWS DynamoDB (on-demand billing)
- **Auth**: NextAuth.js v4 with JWT + bcrypt
- **AI/Content**: AWS Bedrock (Claude 3.5 Sonnet) for dynamic generation
- **Hosting**: Vercel (frontend + API)
- **Region**: ap-southeast-2 (Sydney)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                    VERCEL (CDN)                      │
│  ┌───────────────────────────────────────────────┐  │
│  │         Next.js 14 App Router                 │  │
│  │  ┌─────────────┐  ┌───────────────────────┐  │  │
│  │  │  Pages/UI   │  │    API Routes          │  │  │
│  │  │  /          │  │  /api/auth/*           │  │  │
│  │  │  /login     │  │  /api/children         │  │  │
│  │  │  /signup    │  │  /api/questions        │  │  │
│  │  │  /dashboard │  │  /api/progress         │  │  │
│  │  │  /learn     │  │  /api/achievements     │  │  │
│  │  │  /results   │  │  /api/bedrock          │  │  │
│  │  │             │  │  /api/seed             │  │  │
│  │  │             │  │  /api/questions/upload │  │  │
│  │  └─────────────┘  └───────────────────────┘  │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
              │                    │
              ▼                    ▼
   ┌─────────────────┐   ┌─────────────────────┐
   │  AWS DynamoDB   │   │   AWS Bedrock        │
   │  5 Tables       │   │  Claude 3.5 Sonnet   │
   │  ap-southeast-2 │   │  us-east-1           │
   └─────────────────┘   └─────────────────────┘
```

---

## DynamoDB Tables

### `kidlearn-users`
| Key | Type | Description |
|-----|------|-------------|
| userId (PK) | String | UUID |
| email | String | GSI (email-index) |
| passwordHash | String | bcrypt hash |
| parentName | String | Display name |
| createdAt | String | ISO timestamp |

### `kidlearn-children`
| Key | Type | Description |
|-----|------|-------------|
| userId (PK) | String | Parent's userId |
| childId (SK) | String | UUID |
| childName | String | Child display name |
| yearLevel | String | "prep" or "year3" |
| avatar | String | Emoji character |
| currentDifficultyMaths | Number | 1-10 |
| currentDifficultyEnglish | Number | 1-10 |
| streakDays | Number | Daily learning streak |
| totalCoins | Number | Gamification coins |
| totalStars | Number | Star rewards |
| stats | Object | Accuracy, topics |

### `kidlearn-questions`
| Key | Type | Description |
|-----|------|-------------|
| pk (PK) | String | "subject#yearLevel" e.g. "maths#prep" |
| questionId (SK) | String | UUID |
| questionText | String | The question |
| answerOptions | List | [{id, text, emoji, isCorrect}] |
| difficulty | Number | 1-10 |
| topics | List | e.g. ["counting", "addition"] |
| explanation | String | Why the answer is correct |
| hint | String | Optional help text |
| subject | String | "maths" or "english" |
| yearLevel | String | "prep" or "year3" |

### `kidlearn-progress`
| Key | Type | Description |
|-----|------|-------------|
| childId (PK) | String | Child's UUID |
| sessionKey (SK) | String | "date#timestamp#questionId" |
| sessionId | String | Groups questions into sessions |
| correct | Boolean | Was it answered correctly |
| timeSpent | Number | Seconds on this question |
| difficultyAttempted | Number | Difficulty at time of answer |
| subject | String | "maths" or "english" |
| topic | String | Question topic |

### `kidlearn-achievements`
| Key | Type | Description |
|-----|------|-------------|
| childId (PK) | String | Child's UUID |
| achievementId (SK) | String | Unique badge ID |
| badgeName | String | Display name |
| badgeIcon | String | Emoji |
| description | String | How it was earned |
| category | String | "maths", "english", "streak", "milestone" |

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | None | Create parent account |
| POST | `/api/auth/[...nextauth]` | N/A | NextAuth (login/logout) |
| GET | `/api/children` | Session | Get parent's children |
| POST | `/api/children` | Session | Create child profile |
| GET | `/api/children/[id]` | Session | Get specific child |
| DELETE | `/api/children/[id]` | Session | Delete child |
| GET | `/api/questions?subject=&childId=` | Session | Get 10 adaptive questions |
| POST | `/api/questions/upload` | Session/Secret | Bulk upload questions |
| POST | `/api/progress` | Session | Save session results |
| GET | `/api/progress?childId=` | Session | Get child's history |
| GET | `/api/achievements?childId=` | Session | Get child's badges |
| POST | `/api/bedrock` | Session | Generate questions via AI |
| GET | `/api/seed` | Dev/Secret | Seed sample questions |
| GET | `/api/health` | None | Service health check |

---

## Adaptive Learning Algorithm

```
Start at difficulty 1

After each answer:
  IF 3 consecutive correct → difficulty +1 (max 10)
  IF 2 consecutive wrong → difficulty -1 (min 1)

Year level advancement:
  IF accuracy >= 90% AND difficulty >= 8 AND yearLevel == "prep"
  → Advance to Year 3 content

Inactivity reset:
  IF lastActiveDate >= 7 days ago → reset to difficulty 1
```

---

## Adding Custom Questions (GPT Import)

### Question JSON Format
```json
POST /api/questions/upload
{
  "questions": [
    {
      "questionText": "What is 5 × 6?",
      "answerOptions": [
        { "text": "25", "emoji": "2️⃣5️⃣", "isCorrect": false },
        { "text": "30", "emoji": "3️⃣0️⃣", "isCorrect": true },
        { "text": "35", "emoji": "3️⃣5️⃣", "isCorrect": false },
        { "text": "11", "emoji": "1️⃣1️⃣", "isCorrect": false }
      ],
      "difficulty": 5,
      "topics": ["multiplication"],
      "explanation": "5 × 6 = 30. Count by 5s six times!",
      "subject": "maths",
      "yearLevel": "year3",
      "hint": "Count in 5s"
    }
  ],
  "secret": "YOUR_NEXTAUTH_SECRET"
}
```

### Validation Rules
- `subject`: must be `"maths"` or `"english"`
- `yearLevel`: must be `"prep"` or `"year3"`
- `difficulty`: number from 1-10
- `answerOptions`: 2-4 options, exactly 1 `isCorrect: true`
- `topics`: array of strings (e.g., `["multiplication"]`)

---

## Gamification System

### Coins
- Correct answer: 10 + (difficulty × 2) coins
- 90%+ session accuracy: +20 bonus coins
- Daily streak maintained: +5 coins

### Stars (per session)
- ⭐⭐⭐ = 90%+ accuracy
- ⭐⭐ = 70-89% accuracy
- ⭐ = 50-69% accuracy
- 0 stars = below 50%

### Achievements
| Badge | Condition |
|-------|-----------|
| First Steps 🌟 | Answer first question |
| Math Wizard 🧙‍♂️ | 90%+ maths accuracy |
| Word Master 📚 | 90%+ English accuracy |
| Perfect Week 🏆 | 7-day streak |
| 100 Questions Club 💯 | Answer 100 questions |
| 3 Day Streak 🔥 | Learn 3 days in a row |
| Perfect Score! ⭐ | 100% in a session |
| Fast Learner ⚡ | Answer 50 correctly |

---

## Deployment

### Environment Variables (Vercel)
```
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=<random-32-char-string>
AWS_REGION=ap-southeast-2
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
BEDROCK_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
DYNAMODB_USERS_TABLE=kidlearn-users
DYNAMODB_CHILDREN_TABLE=kidlearn-children
DYNAMODB_QUESTIONS_TABLE=kidlearn-questions
DYNAMODB_PROGRESS_TABLE=kidlearn-progress
DYNAMODB_ACHIEVEMENTS_TABLE=kidlearn-achievements
```

### Deploy Steps
1. Push to GitHub
2. Connect repo to Vercel
3. Set environment variables
4. Deploy
5. Run `https://your-app.vercel.app/api/seed?secret=<NEXTAUTH_SECRET>` to seed questions

---

## Cost Estimate (100 active users/month)

| Service | Usage | Est. Cost |
|---------|-------|-----------|
| Vercel | Serverless functions | Free tier |
| DynamoDB | ~100K reads/writes | ~$2-5/month |
| Bedrock (Claude) | ~1000 API calls | ~$3-8/month |
| Total | | **~$5-15/month** |
