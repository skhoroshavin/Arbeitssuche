## 1. Switch to local eslint-plugin-unslop

- [x] 1.1 Build the local plugin: run `npm run build` in `../eslint-plugin-unslop`
- [x] 1.2 Update `package.json` to reference `"eslint-plugin-unslop": "file:../eslint-plugin-unslop"`
- [x] 1.3 Run `npm install` to link the local plugin
- [x] 1.4 Run `npm run verify` to confirm ESLint still works with the local plugin (expect lint errors from stricter entrypoint enforcement — this is expected and will be fixed in subsequent steps)

## 2. Models: merge types.ts into index.ts

- [x] 2.1 `models/config`: move all type exports from `types.ts` into `index.ts` (types at top), delete `types.ts`, update internal import in `resolve.ts`
- [x] 2.2 Update all import sites for `@/models/config/types` → `@/models/config` (10 files: `models/applicant/types.ts`, `app/config/electron-store.ts`, `app/config/types.ts`, `app/config/stub.ts`, `app/ipc-settings.ts`, `ui/data/settings.ts`, `ui/pages/settings/views/ai.tsx`, `ui/pages/settings/components/model-combobox.tsx`, plus test `app/config/config.test.ts`)
- [x] 2.3 `models/secrets`: move all type exports from `types.ts` into `index.ts`, delete `types.ts`, update internal import in `resolve.ts`
- [x] 2.4 Update all import sites for `@/models/secrets/types` → `@/models/secrets` (8 files: `models/secrets/resolve.ts`, `app/secrets/encrypted.ts`, `app/secrets/types.ts`, `app/secrets/stub.ts`, `app/ipc-utilities.ts`, `app/ipc-settings.ts`, `ui/data/settings.ts`, plus test `app/secrets/secrets.test.ts`)
- [x] 2.5 `models/vacancy`: move all type exports from `types.ts` into `index.ts`, delete `types.ts`, update internal import in `resolve.ts`
- [x] 2.6 Update all import sites for `@/models/vacancy/types` → `@/models/vacancy` (17 files across repositories, services, app, UI)
- [x] 2.7 `models/applicant`: move all type exports from `types.ts` into `index.ts`, delete `types.ts`, update internal imports in `resolve.ts`, `format.ts`, `draft-snapshot.ts`
- [x] 2.8 Update all import sites for `@/models/applicant/types` → `@/models/applicant` (22 files across repositories, services, app, UI)
- [x] 2.9 `models/job-search`: move all type exports from `types.ts` into `index.ts`, delete `types.ts`, update internal imports in `resolve.ts`, `editor-snapshot.ts`
- [x] 2.10 Update all import sites for `@/models/job-search/types` → `@/models/job-search` (26 files across repositories, services, app, UI)
- [x] 2.11 Run `npm run verify` and `npm test` — all must pass

## 3. Repositories: contract-only index.ts

