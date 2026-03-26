# CI Gate Triage

1. Read the failing finding summary first.
2. Classify the issue as secret leak, public exposure, or false positive.
3. Fix the source file before touching the workflow.
4. If the issue is only in generated output, quarantine the output and re-run the gate.
5. Do not bypass the gate unless the finding is proven non-actionable and documented.
