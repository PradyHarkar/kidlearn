import type { AgeGroup, Child, Country, YearLevel } from "@/types";
import { getGradeConfig } from "@/lib/curriculum";

const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  foundation: "Foundation",
  year1: "Year 1",
  year2: "Year 2",
  year3: "Year 3",
  year4: "Year 4",
  year5: "Year 5",
  year6: "Year 6",
  year7: "Year 7",
  year8: "Year 8",
};

export function toAgeGroup(level: AgeGroup | YearLevel): AgeGroup {
  return level === "prep" ? "foundation" : level;
}

export function toLegacyYearLevel(ageGroup: AgeGroup): YearLevel {
  return ageGroup === "foundation" ? "prep" : ageGroup;
}

export function resolveChildAgeGroup(child: Pick<Child, "ageGroup" | "yearLevel">): AgeGroup {
  if (child.ageGroup) {
    return child.ageGroup;
  }

  return toAgeGroup(child.yearLevel);
}

export function getLearnerDisplayLabel(child: Pick<Child, "grade" | "country" | "ageGroup" | "yearLevel">): string {
  const country = child.country as Country | undefined;

  if (child.grade && country) {
    const grade = getGradeConfig(country, child.grade);
    if (grade) {
      return grade.displayName;
    }
  }

  const ageGroup = child.ageGroup ? child.ageGroup : toAgeGroup(child.yearLevel);
  return AGE_GROUP_LABELS[ageGroup];
}
