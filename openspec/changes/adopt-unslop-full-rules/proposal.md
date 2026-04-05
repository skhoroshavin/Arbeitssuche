## Why

The repository currently splits architecture enforcement across ESLint, dependency-cruiser, and repo-specific conventions, which makes the rules harder to maintain and easier to drift. Upgrading to `eslint-plugin-unslop@0.4.0` with the full rule set is an opportunity to replace dependency-cruiser, simplify the ESLint configuration, and clean up code so lint fully reflects the intended module architecture.

## What Changes

- Upgrade to `eslint-plugin-unslop@0.4.0` and adopt `unslop.configs.full` as the baseline lint preset.
- Replace dependency-cruiser boundary enforcement with `unslop/import-control`, `unslop/export-control`, and `unslop/no-false-sharing`.
- Define one explicit unslop architecture model for repository layers and UI modules, including isolated `ui/pages/*` page groups.
- Clean up source structure so shared helpers live in named domain modules or `utils`, instead of loose parent-folder files.
- Keep `export-control` enabled, but defer export pattern contracts until after the architecture migration is stable.
- Update specs and repository guidance to describe unslop as the single architecture authority.

### Proposed Unslop Architecture

The initial target architecture for exploration is:

```ts
const architecture = {
  "utils": {
    shared: true,
  },

  "models": {
    imports: [],
  },

  "models/*": {
    imports: ["models/*"],
  },

  "plugins/*": {
    imports: ["plugins/*", "utils"],
  },

  "repositories/*": {
    imports: ["repositories/*", "models", "models/*", "utils"],
  },

  "services/*": {
    imports: ["services/*", "plugins/*", "models", "models/*", "repositories/*", "utils"],
  },

  "app": {
    imports: ["utils", "models", "models/*", "plugins/*", "repositories/*", "services/*"],
  },

  "app/*": {
    imports: ["app/*", "utils", "models", "models/*", "plugins/*", "repositories/*", "services/*"],
  },

  "ui": {
    imports: [],
  },

  "ui/hooks": {
    imports: [],
  },

  "ui/components": {
    shared: true,
    imports: ["ui/hooks"],
  },

  "ui/layout": {
    imports: ["ui/hooks", "ui/components", "models"],
  },

  "ui/data": {
    imports: ["models"],
  },

  "ui/pages": {
    imports: [],
  },

  "ui/pages/*": {
    imports: ["ui/hooks", "ui/components", "ui/layout", "ui/data", "models"],
  },
}
```

Notes for further editing during exploration:

- `ui` and `ui/pages` rely on unslop's implicit shallow child-entrypoint allowance rather than explicit child imports.
- `ui/pages/*` page groups remain isolated because no sibling page-group imports are declared.
- `repositories/*` no longer depend on `plugins/*`.
- `ui/data` stays models-only.
- `export-control` remains enabled through `configs.full`, but no `exports` contracts are proposed in this phase.

### Proposed Source Reshaping

The migration should also clean up module structure so the architecture matches actual ownership. Initial proposed moves:

- Move `src/models/events.ts` into a named model submodule, preferably `src/models/progress/index.ts`.
- Move `src/models/utilities.ts` out of model root; preferred targets are `src/models/applicant/` if the helpers stay applicant-specific, or `src/utils/` if they are truly generic string-list helpers.
- Keep `src/models/index.ts` as a root public aggregator only, not as a place for shared implementation code.
- Move `src/plugins/stub-utilities.ts` to `src/utils/` because it is generic helper logic rather than plugin-domain behavior.
- Move `src/plugins/page-utilities/index.ts` under the job-site plugin area, preferably `src/plugins/job-site/utils/index.ts`, because it is crawler/job-site-specific support code.
- Avoid shared parent-folder helpers under `src/repositories/`; generic helpers should move to `src/utils/`.
- Move `src/services/asserts.ts` out of service root into an explicit named support module under `src/services/*` unless it becomes generic enough for `src/utils/`.
- Keep `src/ui/app.tsx` at `src/ui/` and avoid introducing an artificial `ui/root` module.
- Continue using `index.ts` and `types.ts` as the public interface for cross-module imports.

## Capabilities

### New Capabilities

- `linting-policy`: Defines the required unslop baseline, repo-specific overrides, and cleanup expectations for lint-enforced architecture and readability rules.

### Modified Capabilities

- `dependency-boundaries`: Boundary enforcement changes from dependency-cruiser-based policy to a single ESLint unslop architecture model.

## Impact

- Affected tooling: `package.json`, `package-lock.json`, `eslint.config.ts`
- Removed tooling: `.dependency-cruiser.cjs` and dependency-cruiser-based verification/docs
- Affected docs/specs: `AGENTS.md`, `openspec/specs/dependency-boundaries/spec.md`, new `openspec/specs/linting-policy/spec.md`
- Expected cleanup areas: `src/models/*`, `src/plugins/*`, `src/services/*`, `src/ui/**/*`, `src/utils/**/*`, and public entrypoints under `src/**/index.ts` and `src/**/types.ts`
- Expected structural cleanup: model root helpers, plugin helper placement, service-root helper placement, and shared symbol ownership in `src/ui/components/index.ts` and `src/utils/index.ts`
