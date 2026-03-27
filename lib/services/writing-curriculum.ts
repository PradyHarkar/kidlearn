import type { AgeGroup, Child, Country, WritingMode, WritingModeBlueprint, WritingStepBlueprint } from "@/types";

const NARRATIVE_STEPS: WritingStepBlueprint[] = [
  {
    stepName: "setting",
    label: "Setting",
    prompt: "Where does your story begin? Tell us about the place.",
    hint: "Start with a fun place like a park, jungle, castle, beach, or space station.",
    minWords: 8,
    skills: ["sequencing", "description"],
  },
  {
    stepName: "character",
    label: "Character",
    prompt: "Who is in your story? Describe them kindly.",
    hint: "Use a describing word so the reader can picture the character.",
    minWords: 8,
    skills: ["describing language", "detail"],
  },
  {
    stepName: "problem",
    label: "Problem",
    prompt: "What goes wrong or what challenge happens?",
    hint: "A story needs a little problem to make it exciting.",
    minWords: 8,
    skills: ["story structure", "problem solving"],
  },
  {
    stepName: "action",
    label: "Action",
    prompt: "What does the character do next?",
    hint: "Try a sequencing word like first, then, next, or suddenly.",
    minWords: 8,
    skills: ["sequencing", "action verbs"],
  },
  {
    stepName: "ending",
    label: "Ending",
    prompt: "How does the story finish?",
    hint: "Give the story a happy or thoughtful ending.",
    minWords: 8,
    skills: ["ending", "reflection"],
  },
];

const PERSUASIVE_STEPS: WritingStepBlueprint[] = [
  {
    stepName: "opinion",
    label: "Opinion",
    prompt: "What do you think? Tell us your opinion clearly.",
    hint: "Use words like I think, I believe, or In my opinion.",
    minWords: 8,
    skills: ["clear opinion", "opening statement"],
  },
  {
    stepName: "reason_1",
    label: "Reason 1",
    prompt: "Why do you think that? Give your first reason.",
    hint: "Try to explain why your idea matters.",
    minWords: 8,
    skills: ["reasoning", "clarity"],
  },
  {
    stepName: "example",
    label: "Example",
    prompt: "Can you give an example to support your reason?",
    hint: "Examples help people understand your idea better.",
    minWords: 8,
    skills: ["supporting evidence", "detail"],
  },
  {
    stepName: "reason_2",
    label: "Reason 2",
    prompt: "Give one more reason to support your opinion.",
    hint: "A second reason makes your writing stronger.",
    minWords: 8,
    skills: ["reasoning", "persuasive language"],
  },
  {
    stepName: "conclusion",
    label: "Conclusion",
    prompt: "Finish with a strong closing sentence.",
    hint: "Remind the reader of your opinion in a clear way.",
    minWords: 8,
    skills: ["conclusion", "closing"],
  },
];

const CURRICULUM: Record<WritingMode, WritingModeBlueprint> = {
  narrative: {
    mode: "narrative",
    label: "Narrative",
    subtitle: "Build a story step by step with setting, character, problem, action, and ending.",
    durationMinutes: 12,
    steps: NARRATIVE_STEPS,
  },
  persuasive: {
    mode: "persuasive",
    label: "Persuasive",
    subtitle: "Share your opinion and support it with reasons and examples.",
    durationMinutes: 10,
    steps: PERSUASIVE_STEPS,
  },
};

function normalizeAgeGroup(child: Pick<Child, "ageGroup" | "yearLevel">): AgeGroup {
  const yearLevel = child.yearLevel === "prep" ? "foundation" : (child.yearLevel as AgeGroup | undefined);
  return child.ageGroup || yearLevel || "year3";
}

export function isWritingMvpEnabled(child: Pick<Child, "country" | "ageGroup" | "yearLevel">): boolean {
  return (child.country as Country | undefined) === "AU" && normalizeAgeGroup(child) === "year3";
}

export function getWritingCurriculum(child: Pick<Child, "country" | "ageGroup" | "yearLevel">) {
  const enabled = isWritingMvpEnabled(child);
  return {
    enabled,
    title: "English Writing Studio",
    subtitle: enabled
      ? "Writing is the main adventure for this English area."
      : "English writing will open for the AU Year 3 MVP first.",
    modes: CURRICULUM,
    availableModes: enabled ? (["narrative", "persuasive"] as WritingMode[]) : ([] as WritingMode[]),
  };
}

export function getWritingModeBlueprint(mode: WritingMode): WritingModeBlueprint {
  return CURRICULUM[mode];
}
