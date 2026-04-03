# Tighten Dependency Boundaries with a Readable Allow-List Policy

## Why

The repository already enforces architecture boundaries with dependency-cruiser and ESLint import regexes, but the policy is hard to read and hard to evolve. The current setup passes checks, yet the rules are verbose and spread across tools, which increases maintenance cost and reduces confidence when changing boundaries.

We want one human-readable source of truth for import boundaries, with a default-deny model and explicit allow lists per layer/module.

## What Changes

Adopt dependency-cruiser as the single authority for architecture import boundaries and represent rules as a compact allow-list policy model.

### Policy Principles

- Cross-module imports are public-surface only:
  - value imports: `index.ts`
  - type-only imports: `index.ts` or `types.ts`
- Parent imports (`../`) under `src/` are forbidden.
- Default deny: anything not explicitly allowed is forbidden.
- No exceptions block in policy design (only allow lists).

### Layer Model

- `utils` may import no internal project layer.
- `models` may import only `models`.
- `plugins` may import only `utils`.
- `repositories` may import `plugins`, `models`, `utils`.
- `services` may import `plugins`, `models`, `utils`, `repositories`, `services`.
- `app` may import `app`, `utils`, `models`, `plugins`, `repositories`, `services`.

### UI Model (explicit modules)

- `ui/hooks` allow: none.
- `ui/components` allow: `ui/hooks`.
- `ui/layout` allow: `ui/hooks`, `ui/components`.
- `ui/data` allow: `models`.
- `ui/pages/:group` allow: `ui/hooks`, `ui/components`, `ui/layout`, `ui/data`, `models`, `ui/pages/:group`.

This `ui/pages/:group` module pattern keeps page-group isolation without special-case constraints by allowing only same-group page imports.

## Migration and Refactoring Scope

Applying this policy requires planned refactors where the current codebase violates the target shape:

- Replace direct page imports of `@/ui/data/*` with `@/ui/data/index` public surface exports.
- Replace direct page imports of `@/ui/hooks/auto-save-form` with `@/ui/hooks/index` public surface exports.
- Remove page reliance on `@/ui/constants` by moving runtime constants access to allowed modules (`models` or other allowed UI public surfaces).
- Ensure runtime values are not imported from `types.ts` files.

## Expected Outcome

- One clear architecture boundary system centered on dependency-cruiser.
- A compact, auditable allow-list policy that is easier to reason about than regex-heavy rule sets.
- Stronger and more consistent module boundary enforcement, including UI.
