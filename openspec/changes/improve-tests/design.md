## Context

The project uses a locally linked `eslint-plugin-unslop` for architecture enforcement, and the newer plugin version introduces stricter test-control checks. Existing tests include imports that were previously tolerated but now violate tighter entrypoint and boundary rules, causing lint and verification failures.

## Goals / Non-Goals

**Goals:**
- Align repository lint behavior with the updated local unslop test-control rules.
- Restore green `npm run fix`, `npm run verify`, and `npm test` by remediating violating tests.
- Preserve behavior-focused test coverage while moving tests to public module surfaces.

**Non-Goals:**
- No change to production runtime behavior or business logic.
- No redesign of architecture policy outside test-control adjustments already enforced by the plugin.
- No broad refactor of unrelated tests that already satisfy boundary rules.

## Decisions

- Adopt the updated local unslop plugin behavior as the source of truth for test import boundaries. This avoids divergence between local architecture intent and enforced policy.
- Remediate each failing test by preferring public entrypoint imports (`index.ts`/configured entrypoints) and black-box assertions over internal implementation imports. This maintains long-term test stability under boundary enforcement.
- If a violating test duplicates behavior already covered by a compliant black-box test, remove the redundant violating test instead of introducing brittle wrappers.
- Apply changes incrementally by fixing lint violations first, then validating with the full verify/test pipeline to ensure no accidental coverage regressions.

Alternatives considered:
- Temporarily relax lint rules for tests: rejected because it weakens architecture guarantees and conflicts with the tighter plugin direction.
- Introduce test-only entrypoints across modules: rejected because it increases public-surface complexity and risks accidental production coupling.

## Risks / Trade-offs

- [Risk] Removing or reshaping tests can reduce confidence if equivalent coverage is incorrectly assumed. -> Mitigation: keep or add behavior-level scenarios before deletion and run full test suite.
- [Risk] Some tests may need larger rewrites when they depend heavily on internals. -> Mitigation: prioritize high-value behavior assertions and use module public APIs, accepting small short-term effort for lower long-term maintenance.
- [Trade-off] Black-box tests may be less granular than internal unit tests. -> Mitigation: maintain deterministic assertions at public boundaries and keep focused fixtures.

## Migration Plan

1. Update dependency resolution/lockfile state so the repository uses the newest local `../eslint-plugin-unslop`.
2. Run lint/verify to enumerate failing test files under the tighter test-control rules.
3. Refactor or remove violating tests using public entrypoints and behavior-focused coverage.
4. Run `npm run fix`, `npm run verify`, and `npm test` to confirm full compliance and stability.

Rollback strategy:
- Revert this change set to restore the prior test suite and lint state if regressions are discovered.

## Open Questions

- None currently; failures will be resolved against existing architecture and test conventions.
