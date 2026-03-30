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
export type QuestionVisualMode =
  | "counting-scene"
  | "shape-dots"
  | "word-cards"
  | "story-scene"
  | "concept-cards"
  | "match-pairs";     // tap-to-match two columns (e.g. carnivore ↔ meat eater)

export type QuestionInteractionType =
  | "tap-card"           // standard multiple-choice tap (default)
  | "tap-count"          // tap each object to count them
  | "dot-join"           // tap numbered dots in sequence to form a shape
  | "animated-story";    // watch an animated scene, then tap-card answer
export type ReporterType = "child" | "parent";
export type QuestionIssueStatus = "reported" | "triaged" | "resolved" | "dismissed";
export type RewardTransactionType = "earned" | "redeemed" | "merged_in" | "merged_out" | "adjusted";
export type RewardRedemptionStatus = "pending" | "approved" | "fulfilled" | "rejected";
export type KidLoginMethod = "pin" | "face" | "voice";
export type ChildThemeKey = "fantasy" | "unicorn" | "space" | "soccer" | "jungle" | "ocean";
export type ChildButtonStyle = "gradient" | "cartoon";
export type ChildCardStyle = "soft" | "bold";
export type ChildRewardStyle = "coins" | "stars" | "gems";

export interface ChildPreferences {
  theme: ChildThemeKey;
  avatar: string;
  buttonStyle: ChildButtonStyle;
  cardStyle: ChildCardStyle;
  rewardStyle?: ChildRewardStyle;
}

