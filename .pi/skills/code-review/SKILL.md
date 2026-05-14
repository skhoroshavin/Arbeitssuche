---
name: code-review
description: Review code for bugs, security issues, performance problems, architecture violations, and test coverage gaps. Use when completing tasks, implementing major features, before merging, or when the user asks for a review, PR review, or code audit.
---

# Code Review

Review code to catch issues before they cascade. Review early, review often.

**Core principle:** Review against the plan/requirements and project standards — not personal preference.

## When to Review

**Mandatory:**

- After completing each implementation task
- After completing a major feature
- Before merging to main

**Optional but valuable:**

- When stuck (fresh perspective helps)
- Before refactoring (baseline check)
- After fixing a complex bug

## Review Process

### Step 1: Understand What You're Reviewing

- What was the goal? (Read the plan/task description)
- What files changed? (Check git diff)
- What's the scope? (Single feature, refactor, bug fix?)

### Step 2: Review Against the Plan

- Does the implementation match what the plan specified?
- Are there unintended changes outside the plan's scope?
- Are all plan steps actually completed?

### Step 3: Systematic Code Review

Check every file against these dimensions. Report findings grouped by severity.

#### Architecture Compliance

- **Import rules**: Cross-module imports through `index.ts` public surfaces? No parent (`../`) imports in `src/`?
- **Layer boundaries**: `plugins`, `repositories`, `services`, `app` importing only allowed upstream surfaces?
- **Shared code**: `utils/` and `ui/components/` consumed by ≥ 2 entities? Flag single-consumer shared code.
- **UI page isolation**: Page groups (`applicant`, `job-search`, `settings`) staying isolated?

#### TypeScript Strictness

- No non-null assertions (`!`)
- No type assertions (`as` / angle-bracket casts)
- Explicit types on exported/public APIs
- `import type` for type-only imports
- No `any` — use `unknown` and narrow

#### Error Handling

- `throw new Error(...)` for invariants and impossible states
- External failures (network/LLM/crawl): catch, log context, continue safely
- Unknown errors normalized before logging (use `formatError`)
- `AbortSignal` preserved in long-running flows

#### Complexity & Structure

- Cyclomatic complexity ≤ 7
- File length ≤ 500 lines (80 for utils)
- Helpers defined after their first use (read-friendly-order)
- No deep nested conditionals — prefer small helpers

#### Naming & Conventions

- Filenames: kebab-case (`*.ts`, `*.tsx`)
- Test suffixes: `.test.ts`, `.test.tsx`, `.test-suite.ts`, `.integration-test.ts`
- Domain naming consistent (`Applicant`, `Vacancy`, `JobSearch`, etc.)

#### React/UI (if applicable)

- Props destructured in function signature
- No generic `props` object
- Page-specific logic in `src/ui/pages/*`

#### Testing

- New behavior covered by tests?
- Tests use public surfaces?
- Test names behavior-focused?
- Edge cases covered (empty, null, error, boundary)?
- Were tests written first (TDD)?

#### Security & Safety

- No secrets in code (API keys, tokens)
- No `eval()` or dynamic code execution
- Path traversal risks in file operations?
- Injection risks in shell commands?
- User input validated/sanitized?

#### Performance

- Unnecessary allocations in hot paths?
- Missing memoization where expensive?
- N+1 queries or loops?
- Large synchronous operations that should be async?

## Output Format

```markdown
## Code Review: <scope>

### Strengths

- [What's good about this code — be specific]

### Critical (must fix before proceeding)

- **[file:line]** Issue — Why it matters — Suggested fix

### Warnings (should fix before merge)

- **[file:line]** Issue — Why it matters — Suggested fix

### Notes (consider for later)

- **[file:line]** Observation — Optional improvement

### Summary

- Files reviewed: N
- Critical: N | Warnings: N | Notes: N
- Overall: ✅ Approve / ⚠️ Changes requested / ❌ Blocked
```

## Rules

- Back every finding with a file path and line reference
- Suggest concrete fixes, not just "fix this"
- Run `npm run verify` before review — if it fails, report build failures as critical
- Don't review for style issues Prettier handles — focus on substance
- If the same pattern issue appears across files, group under one finding
- **Acknowledge what's good** — reviews shouldn't only list problems
- Never skip review because "it's simple"
- Never ignore critical issues
- If you're unsure whether something is an issue, flag it as a Note

## Red Flags

**Never:**

- Skip review because "it's simple"
- Ignore critical issues
- Proceed with unfixed warnings without documenting why
- Argue with valid technical feedback

**If you think a reviewer is wrong:**

- Push back with technical reasoning
- Show code/tests that prove it works
- Request clarification

## Integration with Workflows

**After executing a plan task:** Review before moving to the next task.
**Before merge:** Full review of all changes.
**When stuck:** Fresh perspective on what might be wrong.
