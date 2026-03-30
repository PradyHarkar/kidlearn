import { getTopicsForGrade } from "@/lib/curriculum";
import type { AgeGroup, Child, Country, Subject, TopicPreferenceState } from "@/types";

export type TopicPreferenceRules = Partial<Record<Subject, TopicPreferenceState>>;

export const PREFERENCE_SUBJECTS: Subject[] = ["english", "maths", "science"];

function normalizeTopic(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function sortTopicsAlphabetically(topics: string[]): string[] {
  return Array.from(new Set(topics.map((topic) => topic.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
}

function normalizeAgeGroup(child: Pick<Child, "ageGroup" | "yearLevel">): AgeGroup {
  return child.ageGroup || (child.yearLevel === "prep" ? "foundation" : (child.yearLevel as AgeGroup)) || "year3";
}

export function getTopicsForPreferenceSubject(
  child: Pick<Child, "ageGroup" | "yearLevel" | "country">,
  subject: Subject
): string[] {
  const ageGroup = normalizeAgeGroup(child);
  const country = (child.country as Country) ?? "AU";
  return sortTopicsAlphabetically(getTopicsForGrade(ageGroup, subject, country));
}

export function buildDefaultTopicPreferenceRules(
  child: Pick<Child, "ageGroup" | "yearLevel" | "country">
): TopicPreferenceRules {
  return PREFERENCE_SUBJECTS.reduce((acc, subject) => {
    acc[subject] = {
      include: [],
      exclude: [],
    };
    return acc;
  }, {} as TopicPreferenceRules);
}

export function normalizeTopicPreferenceRules(
  rules: TopicPreferenceRules | undefined,
  child: Pick<Child, "ageGroup" | "yearLevel" | "country">
): TopicPreferenceRules {
  const base = buildDefaultTopicPreferenceRules(child);
  const normalized: TopicPreferenceRules = {};

  for (const subject of PREFERENCE_SUBJECTS) {
    const incoming = rules?.[subject];
    normalized[subject] = {
      include: sortTopicsAlphabetically(incoming?.include || base[subject]?.include || []),
      exclude: sortTopicsAlphabetically(incoming?.exclude || []),
    };
  }

  return normalized;
}

export function buildLegacyTopicPreferences(
  rules: TopicPreferenceRules | undefined,
  child: Pick<Child, "ageGroup" | "yearLevel" | "country">
): string[] {
  const normalized = normalizeTopicPreferenceRules(rules, child);
  const included = PREFERENCE_SUBJECTS.flatMap((subject) => normalized[subject]?.include || []);
  const excluded = new Set(
    PREFERENCE_SUBJECTS.flatMap((subject) => normalized[subject]?.exclude || []).map(normalizeTopic)
  );

  return sortTopicsAlphabetically(
    included.filter((topic) => !excluded.has(normalizeTopic(topic)))
  );
}

export function buildTopicPreferenceRuleSummary(rules: TopicPreferenceRules | undefined, child: Pick<Child, "ageGroup" | "yearLevel" | "country">) {
  const normalized = normalizeTopicPreferenceRules(rules, child);

  return PREFERENCE_SUBJECTS.map((subject) => ({
    subject,
    include: normalized[subject]?.include || [],
    exclude: normalized[subject]?.exclude || [],
    options: getTopicsForPreferenceSubject(child, subject),
  }));
}

export function mergeTopicPreferenceRule(
  existing: TopicPreferenceRules | undefined,
  subject: Subject,
  next: TopicPreferenceState
): TopicPreferenceRules {
  return {
    ...(existing || {}),
    [subject]: {
      include: sortTopicsAlphabetically(next.include || []),
      exclude: sortTopicsAlphabetically(next.exclude || []),
    },
  };
}

export function applyTopicPreferenceRules(
  topics: string[],
  rule?: TopicPreferenceState
) {
  if (!rule) return topics;

  const includeSet = new Set((rule.include || []).map(normalizeTopic));
  const excludeSet = new Set((rule.exclude || []).map(normalizeTopic));

  const filtered = topics.filter((topic) => {
    const normalized = normalizeTopic(topic);
    if (excludeSet.has(normalized)) return false;
    if (includeSet.size === 0) return true;
    return includeSet.has(normalized);
  });

  return filtered.length ? filtered : topics;
}