export interface TopicPreferenceState {
  include: string[];
  exclude: string[];
}

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
  preferences?: ChildPreferences;
  diagnosticComplete?: boolean;
  currentDifficultyMaths: number;
  currentDifficultyEnglish: number;
  currentDifficultyScience: number;
  rewardPoints?: number;
  rewardPointsRedeemed?: number;
  topicPreferences?: string[];
  topicPreferenceRules?: Partial<Record<Subject, TopicPreferenceState>>;
  tileThemeId?: string;
  tileFavoriteTags?: string[];
  hasChildPin?: boolean;
  childPinHash?: string;
  pinConfiguredAt?: string;
  allowedKidLoginMethods?: KidLoginMethod[];
  lastSubject?: Subject;
  lastSessionCompletedAt?: string;
  streakDays: number;
  lastActiveDate: string;
  totalCoins: number;
  totalStars: number;
  stats: {
    totalQuestionsAttempted: number;
    totalCorrect: number;
    // Per-subject attempt counts (0 = subject not yet practiced)
    mathsAttempted: number;
    englishAttempted: number;
    scienceAttempted: number;
    mathsCorrect: number;
    englishCorrect: number;
    scienceCorrect: number;
    // Cumulative accuracy per subject (0–100); only meaningful if *Attempted > 0
    mathsAccuracy: number;
    englishAccuracy: number;
    scienceAccuracy: number;
    favoriteTopics: string[];
    writingSessionsStarted?: number;
    writingSessionsCompleted?: number;
    writingWordsWritten?: number;
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

export interface CountingSceneData {
  type: "counting-scene";
  objectEmoji: string;    // e.g. "🍎"
  actorEmoji?: string;    // e.g. "👧"
  act1Count: number;      // first group size
  act2Count: number;      // second group size
  setting?: string;       // display label e.g. "orchard"
}

export interface MatchPairsData {
  type: "match-pairs";
  pairs: Array<{
    left: string;        // e.g. "Carnivore"
    right: string;       // e.g. "Eats meat"
    leftEmoji?: string;  // e.g. "🦁"
    rightEmoji?: string; // e.g. "🥩"
  }>;
  instruction?: string;  // e.g. "Match each animal type to what it eats"
}

export type QuestionInteractionData = CountingSceneData | MatchPairsData | Record<string, unknown>;

export interface QuestionGenerationMetadata {
  generator: "seed" | "bedrock" | "template" | "manual-import";
  templateId?: string;
  variantKey?: string;
  visualStyle?: "playful" | "illustrated" | "standard";
  visualMode?: QuestionVisualMode;
  interactionType?: QuestionInteractionType;
  interactionData?: QuestionInteractionData;
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

export interface ProgressSessionSummary {
  sessionId: string;
  subject: Subject;
  completedAt: string;
  totalQuestions: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  difficultyStart: number;
  difficultyEnd: number;
  topic: string;
  questionCount?: number;
  answers?: Array<{
    questionId: string;
    questionText?: string;
    chosenAnswer?: string;
    correctAnswer?: string;
    correct: boolean;
    topic: string;
    difficulty: number;
    timeSpent: number;
    answeredAt: string;
  }>;
}

export interface ProgressSummary {
  childId: string;
  totalSessions: number;
  sessionsBySubject: Record<Subject, ProgressSessionSummary[]>;
  accuracyBySubject: Record<Subject, number>;
}

export interface ChildJourneyTheme {
  tileThemeId: string;
  tileFavoriteTags: string[];
  preferences?: ChildPreferences;
}

export type WritingMode = "narrative" | "persuasive";

export type WritingStepName =
  | "setting"
  | "character"
  | "problem"
  | "action"
  | "ending"
  | "opinion"
  | "reason_1"
  | "example"
  | "reason_2"
  | "conclusion";

export interface WritingStepBlueprint {
  stepName: WritingStepName;
  label: string;
  prompt: string;
  hint: string;
  minWords: number;
  skills: string[];
}

export interface WritingModeBlueprint {
  mode: WritingMode;
  label: string;
  subtitle: string;
  durationMinutes: number;
  topicOptions: string[];
  steps: WritingStepBlueprint[];
}

export interface WritingStepState {
  stepName: WritingStepName;
  label: string;
  content: string;
  feedback: string[];
  words: number;
  penImageDataUrl?: string | null;
  completedAt?: string;
}

export interface WritingDraftComparison {
  addedWords: string[];
  removedWords: string[];
  changedWords: string[];
  summary: string;
}

export interface WritingSessionState {
  sessionId: string;
  userId: string;
  childId: string;
  country?: Country;
  ageGroup?: AgeGroup;
  writingMode: WritingMode;
  topic?: string;
  steps: WritingStepState[];
  currentStepIndex: number;
  isComplete: boolean;
  originalDraft?: string;
  finalDraft?: string;
  revisedDraft?: string;
  comparison?: WritingDraftComparison;
  pointsEarned?: number;
  createdAt: string;
  updatedAt: string;
}

export interface WritingSessionSummary {
  sessionId: string;
  childId: string;
  writingMode: WritingMode;
  completed: boolean;
  currentStepIndex: number;
  stepCount: number;
  pointsEarned: number;
  updatedAt: string;
}

export interface TopicPerformanceTopic {
  topic: string;
  attempts: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  lastAttemptAt: string;
}

export interface SubjectTopicPerformance {
  subject: Subject;
  attempts: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  topics: TopicPerformanceTopic[];
}

export interface TopicPerformanceSummary {
  childId: string;
  overallAccuracy: number;
  subjects: Record<Subject, SubjectTopicPerformance>;
  topTopics: TopicPerformanceTopic[];
  updatedAt: string;
}

export interface ProgressAlert {
  subject: Subject;
  topic: string;
  attempts: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  severity: "warning" | "danger";
  message: string;
  actionLabel: string;
  actionUrl: string;
}

export interface ProgressAlertSummary {
  childId: string;
  alerts: ProgressAlert[];
  updatedAt: string;
}

export interface WeeklyDigestTopic {
  subject: Subject;
  topic: string;
  attempts: number;
  correct: number;
  incorrect: number;
  accuracy: number;
}

export interface WeeklyDigestSummary {
  childId: string;
  childName: string;
  weekStart: string;
  weekEnd: string;
  totalSessions: number;
  totalQuestions: number;
  correct: number;
  accuracy: number;
  rewardPointsEarned: number;
  streakDays: number;
  subjectAccuracy: Record<Subject, number>;
  topTopics: WeeklyDigestTopic[];
  recentSessions: ProgressSessionSummary[];
}

export interface DiagnosticQuestion {
  questionId: string;
  questionText: string;
  answerOptions: AnswerOption[];
  difficulty: number;
  topics: string[];
  hint?: string;
}

export interface DiagnosticResult {
  childId: string;
  subject: "maths";
  totalQuestions: number;
  correctAnswers: number;
  baselineDifficulty: number;
  calibratedDifficulty: number;
  difficultyDelta: number;
  diagnosticComplete: boolean;
  nextUrl: string;
}

export interface RewardCatalogItem {
  rewardId: string;
  title: string;
  provider: string;
  pointsCost: number;
  currency: Currency;
  valueMinor: number;
  active: boolean;
}

export interface RewardShopItem {
  itemId: string;
  title: string;
  description: string;
  category: "avatar" | "theme" | "sticker";
  icon: string;
  pointsCost: number;
  active: boolean;
}

export interface RewardShopPurchase {
  childId: string;
  purchaseId: string;
  userId: string;
  itemId: string;
  itemTitle: string;
  pointsSpent: number;
  status: "pending" | "fulfilled";
  createdAt: string;
  updatedAt: string;
}

export interface RewardTransaction {
  childId: string;
  transactionId: string;
  userId: string;
  type: RewardTransactionType;
  pointsDelta: number;
  balanceAfter: number;
  relatedChildId?: string;
  rewardId?: string;
  redemptionId?: string;
  note?: string;
  createdAt: string;
}

export interface RewardRedemption {
  childId: string;
  redemptionId: string;
  userId: string;
  rewardId: string;
  rewardTitle: string;
  pointsSpent: number;
  status: RewardRedemptionStatus;
  mergedFromChildIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface QuestionIssue {
  questionId: string;
  issueId: string;
  reporterType: ReporterType;
  reporterId: string;
  userId: string;
  childId?: string;
  subject?: Subject;
  topics?: string[];
  reason: string;
  details?: string;
  status: QuestionIssueStatus;
  llmSuggestedFix?: string;
  createdAt: string;
  updatedAt: string;
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
  rewardPointsEarned?: number;
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