- [x] 3.1 `repositories/vacancy`: rewrite `index.ts` to re-export only `type { VacancyRepository, VacancyListOutput }` from `./types.js`
- [x] 3.2 Update `app/index.ts`: change `createSqliteVacancyRepository` import from `@/repositories/vacancy/index.js` to `@/repositories/vacancy/sqlite`
- [x] 3.3 Update cross-module imports of `@/repositories/vacancy/types` → `@/repositories/vacancy` (services: `cover-letter-writer.ts`, `vacancy-scanner.ts`; `app/index.ts` for type import)
- [x] 3.4 `repositories/applicant`: rewrite `index.ts` to re-export only `type { ApplicantRepository }` from `./types.js` (include `loadFinalizedApplicantDraft` if it's part of the contract)
- [x] 3.5 Update `app/index.ts`: change `createSqliteApplicantRepository` import from `@/repositories/applicant/index.js` to `@/repositories/applicant/sqlite`
- [x] 3.6 Update cross-module imports of `@/repositories/applicant/types` → `@/repositories/applicant` (services: `cover-letter-writer.ts`, `vacancy-scanner.ts`, `job-consultant.ts`, `resume-renderer.ts`; `app/index.ts` for type import)
- [x] 3.7 `repositories/job-search`: rewrite `index.ts` to re-export only `type { JobSearchRepository }` from `./types.js`
- [x] 3.8 Update `app/index.ts`: change `createSqliteJobSearchRepository` import from `@/repositories/job-search/index.js` to `@/repositories/job-search/sqlite`
- [x] 3.9 Update cross-module imports of `@/repositories/job-search/types` → `@/repositories/job-search` (services: `cover-letter-writer.ts`, `vacancy-scanner.ts`; `app/index.ts` for type import)
- [x] 3.10 Run `npm run verify` and `npm test` — all must pass

## 4. Plugins without factories: contract-only index.ts

- [x] 4.1 `plugins/fetch`: rewrite `index.ts` to re-export only `type { Fetch }` from `./types.js`. Move `createStubFetch` to its own submodule or leave it importable directly from `stub/`
- [x] 4.2 Update cross-module imports of `@/plugins/fetch` → `@/plugins/fetch` (2 files: `plugins/fetch/stub/index.ts` stays relative, `plugins/job-site/arbeitsagentur/index.ts` becomes `@/plugins/fetch`)
- [x] 4.3 `plugins/pdf-renderer`: rewrite `index.ts` to re-export only `type { PdfRenderer }` from `./types.js`
- [x] 4.4 Update `app/index.ts`: change `createElectronPdfRenderer` import from `@/plugins/pdf-renderer/index.js` to `@/plugins/pdf-renderer/electron`
- [x] 4.5 Update cross-module imports of `@/plugins/pdf-renderer` → `@/plugins/pdf-renderer` (services: `resume-renderer.ts`; `app/index.ts` for type import)
- [x] 4.6 Run `npm run verify` and `npm test` — all must pass

## 5. Plugins with factories: extract create.ts

- [x] 5.1 `plugins/llm`: create `create.ts` with `createLlmClient`, `createLlmClientForPing`, `createModelRegistry`, `getLlmProviders` (moved from current `index.ts`). Rewrite `index.ts` to re-export only types from `./types.js`
- [x] 5.2 Update `app/index.ts` and `app/ipc-settings.ts`: change factory imports from `@/plugins/llm/index.js` to `@/plugins/llm/create`
- [x] 5.3 Update cross-module imports of `@/plugins/llm` → `@/plugins/llm` (services: `llm/index.ts`, `cover-letter-writer/*.ts`, `job-consultant/*.ts`, `vacancy-enricher/*.ts`; `app/index.ts` and `app/llm-factory.ts` for type imports)
- [x] 5.4 `plugins/commute`: create `create.ts` with `createCommuteClient`, `getCommuteProviders`. Rewrite `index.ts` to re-export only types from `./types.js`
- [x] 5.5 Update `app/ipc-settings.ts` and `app/index.ts`: change factory/provider imports from `@/plugins/commute/index.js` to `@/plugins/commute/create` (for `createCommuteClient`, `getCommuteProviders`) and `@/plugins/commute/google-maps` (for `createGoogleMapsCommuteClient`)
- [x] 5.6 Update cross-module imports of `@/plugins/commute` → `@/plugins/commute` (services: `vacancy-enricher/*.ts`; `app/index.ts` for type import)
- [x] 5.7 `plugins/browser`: create `create.ts` with `createElectronBrowser`, `createPlaywrightBrowser`. Rewrite `index.ts` to re-export only types from `./types.js`
- [x] 5.8 Update `app/crawl-manager.ts`: change `createElectronBrowser` import from `@/plugins/browser/index.js` to `@/plugins/browser/create`
- [x] 5.9 Update cross-module imports of `@/plugins/browser` → `@/plugins/browser` (plugins: `job-site/index.ts`, `job-site/*/index.ts`, `job-site/utils/index.ts` — these are same-layer so use `@/plugins/browser`)
- [x] 5.10 `plugins/job-site`: create `create.ts` with `createJobSite`, `getJobSiteInfos`, `getJobSiteNames` (moved from current `index.ts`). Rewrite `index.ts` to re-export only types from `./types.js`
- [x] 5.11 Update `app/crawl-manager.ts`, `app/ipc-settings.ts`, `app/index.ts`: change factory imports from `@/plugins/job-site/index.js` to `@/plugins/job-site/create`
- [x] 5.12 Update cross-module imports of `@/plugins/job-site` → `@/plugins/job-site` (services: `vacancy-processor/process.ts`, `vacancy-scanner/vacancy-scanner.ts`, `site-crawler/paginate.ts`, `site-crawler/site-crawler.ts`)
- [x] 5.13 Run `npm run verify` and `npm test` — all must pass

## 6. Documentation and final verification

- [x] 6.1 Update `AGENTS.md` imports section to document the new conventions: index-only cross-module imports, types.ts as internal contract file, create.ts for factory plugins
- [x] 6.2 Run full verification: `npm run fix`, `npm test`, `npm run test:all`
