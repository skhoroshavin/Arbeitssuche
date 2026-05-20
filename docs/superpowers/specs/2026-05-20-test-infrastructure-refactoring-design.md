# Test Infrastructure Refactoring

## Goal

Unify test commands, ensure integration tests run with live keys in CI, and extract test utilities into a shared package.

## 1. NPM Scripts

| Current | New |
|---------|-----|
| `npm test` | `npm test` (unit tests, unchanged) |
| `npm run test:crawler` | `npm run test:integration` |
| `npm run test:e2e` | `npm run test:e2e` (unchanged) |
| `npm run test:all` | `npm run test:all` (uses new names) |

All commands support vitest passthrough:
```bash
npm test -- <file>
npm test -- -t "<pattern>"
npm run test:integration -- <file>
npm run test:integration -- -t "<pattern>"
npm run test:e2e -- <spec>
```

E2E keeps the `electron-vite build &&` prefix in the script — args are appended to the end by npm, so `npm run test:e2e -- <spec>` works. Rebuild on every run is acceptable (fast enough).

## 2. Vitest Config Changes

### `vitest.config.ts` (unit tests)

Add exclude pattern to prevent integration tests from running in unit test suite:

```ts
test: {
  include: ["{src,scripts,eslint}/**/*.test.{ts,tsx}"],
  exclude: ["**/integration.test.ts"],
  setupFiles: ["./src/ui/test-setup.ts"],
}
```

### `vitest.integration.config.ts`

Expand include glob to cover both plugins and repositories:

```ts
test: {
  include: [
    "src/plugins/**/integration.test.ts",
    "src/repositories/**/integration.test.ts",
  ],
  testTimeout: 60_000,
  env: {
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY ?? "",
  },
}
```

## 3. CI Changes

File: `.github/workflows/ci.yml`

### `validate` job

Remove the "Crawler tests" step. Keep only unit tests.

### New `validate-live` job (replaces `e2e-live`)

Rename `e2e-live` to `validate-live`. Move integration tests into this job alongside E2E tests:

```yaml
validate-live:
  name: Live validation
  runs-on: ubuntu-latest
  needs: validate
  if: ${{ github.event_name != 'pull_request' || github.event.pull_request.head.repo.full_name == github.repository }}
  env:
    OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
    GOOGLE_MAPS_API_KEY: ${{ secrets.GOOGLE_MAPS_API_KEY }}

  steps:
    - uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2
    - uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0
      with:
        node-version: 24
        cache: npm
    - run: npm ci
    - name: Install Playwright and system dependencies
      run: npx playwright install --with-deps chromium
    - name: Integration tests
      run: npm run test:integration
    - name: E2E tests
      run: xvfb-run --auto-servernum npm run test:e2e
```

## 4. New `src/test-helpers` Package

### Purpose

Shared test utilities consumed by at least 2 packages.

### Structure

```
src/test-helpers/
  index.ts
  http-stub.ts
  fetch-stub.ts
  test-utilities.ts
  require-env.ts
  http-stub.test.ts
  test-utilities.test.ts
```

### Contents

**Moved from `src/utils`:**
- `http-stub.ts` — `HttpStub` class
- `fetch-stub.ts` — `FetchStub` class
- `test-utilities.ts` — `setupTemporaryDatabaseDirectory`
- `http-stub.test.ts` — move from `src/utils/http-stub.test.ts`
- `test-utilities.test.ts` — move from `src/utils/test-utilities.test.ts`

**New:**
- `require-env.ts` — fail-loudly env var check for integration tests

### `require-env.ts`

```typescript
export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `${name} environment variable is required for integration tests. ` +
      `Set it in .env or export it.`
    )
  }
  return value
}
```

### `index.ts` public surface

```typescript
export { HttpStub } from "./http-stub.js"
export { FetchStub } from "./fetch-stub.js"
export { setupTemporaryDatabaseDirectory } from "./test-utilities.js"
export { requireEnv } from "./require-env.js"
```

### Import updates

| File | Old import | New import |
|------|-----------|------------|
| `src/plugins/browser/stub/index.ts` | `@/utils/index.js` | `@/test-helpers` |
| `src/plugins/job-site/arbeitsagentur/index.test.ts` | `@/utils` | `@/test-helpers` |
| `src/plugins/commute/google-maps/index.test.ts` | `@/utils` | `@/test-helpers` |
| `src/repositories/vacancy/integration.test.ts` | `@/utils/index.js` | `@/test-helpers` |
| `src/repositories/job-search/integration.test.ts` | `@/utils/index.js` | `@/test-helpers` |
| `src/repositories/applicant/integration.test.ts` | `@/utils/index.js` | `@/test-helpers` |

### Remove from `src/utils/index.ts`

```diff
- export { setupTemporaryDatabaseDirectory } from "./test-utilities.js"
- export { HttpStub } from "./http-stub.js"
- export { FetchStub } from "./fetch-stub.js"
```

Keep `Database`, `Statement`, and other production utilities in `src/utils`.

## 5. Commute Integration Test — Fail Loudly

Replace `test.skipIf(!apiKey)` with `requireEnv`:

```typescript
import { requireEnv } from "@/test-helpers"

describe("Google Maps CommuteProvider", () => {
  const apiKey = requireEnv("GOOGLE_MAPS_API_KEY")

  test("ping returns true with a valid API key", async () => {
    const result = await GoogleMapsCommuteProvider.ping(apiKey)
    expect(result).toBe(true)
  })

  test("createClient returns commute data for Berlin to Munich", async () => {
    const client = GoogleMapsCommuteProvider.createClient(apiKey)
    const result = await client.getCommute("Berlin", "Munich")
    expect(result.distance).toBeTruthy()
    expect(result.durations.morning).toBeGreaterThan(0)
    expect(result.fetchedAt).toBeTruthy()
  })

  test("ping returns false with an invalid API key", async () => {
    const result = await GoogleMapsCommuteProvider.ping("invalid-key")
    expect(result).toBe(false)
  })
})
```

The third test (invalid key) does not need `requireEnv` — it works without a real key.

## 6. AGENTS.md Updates

### Commands table

Replace:
```
| `npm run test:crawler:<site>` | Single-site crawler (arbeitsagentur, xing, zalando, dm) |
```

With:
```
| `npm run test:integration -- <file>` | Single integration test file |
| `npm run test:integration -- -t "<pattern>"` | Filter integration tests by name |
```

### Test file naming convention

Fix the suffixes list — `integration.test.ts` is a filename, not a suffix:

```
- Test suffixes: `.test.ts`, `.test.tsx`, `.test-suite.ts`, `.integration.test.ts`.
+ Test suffixes: `.test.ts`, `.test.tsx`, `.test-suite.ts`.
+ Integration test filename: `integration.test.ts`.
```

### Shared modules

Add `test-helpers` to the shared modules list:

```
- **Shared modules** (`utils`, `ui/components`) must be consumed by **at least 2 packages**.
+ **Shared modules** (`utils`, `ui/components`, `test-helpers`) must be consumed by **at least 2 packages**.
```

Update the layer import rules table to include `test-helpers`:

```
| `test-helpers` | (shared — no declared imports) |
```

All test files (`*.test.ts`, `*.test.tsx`, `integration.test.ts`) may import from `test-helpers`.

> **Note:** This rule is not currently enforceable through `eslint-plugin-unslop`. It will be a convention documented in AGENTS.md, enforced through code review.
