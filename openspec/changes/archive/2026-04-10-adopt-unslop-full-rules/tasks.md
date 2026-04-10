## 1. Flatten app/ipc-handlers

- [x] 1.1 Move `src/app/ipc-handlers/index.ts` → `src/app/ipc-handlers.ts`, replacing `@/app/index.js` alias imports with `./index.js`
- [x] 1.2 Move `src/app/ipc-handlers/applicants.ts` → `src/app/ipc-applicants.ts`, replacing `@/app/index.js` with `./index.js`
- [x] 1.3 Move `src/app/ipc-handlers/crawl.ts` → `src/app/ipc-crawl.ts`, replacing `@/app/index.js` with `./index.js` and `@/app/crawl-manager.js` with `./crawl-manager.js`
- [x] 1.4 Move `src/app/ipc-handlers/job-searches.ts` → `src/app/ipc-job-searches.ts`, replacing `@/app/index.js` with `./index.js`
- [x] 1.5 Move `src/app/ipc-handlers/settings.ts` → `src/app/ipc-settings.ts`, replacing `@/app/index.js` with `./index.js`
- [x] 1.6 Move `src/app/ipc-handlers/vacancies.ts` → `src/app/ipc-vacancies.ts`, replacing `@/app/index.js` with `./index.js`
- [x] 1.7 Move `src/app/ipc-handlers/utilities.ts` → `src/app/ipc-utilities.ts`
- [x] 1.8 Update `src/app/ipc.ts` to import from `./ipc-handlers.js` instead of `./ipc-handlers`
- [x] 1.9 Delete the now-empty `src/app/ipc-handlers/` directory
- [x] 1.10 Run `npm run build` and `npm run test:e2e` to verify no regressions

## 2. Reshape models

- [x] 2.1 Create `src/models/progress/index.ts` and move the contents of `src/models/events.ts` into it
- [x] 2.2 Update all imports of `@/models/events` to use `@/models/progress/index.js`
- [x] 2.3 Delete `src/models/events.ts`
- [x] 2.4 Move `arrayToString` and `stringToArray` from `src/models/utilities.ts` to `src/utils/text.ts` (or a new `src/utils/array.ts` if more appropriate)
- [x] 2.5 Update `src/ui/pages/applicant/hooks/applicant-form.ts` to import from `@/utils/` instead of `@/models/index`
- [x] 2.6 Remove the `utilities.ts` re-export from `src/models/index.ts` and delete `src/models/utilities.ts`
- [x] 2.7 Run `npm test` to verify no regressions

## 3. Reshape plugins

- [x] 3.1 Move `src/plugins/stub-utilities.ts` to `src/utils/stub-utilities.ts`
- [x] 3.2 Update all imports of `@/plugins/stub-utilities` to use `@/utils/stub-utilities.js`
- [x] 3.3 Create `src/plugins/job-site/utils/index.ts` and move the contents of `src/plugins/page-utilities/index.ts` into it
- [x] 3.4 Update all imports of `@/plugins/page-utilities` to use `@/plugins/job-site/utils/index.js`
- [x] 3.5 Delete `src/plugins/page-utilities/` directory
- [x] 3.6 Run `npm test` to verify no regressions

## 4. Reshape services

- [x] 4.1 Create `src/services/llm/index.ts` and move `ensureLlmAvailable` from `src/services/asserts.ts` into it
- [x] 4.2 Update `src/services/job-consultant/job-consultant.ts` to import from `@/services/llm/index.js`
- [x] 4.3 Update `src/services/cover-letter-writer/cover-letter-writer.ts` to import from `@/services/llm/index.js`
- [x] 4.4 Delete `src/services/asserts.ts`
- [x] 4.5 Run `npm test` to verify no regressions

## 5. Update ESLint config

- [x] 5.1 Install `eslint-plugin-unslop@0.4.0` and update `package.json`
- [x] 5.2 Replace the existing unslop config in `eslint.config.ts` with `unslop.configs.full` as the baseline
- [x] 5.3 Add the architecture block inline in `eslint.config.ts` with the module-level allow lists from the `linting-policy` spec
- [x] 5.4 Run `npm run lint` and fix any remaining violations not covered by the reshaping steps
- [x] 5.5 Ensure `npm run verify` passes with zero lint errors

## 6. Remove dependency-cruiser

- [x] 6.1 Delete `.dependency-cruiser.cjs`
- [x] 6.2 Remove `dependency-cruiser` from `package.json` dependencies and all `depcruise`-based scripts
- [x] 6.3 Run `npm install` to update `package-lock.json`
- [x] 6.4 Run `npm run verify` to confirm nothing depends on the removed tool

## 7. Update specs and docs

- [x] 7.1 Update `openspec/specs/dependency-boundaries/spec.md` by syncing the delta spec from this change
- [x] 7.2 Create `openspec/specs/linting-policy/spec.md` by syncing the delta spec from this change
- [x] 7.3 Update `AGENTS.md` to remove all references to dependency-cruiser and describe unslop as the single architecture authority
