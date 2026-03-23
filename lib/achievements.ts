import { Achievement, Child } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { putItem, queryItems, TABLES } from "./dynamodb";

interface AchievementRule {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: "maths" | "english" | "science" | "streak" | "milestone";
  check: (child: Child, stats: AchievementStats) => boolean;
}

interface AchievementStats {
  totalQuestions: number;
  totalCorrect: number;
  currentStreak: number;
  mathsAccuracy: number;
  englishAccuracy: number;
  scienceAccuracy: number;
  perfectSessions: number;
}

const ACHIEVEMENT_RULES: AchievementRule[] = [
  {
    id: "first_question",
    name: "First Steps",
    icon: "🌟",
    description: "Answer your first question",
    category: "milestone",
    check: (_, stats) => stats.totalQuestions >= 1,
  },
  {
    id: "math_wizard",
    name: "Math Wizard",
    icon: "🧙‍♂️",
    description: "Get 90%+ accuracy in Maths",
    category: "maths",
    check: (_, stats) => stats.mathsAccuracy >= 90,
  },
  {
    id: "word_master",
    name: "Word Master",
    icon: "📚",
    description: "Get 90%+ accuracy in English",
    category: "english",
    check: (_, stats) => stats.englishAccuracy >= 90,
  },
  {
    id: "perfect_week",
    name: "Perfect Week",
    icon: "🏆",
    description: "Maintain a 7-day learning streak",
    category: "streak",
    check: (child) => child.streakDays >= 7,
  },
  {
    id: "hundred_club",
    name: "100 Questions Club",
    icon: "💯",
    description: "Answer 100 questions total",
    category: "milestone",
    check: (_, stats) => stats.totalQuestions >= 100,
  },
  {
    id: "streak_3",
    name: "3 Day Streak",
    icon: "🔥",
    description: "Learn for 3 days in a row",
    category: "streak",
    check: (child) => child.streakDays >= 3,
  },
  {
    id: "perfect_session",
    name: "Perfect Score!",
    icon: "⭐",
    description: "Get 100% in a session",
    category: "milestone",
    check: (_, stats) => stats.perfectSessions >= 1,
  },
  {
    id: "fast_learner",
    name: "Fast Learner",
    icon: "⚡",
    description: "Answer 50 questions correctly",
    category: "milestone",
    check: (_, stats) => stats.totalCorrect >= 50,
  },
  {
    id: "science_genius",
    name: "Science Genius",
    icon: "🔬",
    description: "Get 90%+ accuracy in Science",
    category: "science",
    check: (_, stats) => stats.scienceAccuracy >= 90,
  },
];

export async function checkAndGrantAchievements(
  childId: string,
  child: Child,
  stats: AchievementStats
): Promise<Achievement[]> {
  // Get existing achievements
  const existing = await queryItems(
    TABLES.ACHIEVEMENTS,
    "childId = :childId",
    { ":childId": childId }
  );
  const existingIds = new Set(existing.map((a) => a.achievementId));

  const newAchievements: Achievement[] = [];

  for (const rule of ACHIEVEMENT_RULES) {
    if (existingIds.has(rule.id)) continue;
    if (rule.check(child, stats)) {
      const achievement: Achievement = {
        childId,
        achievementId: rule.id,
        badgeName: rule.name,
        badgeIcon: rule.icon,
        description: rule.description,
        unlockedDate: new Date().toISOString(),
        category: rule.category,
      };
      await putItem(TABLES.ACHIEVEMENTS, achievement);
      newAchievements.push(achievement);
    }
  }

  return newAchievements;
}

export async function getChildAchievements(childId: string): Promise<Achievement[]> {
  const items = await queryItems(
    TABLES.ACHIEVEMENTS,
    "childId = :childId",
    { ":childId": childId }
  );
  return items as Achievement[];
}

export function updateStreak(child: Pick<Child, "streakDays" | "lastActiveDate">): { newStreak: number; coins: number } {
  const today = new Date().toDateString();
  const lastActive = child.lastActiveDate
    ? new Date(child.lastActiveDate).toDateString()
    : null;

  if (lastActive === today) {
    return { newStreak: child.streakDays, coins: 0 };
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (lastActive === yesterday.toDateString()) {
    const newStreak = child.streakDays + 1;
    const bonusCoins = newStreak % 7 === 0 ? 50 : 5;
    return { newStreak, coins: bonusCoins };
  }

  // Streak broken
  return { newStreak: 1, coins: 0 };
}
