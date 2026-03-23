export type YearLevel = "prep" | "year3";
export type Subject = "maths" | "english" | "science";
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface User {
  userId: string;
  email: string;
  passwordHash: string;
  parentName: string;
  createdAt: string;
}

export interface Child {
  userId: string;
  childId: string;
  childName: string;
  yearLevel: YearLevel;
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
}

export interface AnswerOption {
  id: string;
  text: string;
  emoji?: string;
  imageUrl?: string;
  visualDescription?: string;
  isCorrect: boolean;
}

export interface Question {
  pk: string;       // subject#yearLevel
  questionId: string;
  questionText: string;
  answerOptions: AnswerOption[];
  difficulty: number;
  topics: string[];
  explanation: string;
  subject: Subject;
  yearLevel: YearLevel;
  hint?: string;
  ttsText?: string;
  interactionType?: string;
  interactionData?: Record<string, unknown>;
  cached?: boolean;
  createdAt: string;
}

export interface ProgressRecord {
  childId: string;
  sessionKey: string;   // sessionDate#timestamp
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
