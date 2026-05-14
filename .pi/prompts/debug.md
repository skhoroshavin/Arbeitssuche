---
description: Debug systematically — find root cause before attempting fixes. Four-phase process: investigate root cause, analyze patterns, form and test hypotheses, implement the fix. Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes.
argument-hint: "<bug description or error>"
---

# Systematic Debugging

Random fixes waste time and create new bugs. Quick patches mask underlying issues.

**Core principle:** ALWAYS find root cause before attempting fixes. Symptom fixes are failure.

## The Bug

$@

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you haven't completed Phase 1, you cannot propose fixes.

## When This Process Applies

Use for ANY technical issue:

- Test failures
- Bugs in production
- Unexpected behavior
- Performance problems
- Build failures
- Integration issues

**Use this ESPECIALLY when:**

- Under time pressure (emergencies make guessing tempting)
- "Just one quick fix" seems obvious
- You've already tried multiple fixes
- Previous fix didn't work
- You don't fully understand the issue

## The Four Phases

Complete each phase before proceeding to the next.

### Phase 1: Root Cause Investigation

**BEFORE attempting ANY fix:**

1. **Read Error Messages Carefully**
   - Don't skip past errors or warnings — they often contain the exact solution
   - Read stack traces completely
   - Note line numbers, file paths, error codes

2. **Reproduce Consistently**
   - Can you trigger it reliably? What are the exact steps?
   - Does it happen every time?
   - If not reproducible → gather more data, don't guess

3. **Check Recent Changes**
   - What changed that could cause this?
   - Git diff, recent commits
   - New dependencies, config changes
   - Environmental differences

4. **Gather Evidence in Multi-Component Systems**
   - For each component boundary: log what data enters and exits
   - Verify environment/config propagation
   - Check state at each layer
   - Run once to gather evidence showing WHERE it breaks, then analyze

5. **Trace Data Flow**
   - Where does the bad value originate?
   - What called this with the bad value?
   - Keep tracing up until you find the source
   - Fix at source, not at symptom

### Phase 2: Pattern Analysis

**Find the pattern before fixing:**

1. **Find Working Examples** — locate similar working code in the same codebase
2. **Compare Against References** — if implementing a pattern, read the reference completely
3. **Identify Differences** — list every difference between working and broken, however small
4. **Understand Dependencies** — what other components, settings, config, environment does this need?

### Phase 3: Hypothesis and Testing

**Scientific method:**

1. **Form Single Hypothesis** — state clearly: "I think X is the root cause because Y"
2. **Test Minimally** — the SMALLEST possible change to test the hypothesis, one variable at a time
3. **Verify Before Continuing** — did it work? Yes → Phase 4. No → form NEW hypothesis
4. **When You Don't Know** — say "I don't understand X." Don't pretend. Ask for help. Research more.

### Phase 4: Implementation

**Fix the root cause, not the symptom:**

1. **Create Failing Test Case** — simplest possible reproduction; MUST have before fixing
2. **Implement Single Fix** — address the root cause identified; ONE change at a time; no "while I'm here" improvements
3. **Verify Fix** — test passes now? No other tests broken? Issue actually resolved?
4. **If Fix Doesn't Work** — STOP. Count how many fixes attempted:
   - If < 3: Return to Phase 1, re-analyze with new information
   - **If ≥ 3: STOP and question the architecture** — each fix revealing new problems signals an architectural issue, not a simple bug

### If 3+ Fixes Failed: Question Architecture

**Pattern indicating architectural problem:**

- Each fix reveals new shared state/coupling/problem in different place
- Fixes require "massive refactoring" to implement
- Each fix creates new symptoms elsewhere

**STOP and question fundamentals:**

- Is this pattern fundamentally sound?
- Are we "sticking with it through sheer inertia"?
- Should we refactor architecture vs. continue fixing symptoms?

Discuss with the user before attempting more fixes. This is NOT a failed hypothesis — this is a wrong architecture.

## Red Flags — STOP and Follow Process

If you catch yourself thinking:

- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "Add multiple changes, run tests"
- "Skip the test, I'll manually verify"
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"
- "One more fix attempt" (when already tried 2+)
- "Each fix reveals new problem in different place"

**ALL of these mean: STOP. Return to Phase 1.**

## Common Rationalizations

| Excuse                                       | Reality                                                              |
| -------------------------------------------- | -------------------------------------------------------------------- |
| "Issue is simple, don't need process"        | Simple issues have root causes too. Process is fast for simple bugs. |
| "Emergency, no time for process"             | Systematic debugging is FASTER than guess-and-check thrashing.       |
| "Just try this first, then investigate"      | First fix sets the pattern. Do it right from the start.              |
| "I'll write test after confirming fix works" | Untested fixes don't stick. Test first proves it.                    |
| "I see the problem, let me fix it"           | Seeing symptoms ≠ understanding root cause.                          |

## Quick Reference

| Phase                 | Key Activities                                                          | Success Criteria            |
| --------------------- | ----------------------------------------------------------------------- | --------------------------- |
| **1. Root Cause**     | Read errors, reproduce, check changes, gather evidence, trace data flow | Understand WHAT and WHY     |
| **2. Pattern**        | Find working examples, compare, list differences                        | Identify what's different   |
| **3. Hypothesis**     | Form theory, test minimally, one variable at a time                     | Confirmed or new hypothesis |
| **4. Implementation** | Create failing test, implement single fix, verify                       | Bug resolved, tests pass    |

## When Process Reveals "No Root Cause"

If systematic investigation reveals the issue is truly environmental, timing-dependent, or external:

1. You've completed the process — document what you investigated
2. Implement appropriate handling (retry, timeout, error message)
3. Add monitoring/logging for future investigation

**But:** 95% of "no root cause" cases are incomplete investigation.
