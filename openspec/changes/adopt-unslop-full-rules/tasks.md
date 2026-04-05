## 1. Flatten app/ipc-handlers

- [ ] 1.1 Move `src/app/ipc-handlers/index.ts` → `src/app/ipc-handlers.ts`, replacing `@/app/index.js` alias imports with `./index.js`
- [ ] 1.2 Move `src/app/ipc-handlers/applicants.ts` → `src/app/ipc-applicants.ts`, replacing `@/app/index.js` with `./index.js`
- [ ] 1.3 Move `src/app/ipc-handlers/crawl.ts` → `src/app/ipc-crawl.ts`, replacing `@/app/index.js` with `./index.js` and `@/app/crawl-manager.js` with `./crawl-manager.js`
- [ ] 1.4 Move `src/app/ipc-handlers/job-searches.ts` → `src/app/ipc-job-searches.ts`, replacing `@/app/index.js` with `./index.js`
- [ ] 1.5 Move `src/app/ipc-handlers/settings.ts` → `src/app/ipc-settings.ts`, replacing `@/app/index.js` with `./index.js`
- [ ] 1.6 Move `src/app/ipc-handlers/vacancies.ts` → `src/app/ipc-vacancies.ts`, replacing `@/app/index.js` with `./index.js`
- [ ] 1.7 Move `src/app/ipc-handlers/utilities.ts` → `src/app/ipc-utilities.ts`
- [ ] 1.8 Update `src/app/ipc.ts` to import from `./ipc-handlers.js` instead of `./ipc-handlers`
- [ ] 1.9 Delete the now-empty `src/app/ipc-handlers/` directory
- [ ] 1.10 Run `npm run build` and `npm run test:e2e` to verify no regressions

## 2. Reshape models

- [ ] 2.1 Create `src/models/progress/index.ts` and move the contents of `src/models/events.ts` into it
- [ ] 2.2 Update all imports of `@/models/events` to use `@/models/progress/index.js`
- [ ] 2.3 Delete `src/models/events.ts`
- [ ] 2.4 Move `arrayToString` and `stringToArray` from `src/models/utilities.ts` to `src/utils/text.ts` (or a new `src/utils/array.ts` if more appropriate)
- [ ] 2.5 Update `src/ui/pages/applicant/hooks/applicant-form.ts` to import from `@/utils/` instead of `@/models/index`
- [ ] 2.6 Remove the `utilities.ts` re-export from `src/models/index.ts` and delete `src/models/utilities.ts`
- [ ] 2.7 Run `npm test` to verify no regressions

## 3. Reshape plugins

- [ ] 3.1 Move `src/plugins/stub-utilities.ts` to `src/utils/stub-utilities.ts`
- [ ] 3.2 Update all imports of `@/plugins/stub-utilities` to use `@/utils/stub-utilities.js`
- [ ] 3.3 Create `src/plugins/job-site/utils/index.ts` and move the contents of `src/plugins/page-utilities/index.ts` into it
- [ ] 3.4 Update all imports of `@/plugins/page-utilities` to use `@/plugins/job-site/utils/index.js`
- [ ] 3.5 Delete `src/plugins/page-utilities/` directory
- [ ] 3.6 Run `npm test` to verify no regressions

## 4. Reshape services

- [ ] 4.1 Create `src/services/llm/index.ts` and move `ensureLlmAvailable` from `src/services/asserts.ts` into it
- [ ] 4.2 Update `src/services/job-consultant/job-consultant.ts` to import from `@/services/llm/index.js`
- [ ] 4.3 Update `src/services/cover-letter-writer/cover-letter-writer.ts` to import from `@/services/llm/index.js`
- [ ] 4.4 Delete `src/services/asserts.ts`
- [ ] 4.5 Run `npm test` to verify no regressions

## 5. Update ESLint config

- [ ] 5.1 Install `eslint-plugin-unslop@0.4.0` and update `package.json`
- [ ] 5.2 Replace the existing unslop config in `eslint.config.ts` with `unslop.configs.full` as the baseline
- [ ] 5.3 Add the architecture block inline in `eslint.config.ts` with the module-level allow lists from the `linting-policy` spec
- [ ] 5.4 Run `npm run lint` and fix any remaining violations not covered by the reshaping steps
- [ ] 5.5 Ensure `npm run verify` passes with zero lint errors

## 6. Remove dependency-cruiser

- [ ] 6.1 Delete `.dependency-cruiser.cjs`
- [ ] 6.2 Remove `dependency-cruiser` from `package.json` dependencies and all `depcruise`-based scripts
- [ ] 6.3 Run `npm install` to update `package-lock.json`
- [ ] 6.4 Run `npm run verify` to confirm nothing depends on the removed tool

## 7. Update specs and docs

- [ ] 7.1 Update `openspec/specs/dependency-boundaries/spec.md` by syncing the delta spec from this change
- [ ] 7.2 Create `openspec/specs/linting-policy/spec.md` by syncing the delta spec from this change
- [ ] 7.3 Update `AGENTS.md` to remove all references to dependency-cruiser and describe unslop as the single architecture authority
