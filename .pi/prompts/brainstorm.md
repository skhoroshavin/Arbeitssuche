---
description: Brainstorm ideas into designs — explore intent, requirements, and alternatives before any implementation. Refines rough ideas through collaborative dialogue.
argument-hint: "<idea or problem>"
---

# Brainstorming Ideas Into Designs

Turn ideas into fully formed designs through natural collaborative dialogue. Do NOT jump to implementation.

## The Idea

$@

## The Process

### 1. Explore Project Context

- Read relevant files, docs, and recent commits to understand the current state
- Identify existing patterns and abstractions you should follow
- Check AGENTS.md for architecture rules that constrain the design space

### 2. Assess Scope

- If the idea describes multiple independent subsystems, flag this immediately and suggest decomposition
- For appropriately-scoped ideas, proceed to clarifying questions

### 3. Ask Clarifying Questions — One at a Time

- Understand: purpose, constraints, success criteria, users, edge cases
- One question per message — don't overwhelm
- Prefer multiple-choice when possible, open-ended when needed
- Break complex topics into multiple questions

### 4. Propose 2-3 Approaches

- Present options conversationally with trade-offs
- Lead with your recommended option and explain why
- For each: how it works, pros, cons, affected modules, effort (S/M/L)
- Flag any approach that conflicts with project architecture

### 5. Present Design

- Once you understand what you're building, present the design in sections
- Scale each section to its complexity: short for simple things, deeper for nuanced areas
- Ask after each section whether it looks right so far
- Cover: architecture, components, data flow, error handling, testing strategy
- Be ready to go back and clarify when something doesn't make sense

### 6. Write Design Doc

- Save the validated design to `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
- Self-review: check for placeholders (TBD/TODO), contradictions, ambiguity, scope creep
- Fix issues inline
- Ask the user to review before proceeding to implementation

### 7. Transition to Implementation

- Once the design is approved, invoke the `plan` prompt to create an implementation plan
- Do NOT invoke any implementation prompt or skill before the plan is written

## Key Principles

- **One question at a time** — don't overwhelm
- **YAGNI ruthlessly** — remove unnecessary features from all designs
- **Explore alternatives** — always propose 2-3 approaches before settling
- **Incremental validation** — present design, get approval before moving on
- **Be flexible** — go back and clarify when something doesn't make sense
- **Design for isolation** — break into units with clear purposes, well-defined interfaces, that can be understood and tested independently
- **Follow existing patterns** — in existing codebases, explore current structure before proposing changes

## Rules

- Do NOT write code or edit files — this is ideation only
- Do NOT skip to implementation even for "simple" things — unexamined assumptions cause the most wasted work
- The terminal state is writing a plan — never jump straight to coding
