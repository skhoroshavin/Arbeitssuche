# CLAUDE.md

## Project

Arbeitssuche — an Electron desktop app for crawling German job boards, tracking applications, analysing vacancies with LLMs, and adjusting your application to the job description.

## Tech stack

- **Desktop**: Electron, IPC (main ↔ renderer), custom `app://` protocol
- **Frontend**: React 19, React Router v7, Tailwind CSS v4, React Hook Form, TanStack React Query v5
- **Crawling**: Electron BrowserWindow (hidden), cheerio
- **LLM**: OpenRouter (pluggable via factory pattern)
- **Data**: SQLite (via `Database` class wrapping `node:sqlite`), encrypted secrets via Electron `safeStorage`
- **Build**: electron-vite (main + preload + renderer), TypeScript strict mode
- **Test**: Node.js native test runner (`node:test` + `node:assert/strict`), Playwright (e2e)
- **CI/CD**: GitHub Actions (CI on push/PR, release on tag)

## Commands

```bash
npm run electron:dev          # Dev mode (Vite HMR + Electron)
npm run electron:build        # Build all (main + preload + renderer)
npm run electron:dist:mac:arm64  # Build + package macOS (arm64)
npm run electron:dist:mac:x64   # Build + package macOS (x64)
npm run electron:dist:win     # Build + package Windows (x64)
npm run electron:dist:linux   # Build + package Linux (x64)

npm test                      # Unit tests (*.test.ts)
npm run test:integration      # Integration tests (*.integration-test.ts)
npm run test:e2e              # E2E tests (Electron + Playwright)
npm run test:visual           # Visual snapshot tests
npm run validate              # Full pipeline: format + check + lint + test + integration + build + e2e

npm run bump <dev|major|minor|patch>  # Bump version (stable→dev→release)
npm run crawl:download        # Download HTML samples for crawler tests

npm run format                # Prettier
npm run lint                  # ESLint
npm run lint:fix              # ESLint --fix
npm run check                 # Architecture checks (dead code, shared code, imports, exports)
```

## Architecture

Layered architecture enforced by `npm run check` and ESLint. Run these to see detailed violation messages.

```
src/
  models/         # Pure domain types + constants. No imports from other layers.
  utils/          # Shared self-contained utilities (used by 2+ entities).
  plugins/        # External service interfaces (browser, commute, job-site, llm, pdf-renderer).
                  #   Each has types.ts + real impl + stub/ for testing.
  repositories/   # Domain entity persistence (applicant, job-search, vacancy).
                  #   Interface in types.ts, sqlite/ and stub/ implementations.
  services/       # Business logic (resume-renderer, job-consultant, vacancy-scanner, cover-letter-writer).
                  #   DI service classes, instantiated in app/index.ts.
  app/            # Electron main process (IPC handlers, protocol, config, secrets).
  ui/             # Renderer (React SPA).
                  #   components/, hooks/ — shared (must be used by 2+ page groups)
                  #   data/   — React Query hooks over IPC
                  #   layout/ — app shell
                  #   pages/  — isolated page groups (applicant, job-search, settings),
                  #             each with own components/, hooks/, views/
scripts/          # CLI utilities (bump-version, crawl-download, check-architecture).
e2e/              # E2E tests: fixtures, page objects, tests-flow/, tests-templates/.
```

### Key patterns

**IPC**: Renderer calls `window.electronAPI.invoke(channel, ...args)` via preload. Main process handles via `ipcMain.handle()`. IPC handlers call repos directly for CRUD, services for business logic.

**Repository**: Each SQLite repo creates its own tables — no central schema.

**Service**: Constructor injection, rebuilt when settings change (`app/index.ts`).

**Plugin**: Interface in `types.ts`, real + `stub/` implementations.

## Code conventions

- Services and repos throw plain `Error` for validation/not-found errors
- Interfaces with methods are implemented using classes, not plain objects
- Commit messages: imperative mood, concise, describe the change

## Debugging & Extending job-site crawlers

**Selectors break:** `crawl:download` → `npm test` → fix `src/plugins/job-site/<name>/index.ts` → repeat.

**New site:** Create `src/plugins/job-site/<name>/index.ts` exporting a factory function, register in `src/plugins/job-site/index.ts`, add test + HTML samples.

## Release process

1. In the release PR: `npm run bump dev` then `npm run bump patch` (or `minor`/`major`)
2. Squash-merge to `main`
3. `auto-tag.yml` detects the stable version on `main`, creates a `v*` tag
4. The tag triggers `release.yml` which builds and publishes artifacts
5. The `dev-bump` job in `release.yml` auto-creates a PR for the next `-dev` version

## Rules

- **Never run the crawler.** Only the user runs `npm run crawl*` commands.
- **Always use root npm scripts.** Never run `tsc`, `tsx`, or `node` directly.
- **Bug fixes**: first write a test that reproduces the bug, verify it fails, then fix the code and confirm the test passes.
- Write only black-box style tests, don't test implementation details.
- After completing a significant task, run `npm run validate` to verify the full pipeline works before proposing to commit.
- Always propose to commit changes after completing a task.
- **PRs**: concise title describing the main focus; body is a short bullet-list summarising all commit descriptions in the branch; no heading, no extra sections.
- **PR workflow**: always create a new branch, fetch origin, merge `main` into it, then push before opening the PR.
