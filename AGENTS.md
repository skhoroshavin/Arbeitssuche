# AGENTS.md

Guidelines for autonomous coding agents in this repository.

## Project Snapshot

- **Stack:** TypeScript, Electron, React, Vite, Vitest, Playwright
- **Package manager:** npm
- **Module mode:** ESM (`"type": "module"`)
- **Path alias:** `@/*` → `src/*`
- **Architecture enforcement:** `eslint-plugin-unslop` (configured in `eslint.config.ts`)

## Commands

| Command | Purpose |
|---|---|
| `npm run fix` | Auto-fix lint, formatting, unused deps. **Always run first.** |
| `npm test -- <file>` | Single vitest unit/component test |
| `npm test -- -t "<pattern>"` | Filter vitest by test name |
| `npm run test:crawler:<site>` | Single-site crawler (arbeitsagentur, xing, zalando, dm) |
| `npx vitest run --config vitest.integration.config.ts <file>` | Single integration test |
| `npx playwright test <spec> --config=e2e/playwright.electron.config.ts` | Single E2E spec |
| `npx playwright test <spec> --config=e2e/playwright.visual.config.ts` | Single visual spec |

## Architecture Rules

### Layer Import Rules

| Layer | May Import |
|---|---|
| `utils` | (shared — no declared imports) |
| `models/*` | `models/*` |
| `plugins/*` | `plugins/*`, `utils` |
| `repositories/*` | `repositories/*`, `models/*`, `plugins/*`, `utils` |
| `services/*` | `services/*`, `repositories/*`, `plugins/*`, `models/*`, `utils` |
| `app`, `app/*` | `app/*`, `utils`, `models/*`, `plugins/*`, `repositories/*`, `services/*` |
| `ui/components` | `ui/hooks` |
| `ui/layout` | `ui/hooks`, `ui/components`, `models/*` |
| `ui/data` | `models/*` |
| `ui/views/*` | `ui/views/*`, `ui/components`, `models/*` |
| `ui/pages/*` | `ui/hooks`, `ui/components`, `ui/layout`, `ui/data`, `ui/views/*`, `models/*`, `utils` |

### Key Enforced Rules

- **No parent imports** (`../`) under `src/`. Use `@/` for cross-module, `./` for same-module.
- **Public surfaces:** Cross-module imports must go through `index.ts`. Prefer defining interfaces directly in `index.ts`; extract to a separate file only when the type surface is large enough to hurt readability.
- **File naming:** `*.ts`, `*.tsx` → `kebab-case`. Test suffixes: `.test.ts`, `.test.tsx`, `.test-suite.ts`, `.integration.test.ts`.
- **Complexity:** max cyclomatic complexity `7`. Max file length: `500` lines (`80` for `src/utils/*.ts`).
- **No type assertions** (`as` / angle-brackets, but `as const` is still allowed) and **no non-null assertions** (`!`).
- **Destructure component props** in function signatures.
- **Shared modules** (`utils`, `ui/components`) must be consumed by **at least 2 packages**. If a symbol only has one consumer, move it into that consumer's package — don't leave it in shared.
- **Tests must import only public surfaces** (`index.ts`). No white-box testing against internal modules.

### Structural Patterns

- **Models as parseable classes.** Domain models that need validation should be exported as classes with a `static parse(data: unknown): Model` factory. The Zod schema stays private to the model file.
- **Repository implementations live in subfolders.** The public surface (`index.ts`) exports only the interface and factory function. Implementation code goes in `impl/` when backend-agnostic, or in backend-specific folders (`sqlite/`, `stub/`) when it is not.

## Error Handling

- Use `formatError` (from `utils`) to normalize unknown errors before logging or surfacing.
- Preserve cancellation via `AbortSignal` in long-running flows.

## Before Completing

1. `npm run fix` — auto-fixes most lint issues; whatever it reports as unfixable is what needs manual attention. Don't use `npm run verify` - it is only for CI, and is fully equivalent to `npm run fix` except for auto-fixing.
2. `npm test:all` — full test suite.
