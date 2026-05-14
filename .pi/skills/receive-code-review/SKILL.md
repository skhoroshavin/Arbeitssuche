---
name: receive-code-review
description: Process code review feedback with technical rigor — verify before implementing, ask before assuming, push back with reasoning when wrong. Use when receiving review feedback, before implementing suggestions, especially if feedback seems unclear or technically questionable.
---

# Receiving Code Review

Code review requires technical evaluation, not emotional performance.

**Core principle:** Verify before implementing. Ask before assuming. Technical correctness over social comfort.

## The Response Pattern

```
WHEN receiving code review feedback:

1. READ: Complete feedback without reacting
2. UNDERSTAND: Restate requirement in your own words (or ask)
3. VERIFY: Check against codebase reality
4. EVALUATE: Technically sound for THIS codebase?
5. RESPOND: Technical acknowledgment or reasoned pushback
6. IMPLEMENT: One item at a time, test each
```

## Forbidden Responses

**NEVER:**

- "You're absolutely right!" (performative)
- "Great point!" / "Excellent feedback!" (performative)
- "Let me implement that now" (before verification)

**INSTEAD:**

- Restate the technical requirement
- Ask clarifying questions
- Push back with technical reasoning if wrong
- Just start working (actions > words)

## Handling Unclear Feedback

```
IF any item is unclear:
  STOP - do not implement anything yet
  ASK for clarification on unclear items

WHY: Items may be related. Partial understanding = wrong implementation.
```

**Example:**

```
Reviewer: "Fix 1-6"
You understand 1,2,3,6. Unclear on 4,5.

❌ WRONG: Implement 1,2,3,6 now, ask about 4,5 later
✅ RIGHT: "I understand items 1,2,3,6. Need clarification on 4 and 5 before proceeding."
```

## Triage

Read the review and classify each finding:

| Severity     | Action                                                                          |
| ------------ | ------------------------------------------------------------------------------- |
| **Critical** | Fix immediately, no exceptions                                                  |
| **Warning**  | Fix unless you have a clear, documented reason not to                           |
| **Note**     | Evaluate — fix if it clearly improves things, otherwise acknowledge and move on |

## Implementation Order

For multi-item feedback:

1. Clarify anything unclear FIRST
2. Then implement in this order:
   - Blocking issues (breaks, security)
   - Simple fixes (typos, imports)
   - Complex fixes (refactoring, logic)
3. Test each fix individually:
   ```bash
   npm test -- <affected-test-file>
   ```
4. Verify no regressions:
   ```bash
   npm run verify
   npm test
   ```

## When To Push Back

Push back when:

- Suggestion breaks existing functionality
- Reviewer lacks full context
- Violates YAGNI (unused feature)
- Technically incorrect for this stack
- Legacy/compatibility reasons exist
- Conflicts with the user's architectural decisions

**How to push back:**

- Use technical reasoning, not defensiveness
- Ask specific questions
- Reference working tests/code
- Involve the user if architectural

### YAGNI Check for "Professional" Features

```
IF reviewer suggests "implementing properly":
  Search codebase for actual usage

  IF unused: "This isn't called. Remove it (YAGNI)?"
  IF used: Then implement properly
```

## Acknowledging Correct Feedback

When feedback IS correct:

```
✅ "Fixed. [Brief description of what changed]"
✅ "Good catch - [specific issue]. Fixed in [location]."
✅ [Just fix it and show in the code]

❌ "You're absolutely right!"
❌ "Great point!"
❌ "Thanks for catching that!"
❌ "Thanks for [anything]"
❌ ANY gratitude expression
```

**Why no thanks:** Actions speak. Just fix it. The code itself shows you heard the feedback.

## Gracefully Correcting Your Pushback

If you pushed back and were wrong:

```
✅ "You were right - I checked [X] and it does [Y]. Implementing now."
✅ "Verified this and you're correct. My initial understanding was wrong because [reason]. Fixing."

❌ Long apology
❌ Defending why you pushed back
❌ Over-explaining
```

State the correction factually and move on.

## Summary Format

After applying review feedback:

```markdown
## Review Applied: <scope>

### Fixed

- ✅ **[file:line]** <finding summary> — <what was changed>

### Deferred / Won't Fix

- ⏭️ **[file:line]** <finding summary> — <reason>

### Needs Clarification

- ❓ **[file:line]** <finding summary> — <question>

### Verification

- `npm run verify`: ✅ passed / ❌ failed
- `npm test`: ✅ passed / ❌ failed (<N passed, N failed>)
```

## Rules

- Never dismiss a critical finding without explicit user approval
- Don't "fix" things that weren't in the review — stay focused
- If a fix introduces a new problem, revert it and report the conflict
- Keep each fix minimal — don't refactor adjacent code
- After all fixes, the full test suite must still pass
- External feedback = suggestions to evaluate, not orders to follow
- Verify. Question. Then implement.
- No performative agreement. Technical rigor always.
