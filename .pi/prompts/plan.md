---
description: Write a detailed implementation plan from an approved design — bite-sized tasks with exact file paths, complete code, and verification steps. Assumes the engineer has zero context for the codebase.
argument-hint: "<design-doc-path or goal>"
---

# Writing Implementation Plans

Write a comprehensive implementation plan from the approved design. Assume the engineer has zero context for the codebase and questionable taste. Every task must contain the actual content they need to execute.

## Design Reference

$@

If a design doc path is given, read it completely. Otherwise, work from the current session context.

## Scope Check

If the design covers multiple independent subsystems, suggest breaking into separate plans — one per subsystem. Each plan should produce working, testable software on its own.

## Plan Document Structure

Save to `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`.

### Required Header

```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** Execute tasks using the `exec` prompt sequentially.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

---
```

### File Structure Section

Before defining tasks, map out which files will be created or modified and what each one is responsible for. This is where decomposition decisions get locked in.

- Design units with clear boundaries and well-defined interfaces
- Each file should have one clear responsibility
- Prefer smaller, focused files. When a file grows large, that's a signal it's doing too much.
- In existing codebases, follow established patterns. If the codebase uses large files, don't unilaterally restructure — but if a file you're modifying has grown unwieldy, including a split in the plan is reasonable.
- Files that change together should live together. Split by responsibility, not by technical layer.

This structure informs the task decomposition. Each task should produce self-contained changes that make sense independently.

### Task Structure

Each step is one action (2-5 minutes):

````markdown
### Task N: [Component Name]

**Files:**

- Create: `exact/path/to/file.ts`
- Modify: `exact/path/to/existing.ts:123-145`
- Test: `exact/path/to/test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
test("specific behavior description", () => {
  const result = functionUnderTest(input)
  expect(result).toBe(expected)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- path/to/test.ts -t "specific behavior"`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```typescript
export function functionUnderTest(input: InputType): OutputType {
  return expected
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- path/to/test.ts -t "specific behavior"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add path/to/test.ts path/to/file.ts
git commit -m "feat: add specific feature"
```
````

### Bite-Sized Task Granularity

Break work into the smallest verifiable steps:

- "Write the failing test" — step
- "Run it to make sure it fails" — step
- "Implement the minimal code to make the test pass" — step
- "Run the tests and make sure they pass" — step
- "Commit" — step

## No Placeholders — Zero Tolerance

Every step must contain the actual content an engineer needs. These are **plan failures** — never write them:

- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases"
- "Write tests for the above" (without actual test code)
- "Similar to Task N" (repeat the code — the engineer may be reading tasks out of order)
- Steps that describe what to do without showing how (code blocks required for code steps)
- References to types, functions, or methods not defined in any task

## Project-Specific Constraints

From AGENTS.md, enforce these in every plan:

- **Imports**: Cross-module through `index.ts` public surfaces. No parent (`../`) imports in `src/`. Use `@/` for cross-module.
- **File limits**: max 500 lines; utils max 80 lines
- **Complexity**: cyclomatic complexity max 7
- **TypeScript**: strict mode, no type assertions (`as`), no non-null assertions (`!`), explicit types on public APIs, `import type` for type-only imports
- **Naming**: kebab-case filenames; test suffixes: `.test.ts`, `.test.tsx`, `.test-suite.ts`, `.integration-test.ts`
- **Error handling**: `throw new Error(...)` for invariants; catch/log for external failures; preserve `AbortSignal`
- **Testing**: prefer public surface testing (`index.ts`); behavior-focused test names
- **React**: destructure props in function signature; no generic `props` object

## Self-Review Before Finalizing

After writing the complete plan, review against the design:

1. **Spec coverage**: Skim each requirement in the design. Can you point to a task that implements it? List any gaps.
2. **Placeholder scan**: Search your plan for any of the forbidden patterns above. Fix them.
3. **Type consistency**: Do types, method signatures, and property names in later tasks match what you defined in earlier tasks?

If you find issues, fix them inline. If you find a design requirement with no task, add the task.

## Execution Handoff

After saving the plan, tell the user:

> "Plan complete and saved to `docs/superpowers/plans/<filename>.md`. Use the `exec` prompt to execute tasks sequentially."

## Remember

- Exact file paths always
- Complete code in every step — if a step changes code, show the code
- Exact commands with expected output
- DRY, YAGNI, TDD, frequent commits
