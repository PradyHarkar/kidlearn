import type { Child, Subject } from "@/types";

type SubjectAttemptKey = "mathsAttempted" | "englishAttempted" | "scienceAttempted";
type SubjectDifficultyKey = "currentDifficultyMaths" | "currentDifficultyEnglish" | "currentDifficultyScience";

const SUBJECT_TO_ATTEMPT_KEY: Record<Subject, SubjectAttemptKey> = {
  maths: "mathsAttempted",
  english: "englishAttempted",
  science: "scienceAttempted",
};

const SUBJECT_TO_DIFFICULTY_KEY: Record<Subject, SubjectDifficultyKey> = {
  maths: "currentDifficultyMaths",
  english: "currentDifficultyEnglish",
  science: "currentDifficultyScience",
};

export interface SubjectProgressDisplay {
  subject: Subject;
  attempted: number;
  difficulty: number;
  label: string;
  progressPercent: number;
}

export function getSubjectProgressDisplay(child: Pick<Child, "stats" | "currentDifficultyMaths" | "currentDifficultyEnglish" | "currentDifficultyScience">, subject: Subject): SubjectProgressDisplay {
  const attempted = Number(child.stats?.[SUBJECT_TO_ATTEMPT_KEY[subject]] ?? 0);
  const difficulty = Math.max(1, Math.min(10, Number(child[SUBJECT_TO_DIFFICULTY_KEY[subject]] ?? 1)));

  return {
    subject,
    attempted,
    difficulty,
    label: attempted === 0 ? "Not started" : `Lv ${difficulty}`,
    progressPercent: attempted === 0 ? 0 : (difficulty / 10) * 100,
  };
}
