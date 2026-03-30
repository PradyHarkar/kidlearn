# Questions.md

## Purpose
This document defines what a good KidLearn question is.

Questions must teach, not just test.
They should help a child understand a concept, feel progress, and stay engaged.

## Non-Negotiables
- The question must make real-world sense.
- The question must be age-appropriate.
- The question must match the country and curriculum.
- The stem must read naturally and start with a capital letter.
- There must be one clear correct answer.
- The distractors must be plausible but not confusing.
- The question should feel like a lesson or mini activity, not a random quiz.
- The answer options must not always place the correct answer in the same position.
- The question should support a visible difficulty ramp across a session.

## Audience
- Primary: children
- Secondary: parents
- Tertiary: teachers and schools

## Question Design Rules
1. Use simple, child-friendly language.
2. Keep the story or context logically correct.
3. Do not mix unrelated ideas in one question.
4. Do not use silly or artificial scenarios if the child would never meet them in real life.
5. Keep the stem short unless the skill being tested needs a longer prompt.
6. Prefer one learning idea per question.
7. For younger children, use more visual and interactive formats.
8. For older children, use more reasoning and multi-step thinking.

## Curriculum Rules
Every question must map to:
- country
- year or age group
- subject
- topic
- difficulty level
- question mode

The generator should prefer curriculum-aligned content first and only fall back to generic content when necessary.

## Interactive Question Modes
Use the best mode for the skill, not just multiple choice.

Examples:
- counting-scene for early maths
- dot-join for shapes
- tap-card for standard selection
- animated-story for scene-based reasoning
- match-following for classification and vocabulary
- drag-sort for ordering and grouping

## Theme Rules
Questions should respect the child's chosen theme and favorite topics when possible.

Examples:
- soccer theme can use footballs, players, goals, and stadium scenes
- jungle theme can use animals, vines, trees, and counting scenes
- space theme can use planets, rockets, stars, and astronauts

The theme should support the learning, not hide it.

## Answer Option Rules
- 2 to 4 options for most questions
- exactly one correct answer
- unique option text
- no obvious pattern in answer position
- keep the correct answer randomized across the session
- use clear and readable distractors

## Difficulty Rules
- Early questions should be easier and clearer
- Later questions should be harder or more reasoning-heavy
- A session should ramp up, not stay flat
- Avoid repeated runs of the same topic or operation

## Anti-Patterns
Reject questions that:
- start with a lowercase letter
- contain weird or impossible real-world context
- have ambiguous wording
- have more than one possible correct answer
- repeat the same pattern too often
- feel too basic for the child's year
- feel too advanced for the child's year
- use a topic that does not fit the curriculum
- use a story that distracts from the skill being taught

## Required Output Shape
Each generated question should carry:

```ts
{
  questionText: string;
  answerOptions: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
    emoji?: string;
    imageUrl?: string;
  }>;
  explanation: string;
  hint?: string;
  subject: "maths" | "english" | "science";
  ageGroup: string;
  country: string;
  topics: string[];
  difficulty: number;
  interactionType?: string;
  interactionData?: Record<string, unknown>;
  generationMetadata?: Record<string, unknown>;
}
```

## Acceptance Checklist
Before a question is accepted, confirm:
- it makes sense
- it is age-appropriate
- it matches the subject and curriculum
- it has one correct answer
- the hint is helpful
- the explanation is clear
- the theme helps the question
- it is not a duplicate or near-duplicate
- it does not repeat too often in a session
- it can be audited by `teacher.md`

## What LLMs Should Do
LLMs generating questions should:
- generate meaningful context
- choose the best question mode
- keep the tone friendly and clear
- avoid weird or random phrasing
- prefer concept mastery over rote trivia

## What LLMs Must Not Do
LLMs must not:
- invent nonsensical stories
- use repeated answer-position patterns
- ignore age group
- ignore country or curriculum rules
- produce questions that a parent would question immediately
