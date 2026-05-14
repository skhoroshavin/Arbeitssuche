---
description: Create or edit project skills following TDD methodology — write pressure scenarios, watch agents fail without the skill, write the skill, verify compliance. Use when creating new skills, editing existing skills, or verifying skills work before deployment.
argument-hint: "<skill-name or description>"
---

# Writing Skills

Writing skills IS Test-Driven Development applied to process documentation. You write test cases (pressure scenarios), watch them fail (baseline behavior without the skill), write the skill, and verify agents comply.

**Core principle:** If you didn't watch an agent fail without the skill, you don't know if the skill teaches the right thing.

**REQUIRED BACKGROUND:** You MUST understand the `tdd` skill before using this prompt.

## The Skill to Create or Edit

$@

## What is a Skill?

A skill is a reference guide for proven techniques, patterns, or tools. Skills help future agent instances find and apply effective approaches.

**Skills are:** Reusable techniques, patterns, tools, reference guides
**Skills are NOT:** Narratives about how you solved a problem once

Skills in this project live in `.pi/skills/<name>/SKILL.md` with YAML frontmatter (`name`, `description`) and markdown body.

## TDD Mapping for Skills

| TDD Concept             | Skill Creation                                   |
| ----------------------- | ------------------------------------------------ |
| **Test case**           | Pressure scenario with subagent                  |
| **Production code**     | Skill document (SKILL.md)                        |
| **Test fails (RED)**    | Agent violates rule without skill (baseline)     |
| **Test passes (GREEN)** | Agent complies with skill present                |
| **Refactor**            | Close loopholes while maintaining compliance     |
| **Write test first**    | Run baseline scenario BEFORE writing skill       |
| **Watch it fail**       | Document exact rationalizations agent uses       |
| **Minimal code**        | Write skill addressing those specific violations |
| **Watch it pass**       | Verify agent now complies                        |
| **Refactor cycle**      | Find new rationalizations → plug → re-verify     |

## SKILL.md Structure

### Frontmatter (YAML)

Two required fields:

```yaml
---
name: skill-name-with-hyphens
description: Use when [specific triggering conditions and symptoms]
---
```

**Rules for `description`:**

- Start with "Use when..." to focus on triggering conditions
- Describe ONLY when to use (NOT what the skill does)
- Never summarize the skill's process or workflow — that creates a shortcut agents will take instead of reading the full skill
- Use third person
- Include specific symptoms, situations, and contexts
- Keep under 500 characters if possible

### Body Structure

```markdown
# Skill Name

## Overview

What is this? Core principle in 1-2 sentences.

## When to Use

Bullet list with SYMPTOMS and use cases
When NOT to use

## Core Pattern (for techniques/patterns)

Before/after code comparison

## Quick Reference

Table or bullets for scanning common operations

## Implementation

Inline code for simple patterns
Link to file for heavy reference or reusable tools

## Common Mistakes

What goes wrong + fixes

## Real-World Impact (optional)

Concrete results
```

## Claude Search Optimization (CSO)

**Critical for discovery:** Future agents need to FIND your skill.

### 1. Rich Description Field

The description should ONLY describe triggering conditions. Do NOT summarize the skill's process or workflow.

```yaml
# ❌ BAD: Summarizes workflow — agent may follow this instead of reading skill
description: Use when executing plans — dispatches subagent per task with code review between tasks

# ❌ BAD: Too much process detail
description: Use for TDD — write test first, watch it fail, write minimal code, refactor

# ✅ GOOD: Just triggering conditions, no workflow summary
description: Use when executing implementation plans with independent tasks in the current session

# ✅ GOOD: Triggering conditions only
description: Use when implementing any feature or bugfix, before writing implementation code
```

### 2. Keyword Coverage

Use words agents would search for:

- Error messages: "Hook timed out", "ENOTEMPTY", "race condition"
- Symptoms: "flaky", "hanging", "zombie", "pollution"
- Synonyms: "timeout/hang/freeze", "cleanup/teardown/afterEach"
- Tools: Actual commands, library names, file types

### 3. Descriptive Naming

Use active voice, verb-first:

- `creating-skills` not `skill-creation`
- `condition-based-waiting` not `async-test-helpers`

### 4. Cross-Referencing Other Skills

Use skill name only, with explicit requirement markers:

```markdown
**REQUIRED BACKGROUND:** You MUST understand the `tdd` skill before using this one.
```

Do NOT use `@` links — they force-load files, burning context.

## The Iron Law (Same as TDD)

```
NO SKILL WITHOUT A FAILING TEST FIRST
```

This applies to NEW skills AND EDITS to existing skills.

Write skill before testing? Delete it. Start over.
Edit skill without testing? Same violation.

**No exceptions:**

