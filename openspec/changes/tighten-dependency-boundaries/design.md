# Design: Tighten Dependency Boundaries

## Context

The project currently enforces architectural boundaries with a mix of dependency-cruiser allow rules and ESLint import regex restrictions. The existing setup is effective but difficult to audit and evolve because policy intent is not represented directly.

This change centralizes architecture boundary enforcement in dependency-cruiser with a concise allow-list model.

## Goals

- Keep policy human-readable and data-driven.
- Enforce default-deny boundaries with explicit allow lists only.
- Keep a universal public-surface convention across layers and UI.
- Encode UI page-group isolation using the same generic allow-list mechanism.

## Non-Goals

- Enforcing symbol-level export contracts.
- Adding special-case exceptions.
- Changing business behavior.

## Policy Model

The source of truth is a layer/module map with only `allow` edges.

### Fixed Global Semantics (encoded in converter)

- Cross-module value imports are allowed only through `index.ts`.
- Cross-module type-only imports are allowed through `index.ts` or `types.ts`.
- Parent imports (`../`) under `src/` are forbidden.
- Default deny for all internal imports not explicitly allowed.

These semantics are fixed implementation behavior, not per-layer configuration.

### Layer Allow Lists

- `utils` -> none
- `models` -> `models`
- `plugins` -> `utils`
- `repositories` -> `plugins`, `models`, `utils`
- `services` -> `plugins`, `models`, `utils`, `repositories`, `services`
- `app` -> `app`, `utils`, `models`, `plugins`, `repositories`, `services`

### UI Module Allow Lists

- `ui/hooks` -> none
- `ui/components` -> `ui/hooks`
- `ui/layout` -> `ui/hooks`, `ui/components`
- `ui/data` -> `models`
- `ui/pages/:group` -> `ui/hooks`, `ui/components`, `ui/layout`, `ui/data`, `models`, `ui/pages/:group`

`ui/pages/:group` uses a parameterized module key. A file in `ui/pages/applicant/...` resolves `:group=applicant`, so same-group imports are allowed while cross-group imports are denied by default.

## Conversion to dependency-cruiser Rules

The converter will generate forbidden rules from allow lists.

1. Resolve each file path to a module key (including parameterized keys).
2. For each dependency edge:
   - If source and target are in same module: allow.
   - Else verify target layer/module is in source `allow` list.
   - Enforce public-surface path rule (`index.ts` or `types.ts` for type-only).
3. Any unmatched edge is forbidden (default deny).

This preserves a single policy language (allow-only), with deterministic generation.

## Impacted Areas

- `.dependency-cruiser.cjs` will be refactored to generated-forbidden style from policy data.
- ESLint architecture regex restrictions can be reduced/removed after depcruise parity is confirmed.

## Known Migration Work

Current code contains imports that will violate the target policy and require refactoring:

- UI pages importing `@/ui/data/*` and `@/ui/hooks/auto-save-form` directly (must use public surfaces).
- UI pages importing `@/ui/constants` (not in target allow list).
- Runtime values imported from `types.ts` (must move to non-`types.ts` surfaces).

These are intentional follow-up refactors under this change.
