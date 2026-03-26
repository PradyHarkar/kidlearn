export type Country = "AU" | "US" | "IN" | "UK";
export type Currency = "AUD" | "USD" | "INR" | "GBP";
export type SubscriptionStatus = "trial" | "active" | "cancelled" | "expired" | "past_due";
export type SubscriptionPlan = "weekly" | "annual";

// Internal age group used as the canonical key for question partitions
export type AgeGroup =
  | "foundation" // 5-6 years (Prep/Foundation/Kindergarten/Reception)
  | "year1"      // 6-7
  | "year2"      // 7-8
  | "year3"      // 8-9
  | "year4"      // 9-10
  | "year5"      // 10-11
  | "year6"      // 11-12
  | "year7"      // 12-13
  | "year8";     // 13-14

// `YearLevel` is legacy compatibility only. New code should prefer `AgeGroup`.
export type YearLevel = AgeGroup | "prep";

export type Subject = "maths" | "english" | "science";
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface User {
  userId: string;
  email: string;
  passwordHash: string;
  parentName: string;
  createdAt: string;
  // Country & subscription fields (added in v2)
  country?: Country;
  subscriptionStatus?: SubscriptionStatus;
  trialEndsAt?: string;
  stripeCustomerId?: string;
}

export interface Child {
  userId: string;
  childId: string;
  childName: string;
  yearLevel: YearLevel;   // legacy compatibility field
  ageGroup?: AgeGroup;    // canonical internal key for curriculum/question selection
  grade?: string;         // country-specific grade label (e.g. "year3", "grade3", "class3")
  country?: Country;      // denormalised from parent for report queries
  avatar: string;
  currentDifficultyMaths: number;
  currentDifficultyEnglish: number;
  currentDifficultyScience: number;
  streakDays: number;
  lastActiveDate: string;
  totalCoins: number;
  totalStars: number;
  stats: {
    totalQuestionsAttempted: number;
    totalCorrect: number;
    mathsAccuracy: number;
    englishAccuracy: number;
    scienceAccuracy: number;
    favoriteTopics: string[];
  };
  createdAt?: string;
}

export interface Subscription {
  userId: string;
  subscriptionId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currency: Currency;
  amount: number;               // in minor units (cents/paise/pence)
  stripeSubscriptionId?: string;
  stripeCustomerId: string;
  currentPeriodEnd: string;     // ISO timestamp
  cancelAtPeriodEnd?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AnswerOption {
  id: string;
  text: string;
  emoji?: string;
  imageUrl?: string;
  visualDescription?: string;
  imageAlt?: string;
  isCorrect: boolean;
}

export interface QuestionGenerationMetadata {
  generator: "seed" | "bedrock" | "template" | "manual-import";
  templateId?: string;
  variantKey?: string;
  visualStyle?: "playful" | "illustrated" | "standard";
  targetAgeBand?: "early-years" | "primary" | "middle-school";
  benchmarkFamily?: string;
  examStyle?: string;
  qualityVersion?: string;
}

export interface Question {
  pk: string;       // subject#ageGroup or subject#ageGroup#country
  questionId: string;
  questionText: string;
  answerOptions: AnswerOption[];
  difficulty: number;
  topics: string[];
  explanation: string;
  subject: Subject;
  yearLevel: YearLevel;   // legacy compatibility field stored with questions
  ageGroup?: AgeGroup;
  country?: Country;
  grade?: string;
  hint?: string;
  ttsText?: string;
  interactionType?: string;
  interactionData?: Record<string, unknown>;
  generationMetadata?: QuestionGenerationMetadata;
  cached?: boolean;
  createdAt: string;
}

export interface ProgressRecord {
  childId: string;
  sessionKey: string;   // YYYY-MM-DD#timestamp#questionId
  sessionId: string;
  questionId: string;
  subject: Subject;
  correct: boolean;
  timeSpent: number;
  difficultyAttempted: number;
  topic: string;
  createdAt: string;
}

export interface Achievement {
  childId: string;
  achievementId: string;
  badgeName: string;
  badgeIcon: string;
  description: string;
  unlockedDate: string;
  category: "maths" | "english" | "science" | "streak" | "milestone";
}

export interface SessionResult {
  sessionId: string;
  childId: string;
  subject: Subject;
  yearLevel: YearLevel;
  totalQuestions: number;
  correct: number;
  incorrect: number;
  skipped: number;
  accuracy: number;
  coinsEarned: number;
  starsEarned: number;
  newAchievements: Achievement[];
  difficultyStart: number;
  difficultyEnd: number;
  duration: number;
  yearLevelAdvanced?: boolean;
}

export interface DashboardStats {
  child: Child;
  recentSessions: SessionResult[];
  achievements: Achievement[];
  weeklyProgress: {
    date: string;
    mathsScore: number;
    englishScore: number;
    questionsAttempted: number;
  }[];
  strengths: string[];
  weaknesses: string[];
}
