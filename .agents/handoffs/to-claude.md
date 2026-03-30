# INTERACTIVE-QUESTIONS-V1 - Claude Test Handoff

Codex has finished the theme-aware interactive question lane on `codex/interactive-questions-v1`.

What changed:
- Question visuals now carry the child theme and favorite tags into the learning scene.
- Early-year counting scenes can render as TapCount / AnimatedStory world scenes.
- Shape questions can render as DotJoin interactive scenes.
- Soccer context now feels football-like when the child picks sports/favorite tags.
- `npx tsc --noEmit` passes.
- `scripts/test/suites/30-theme-question-context.ts` is green.

What Claude should verify next:
- Run the existing visual and interactive suites to make sure nothing regressed.
- Confirm the themed world still feels right for:
  - soccer / sports
  - space
  - jungle / animals
  - ocean
  - fantasy
  - unicorn
- Check that favorite topic tags steer the scene context when they should.
- Validate the question screen still feels connected to the child\'s selected world from dashboard to learn flow.

Please do not rework the progress-tracking lane. Focus only on themed interactive question coverage and regressions.
