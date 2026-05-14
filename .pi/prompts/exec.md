---
description: Execute an implementation plan linearly — load plan, review critically, execute each task, verify, stop when blocked. For use after the plan prompt produces a plan.
argument-hint: "[plan-file]"
---

# Executing Plans

Load a written implementation plan, review it critically, execute all tasks sequentially, and report when complete.

## Input

$@

If no plan file is given, read the most recent plan from `docs/superpowers/plans/` or ask which plan to execute.

## The Process

### Step 1: Load and Review Plan

1. Read the plan file completely
2. Review critically — identify any questions, gaps, or concerns
3. If concerns: raise them with the user before starting
4. If no concerns: announce "Executing plan: `<plan-name>`" and proceed

### Step 2: Execute Tasks

For each task in the plan:

1. Mark as in progress
2. Follow each step **exactly** — the plan has bite-sized steps, don't skip or combine them
3. Run verifications as specified:
   - `npm run fix` after code changes to lint/format
   - Run the specified test commands and verify expected output
   - If a test fails, fix it before moving to the next step
4. Mark the step as done: `- [x]`
5. After all steps in the task, commit if the plan says to
6. Move to the next task

### Step 3: After All Tasks

Once all tasks are complete and verified:

```bash
npm run verify    # Full build check
npm test          # Full test suite
```

Report the final status.

## Progress Tracking

After each task, output:

```
✅ Task N/M complete: <task description>
   Tests: <N passed, N failed, N skipped>
```

## When to Stop and Ask for Help

**STOP executing immediately when:**

- You hit a blocker (missing dependency, test fails repeatedly, instruction unclear)
- The plan has critical gaps that prevent starting
- You don't understand an instruction
- Verification fails repeatedly
- A test reveals a design problem that requires plan changes

**Ask for clarification rather than guessing. Don't force through blockers.**

## When to Revisit the Plan

Return to review (Step 1) when:

- The user updates the plan based on your feedback
- The fundamental approach needs rethinking

## Constraints

- Follow plan steps exactly — don't improvise
- Don't skip verifications
- Don't refactor beyond what the plan specifies
- Don't "improve" unrelated code you encounter
- If you see an improvement opportunity, note it at the end but do NOT act on it
- Never start implementation on `main`/`master` branch without explicit user consent

## Remember

- Review the plan critically first
- Follow plan steps exactly in order
- Don't skip verifications
- Stop when blocked, don't guess
- Commit frequently as the plan prescribes