- Not for "simple additions"
- Not for "just adding a section"
- Not for "documentation updates"
- Don't keep untested changes as "reference"

## RED-GREEN-REFACTOR for Skills

### RED: Write Failing Test (Baseline)

Run a pressure scenario WITHOUT the skill. Document exact behavior:

- What choices did the agent make?
- What rationalizations did they use (verbatim)?
- Which pressures triggered violations?

This is "watch the test fail" — you must see what agents naturally do before writing the skill.

### GREEN: Write Minimal Skill

Write a skill that addresses those specific rationalizations. Don't add extra content for hypothetical cases.

Run the same scenarios WITH the skill. The agent should now comply.

### REFACTOR: Close Loopholes

Agent found a new rationalization? Add an explicit counter. Re-test until bulletproof.

## Bulletproofing Skills Against Rationalization

Skills that enforce discipline (like TDD) need to resist rationalization. Agents will find loopholes under pressure.

### Close Every Loophole Explicitly

Don't just state the rule — forbid specific workarounds:

**Bad:**

```markdown
Write code before test? Delete it.
```

**Good:**

```markdown
Write code before test? Delete it. Start over.

**No exceptions:**

- Don't keep it as "reference"
- Don't "adapt" it while writing tests
- Don't look at it
- Delete means delete
```

### Address "Spirit vs Letter" Arguments

Add a foundational principle early:

```markdown
**Violating the letter of the rules is violating the spirit of the rules.**
```

### Build Rationalization Table

Capture rationalizations from baseline testing. Every excuse agents make goes in the table:

```markdown
| Excuse               | Reality                                    |
| -------------------- | ------------------------------------------ |
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after"    | Tests passing immediately prove nothing.   |
```

### Create Red Flags List

Make it easy for agents to self-check:

```markdown
## Red Flags — STOP and Start Over

- Code before test
- "I already manually tested it"
- "This is different because..."

**All of these mean: Delete code. Start over.**
```

## Testing Different Skill Types

### Discipline-Enforcing Skills (rules/requirements)

Test with academic questions AND pressure scenarios. Combine multiple pressures: time + sunk cost + exhaustion.

### Technique Skills (how-to guides)

Test with application scenarios and variation scenarios. Do agents handle edge cases? Are there gaps in instructions?

### Pattern Skills (mental models)

Test with recognition scenarios and counter-examples. Do agents know when NOT to apply?

### Reference Skills (documentation/APIs)

Test with retrieval scenarios and gap testing. Can agents find and correctly apply the right information?

## Anti-Patterns

- **Narrative examples** — too specific, not reusable
- **Multi-language dilution** — mediocre quality across languages vs one great example
- **Fill-in-the-blank templates** — write complete, runnable examples
- **Workflow summaries in description** — creates a shortcut, agent skips reading the skill

## Skill Creation Checklist

**RED Phase — Write Failing Test:**

- [ ] Create pressure scenarios (3+ combined pressures for discipline skills)
- [ ] Run scenarios WITHOUT skill — document baseline behavior verbatim
- [ ] Identify patterns in rationalizations/failures

**GREEN Phase — Write Minimal Skill:**

- [ ] Name uses only letters, numbers, hyphens
- [ ] YAML frontmatter with required `name` and `description` fields
- [ ] Description starts with "Use when..." and includes specific triggers/symptoms
- [ ] Description written in third person, no workflow summary
- [ ] Keywords throughout for search (errors, symptoms, tools)
- [ ] Clear overview with core principle
- [ ] Address specific baseline failures identified in RED
- [ ] One excellent example (not multi-language)
- [ ] Run scenarios WITH skill — verify agents now comply

**REFACTOR Phase — Close Loopholes:**

- [ ] Identify NEW rationalizations from testing
- [ ] Add explicit counters (if discipline skill)
- [ ] Build rationalization table from all test iterations
- [ ] Create red flags list
- [ ] Re-test until bulletproof

**Quality Checks:**

- [ ] Quick reference table
- [ ] Common mistakes section
- [ ] No narrative storytelling
- [ ] Supporting files only for tools or heavy reference

**Deployment:**

- [ ] Save skill to `.pi/skills/<name>/SKILL.md`
- [ ] Run `npm run verify && npm test` to ensure nothing is broken

## Project-Specific Conventions

Skills in this project:

- Live in `.pi/skills/<name>/SKILL.md`
- Use kebab-case names
- Follow AGENTS.md naming and architecture rules
- Are listed in `.pi/` configuration for agent discovery
- Cross-reference project skills by name (e.g., `tdd`, `code-review`)

## The Bottom Line

Creating skills IS TDD for process documentation. Same Iron Law: no skill without failing test first. Same cycle: RED (baseline) → GREEN (write skill) → REFACTOR (close loopholes).

If you follow TDD for code, follow it for skills. It's the same discipline applied to documentation.
