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
- **Test**: Node.js native test runner, Playwright (e2e with `_electron.launch()`)
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
npm run validate              # Full pipeline: format + lint + check:shared-code + test + integration + build + e2e

npm run crawl:download        # Download HTML samples for crawler tests

npm run format                # Prettier
npm run lint                  # ESLint
npm run lint:fix              # ESLint --fix
npm run check:shared-code     # Verify ui/components & ui/hooks are genuinely shared
```

## Architecture

```
src/
  plugins/        # External service interfaces (browser, commute, job-site, llm, pdf-renderer).
                  #   Each has types.ts + real impl + stub/ for testing.
                  #   NO imports from other layers.
  models/         # Pure domain type definitions + constants + simple self-contained helpers.
                  #   NO imports from other layers.
  repositories/   # Repository interfaces + impls (stub + sqlite) for domain entities.
                  #   Imports: models.
  services/       # Business logic as DI service classes.
                  #   resume-renderer/  — PDF generation
                  #   job-consultant/   — job search suggestions from LLM
                  #   vacancy-scanner/  — crawl and analyse (extract contacts, estimate commute time, etc) vacancies
                  #   cover-letter-writer/ — generic + personalized cover letters from LLM
                  #   Imports: models, plugins, repositories, services.
  app/            # Electron main process (IPC handlers, protocol, background tasks).
                  #   app/config/ — config repository (electron-store + stub).
                  #   app/secrets/ — secrets repository (encrypted + stub).
                  #   Imports: all lower layers.
  ui/             # Renderer process (React SPA).
                  #   components/ — shared presentational components (must be used by 2+ page groups)
                  #   hooks/      — shared custom hooks (self-contained, no @/ui imports)
                  #   data/       — shared domain query hooks (React Query over IPC)
                  #   layout/     — app shell (AppLayout, LayoutContext)
                  #   pages/      — page groups, each with own components/, hooks/, views/
scripts/          # CLI utility scripts (crawl-download, check-shared-code).
e2e/              # E2E tests: fixtures, page objects, tests-flow/, tests-templates/.
.github/workflows/  # CI (push/PR) and release (v* tags).
```

### Import rules (ESLint-enforced)

Always use `@/` path alias — `../` imports are forbidden.

| Layer | Allowed `@/` imports |
|-------|---------------------|
| `plugins/` | `@/plugins` |
| `models/` | `@/models` |
| `repositories/` | `@/models`, `@/repositories` |
| `services/` | `@/models`, `@/plugins`, `@/repositories`, `@/services` |
| `app/` | all lower layers + `@/app` |

**UI sub-layers**

| Sub-layer | Allowed imports |
|-----------|----------------|
| `hooks/` | _(self-contained, no @/ui imports)_ |
| `components/` | `@/models`, `@/ui/hooks` |
| `data/` | `@/models`, `@/ui/hooks` |
| `layout/` | `@/models`, `@/ui/components`, `@/ui/hooks` |
| `pages/<group>/` | `@/models`, `@/ui/components`, `@/ui/hooks`, `@/ui/data`, `@/ui/layout`, `@/ui/constants`, `@/ui/pages/<same-group>` |
| Root (`ui/*.tsx`) | `@/models`, all `@/ui/*` |

Page groups (`applicant`, `job-search`, `settings`) cannot cross-import. Each page group has its own `components/`, `hooks/`, and `views/` subdirectories for group-specific code.

### Shared code placement

`check-shared-code` (run via `npm run check:shared-code`) enforces that exports in `ui/components/` and `ui/hooks/` are genuinely shared — used by 2+ page groups, by layout + a page group, or by sibling files in the same directory. Single-page-group-only code must live in `pages/<group>/components/` or `pages/<group>/hooks/`.

### Key patterns

**IPC**: Renderer calls `window.electronAPI.invoke(channel, ...args)` via preload. Main process handles via `ipcMain.handle()`. IPC client in `src/ui/hooks/ipc-client.ts`.

**Repository**: Domain entities (applicant, job-search, vacancy) have interfaces in `repositories/<entity>/types.ts` with `sqlite/` and `stub/` implementations. `Database` class wraps `DatabaseSync`. Each SQLite repo creates its own tables — no central schema.

**Config & secrets**: `app/config/` (electron-store) and `app/secrets/` (safeStorage + `secrets.enc`). Both have stub implementations.

**Plugin**: External integrations define interfaces in `types.ts` with real and `stub/` implementations.

**Service**: Four service classes receive dependencies via constructor injection, instantiated in `app/index.ts` and rebuilt when settings change. IPC handlers call repos directly for CRUD, services for business logic.

## Code conventions

- **TypeScript strict mode**, ES2022 target, path alias `@/*` → `./src/*`
- **File naming**: `.ts` files use kebab-case, `.tsx` files use PascalCase (exceptions: `main.tsx`, `layout.tsx`)
- **camelCase** for variables/functions, **PascalCase** for types/components
- Barrel exports via `index.ts`; tests co-located as `*.test.ts` / `*.integration-test.ts`
- Tailwind classes for styling; no CSS modules
- Services and repos throw plain `Error` for validation/not-found errors
- Interfaces with methods are implemented using classes, not plain objects
- Commit messages: imperative mood, concise, describe the change

## Testing

- Unit tests use `node:test` and `node:assert/strict` (no Jest)
- Integration tests may require external connections (for example to job boards)
- E2E tests use Playwright with Electron (`_electron.launch()`)
- Visual snapshot tests compare PDF renders against reference PNGs
- Always run `npm run validate` before considering work complete

## Debugging & Extending job-site crawlers

**Selectors break:** `crawl:download` → `npm test` → fix `src/plugins/job-site/<name>/index.ts` → repeat.

**New site:** Create `src/plugins/job-site/<name>/index.ts` exporting a factory function, register in `src/plugins/job-site/index.ts`, add test + HTML samples.

## Rules

- **Never run the crawler.** Only the user runs `npm run crawl*` commands.
- **Always use root npm scripts.** Never run `tsc`, `tsx`, or `node` directly.
- Write only black-box style tests, don't test implementation details.
- After completing a significant task, run `npm run validate` to verify the full pipeline works before proposing to commit.
- Always propose to commit changes after completing a task.
- **PRs**: concise title describing the main focus; body is a short bullet-list summarising all commit descriptions in the branch; no heading, no extra sections. 
