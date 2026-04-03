# Tasks

- [x] Refactor `.dependency-cruiser.cjs` to a data-first allow-list model (`layers/modules` + converter) with default-deny forbidden rules.
- [x] Implement fixed global conversion semantics for public surfaces (`index.ts` for values, `index.ts|types.ts` for type-only), parent-import blocking, and same-module allowance.
- [x] Encode UI modules in policy (`ui/hooks`, `ui/components`, `ui/layout`, `ui/data`, `ui/pages/:group`) and verify `:group` parameterized isolation behavior.
- [x] Remove or reduce ESLint architecture import regex rules so dependency-cruiser is the single architecture authority while preserving non-architecture linting.
- [x] Refactor UI imports to comply with public-surface policy (`ui/data/index.ts`, `ui/hooks/index.ts`, and replacement of direct deep imports).
- [x] Remove `@/ui/constants` dependency from pages by routing runtime constants usage through allowed modules/surfaces.
- [x] Eliminate runtime value imports from `types.ts` by moving such values to non-`types.ts` public surfaces.
- [x] Run `depcruise src`, `npm run verify`, and `npm test`; fix any violations introduced by boundary tightening.
