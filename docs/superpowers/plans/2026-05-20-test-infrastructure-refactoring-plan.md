# Test Infrastructure Refactoring — Implementation Plan

Spec: `docs/superpowers/specs/2026-05-20-test-infrastructure-refactoring-design.md`

## Task Order

1. Create `src/test-helpers` package with moved utilities
2. Create `require-env.ts` helper
3. Update consumer imports to use `@/test-helpers`
4. Remove moved exports from `src/utils`
5. Update commute integration test to fail loudly
6. Update vitest configs
7. Update npm scripts in `package.json`
8. Update CI workflow
9. Update AGENTS.md
10. Verify and fix

---

### Task 1: Create `src/test-helpers` package

**Files:**
- Create: `src/test-helpers/index.ts`
- Move: `src/utils/http-stub.ts` → `src/test-helpers/http-stub.ts`
- Move: `src/utils/fetch-stub.ts` → `src/test-helpers/fetch-stub.ts`
- Move: `src/utils/test-utilities.ts` → `src/test-helpers/test-utilities.ts`
- Move: `src/utils/http-stub.test.ts` → `src/test-helpers/http-stub.test.ts`
- Move: `src/utils/test-utilities.test.ts` → `src/test-helpers/test-utilities.test.ts`

- [ ] **Step 1: Create directory and move files**

```bash
mkdir -p src/test-helpers
git mv src/utils/http-stub.ts src/test-helpers/http-stub.ts
git mv src/utils/fetch-stub.ts src/test-helpers/fetch-stub.ts
git mv src/utils/test-utilities.ts src/test-helpers/test-utilities.ts
git mv src/utils/http-stub.test.ts src/test-helpers/http-stub.test.ts
git mv src/utils/test-utilities.test.ts src/test-helpers/test-utilities.test.ts
```

- [ ] **Step 2: Fix internal imports in moved files**

`src/test-helpers/fetch-stub.ts` imports from `./http-stub.js` — this is correct after move, no change needed.

`src/test-helpers/http-stub.test.ts` imports from `.` — needs to import from `./index.js`:

```typescript
// Current line 1:
import { HttpStub } from "."

// Change to:
import { HttpStub } from "./index.js"
```

`src/test-helpers/test-utilities.test.ts` imports from `.` — needs same fix:

```typescript
// Current line 1:
import { setupTemporaryDatabaseDirectory } from "."

// Change to:
import { setupTemporaryDatabaseDirectory } from "./index.js"
```

- [ ] **Step 3: Create `src/test-helpers/index.ts`**

```typescript
export { HttpStub } from "./http-stub.js"
export { FetchStub } from "./fetch-stub.js"
export { setupTemporaryDatabaseDirectory } from "./test-utilities.js"
```

- [ ] **Step 4: Verify moved tests still pass**

Run: `npm test -- src/test-helpers/http-stub.test.ts`
Expected: PASS

Run: `npm test -- src/test-helpers/test-utilities.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/test-helpers src/utils
git commit -m "refactor: create test-helpers package with moved utilities"
```

---

### Task 2: Create `require-env.ts` helper

**Files:**
- Create: `src/test-helpers/require-env.ts`
- Modify: `src/test-helpers/index.ts`

- [ ] **Step 1: Create `src/test-helpers/require-env.ts`**

```typescript
export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `${name} environment variable is required for integration tests. ` +
        `Set it in .env or export it.`,
    )
  }
  return value
}
```

- [ ] **Step 2: Add export to `src/test-helpers/index.ts`**

```typescript
export { HttpStub } from "./http-stub.js"
export { FetchStub } from "./fetch-stub.js"
export { setupTemporaryDatabaseDirectory } from "./test-utilities.js"
export { requireEnv } from "./require-env.js"
```

- [ ] **Step 3: Commit**

```bash
git add src/test-helpers
git commit -m "feat: add requireEnv helper for fail-loudly integration tests"
```

---

### Task 3: Update consumer imports to use `@/test-helpers`

**Files:**
- Modify: `src/plugins/browser/stub/index.ts`
- Modify: `src/plugins/job-site/arbeitsagentur/index.test.ts`
- Modify: `src/plugins/commute/google-maps/index.test.ts`
- Modify: `src/repositories/vacancy/integration.test.ts`
- Modify: `src/repositories/job-search/integration.test.ts`
- Modify: `src/repositories/applicant/integration.test.ts`
- Modify: `src/repositories/config/integration.test.ts` (if it uses utils)

- [ ] **Step 1: Update `src/plugins/browser/stub/index.ts`**

```typescript
// Current line 3:
import { HttpStub } from "@/utils/index.js"

// Change to:
import { HttpStub } from "@/test-helpers"
```

- [ ] **Step 2: Update `src/plugins/job-site/arbeitsagentur/index.test.ts`**

```typescript
// Current line with:
import { FetchStub } from "@/utils"

// Change to:
import { FetchStub } from "@/test-helpers"
```

- [ ] **Step 3: Update `src/plugins/commute/google-maps/index.test.ts`**

```typescript
// Current line with:
import { FetchStub } from "@/utils"

// Change to:
import { FetchStub } from "@/test-helpers"
```

- [ ] **Step 4: Update repository integration tests**

For each of `src/repositories/vacancy/integration.test.ts`, `src/repositories/job-search/integration.test.ts`, `src/repositories/applicant/integration.test.ts`:

```typescript
// Current line with:
import { Database, setupTemporaryDatabaseDirectory } from "@/utils/index.js"

// Change to:
import { setupTemporaryDatabaseDirectory } from "@/test-helpers"
import { Database } from "@/utils"
```

Note: `Database` stays in `@/utils` — it's a production utility. Only `setupTemporaryDatabaseDirectory` moves to `@/test-helpers`.

- [ ] **Step 5: Check `src/repositories/config/integration.test.ts`**

Read the file. If it imports from `@/utils`, update similarly. If not, skip.

- [ ] **Step 6: Verify unit tests pass**

Run: `npm test`
Expected: All tests pass (no broken imports)

- [ ] **Step 7: Commit**

```bash
git add src
git commit -m "refactor: update consumer imports to use @/test-helpers"
```

---

### Task 4: Remove moved exports from `src/utils`

**Files:**
- Modify: `src/utils/index.ts`
- Delete: `src/utils/http-stub.ts` (already moved, but verify)
- Delete: `src/utils/fetch-stub.ts` (already moved, but verify)
- Delete: `src/utils/test-utilities.ts` (already moved, but verify)

- [ ] **Step 1: Update `src/utils/index.ts`**

Remove these three lines:

```diff
 export { extractJsonLd } from "./json-ld.js"
 export { normalizeAndJoinText, normalizeOptionalText } from "./normalize.js"
 export { isRecord, stringField } from "./reflection.js"
-export { setupTemporaryDatabaseDirectory } from "./test-utilities.js"
 export { Database, Statement } from "./database.js"
-export { HttpStub } from "./http-stub.js"
-export { FetchStub } from "./fetch-stub.js"
 export { semverGreaterThan } from "./semver.js"
```

- [ ] **Step 2: Verify no remaining references to removed exports**

Run: `npm test`
Expected: Any tests importing `HttpStub`, `FetchStub`, or `setupTemporaryDatabaseDirectory` from `@/utils` will fail — this confirms we caught all consumers in Task 3.

If failures occur, update the imports in the failing files.

- [ ] **Step 3: Commit**

```bash
git add src/utils
git commit -m "refactor: remove test-helpers exports from utils"
```

---

### Task 5: Update commute integration test to fail loudly

**Files:**
- Modify: `src/plugins/commute/integration.test.ts`

- [ ] **Step 1: Rewrite `src/plugins/commute/integration.test.ts`**

```typescript
import { describe, test, expect } from "vitest"
import { GoogleMapsCommuteProvider } from "@/plugins/commute"
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

- [ ] **Step 2: Commit**

```bash
git add src/plugins/commute/integration.test.ts
git commit -m "refactor: commute integration test fails loudly without API key"
```

---

### Task 6: Update vitest configs

**Files:**
- Modify: `vitest.config.ts`
- Modify: `vitest.integration.config.ts`

- [ ] **Step 1: Update `vitest.config.ts`**

Add exclude pattern:

```typescript
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "node:path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["{src,scripts,eslint}/**/*.test.{ts,tsx}"],
    exclude: ["**/integration.test.ts"],
    setupFiles: ["./src/ui/test-setup.ts"],
  },
})
```

- [ ] **Step 2: Update `vitest.integration.config.ts`**

Expand include glob:

```typescript
import { defineConfig } from "vitest/config"
import path from "node:path"
import { config as dotenvConfig } from "dotenv"

dotenvConfig()

export default defineConfig({
  plugins: [],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: [
      "src/plugins/**/integration.test.ts",
      "src/repositories/**/integration.test.ts",
    ],
    testTimeout: 60_000,
    env: {
      GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY ?? "",
    },
  },
})
```

- [ ] **Step 3: Verify unit tests don't include integration tests**

Run: `npm test -- --reporter=verbose 2>&1 | grep "integration"`
Expected: No output (integration tests excluded)

- [ ] **Step 4: Verify integration tests run**

Run: `npm run test:integration -- --reporter=verbose 2>&1 | head -20`
Expected: Repository integration tests appear in output

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts vitest.integration.config.ts
git commit -m "refactor: separate unit and integration test configs"
```

---

### Task 7: Update npm scripts in `package.json`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update scripts section**

```json
"scripts": {
    "bump": "npx tsx scripts/bump-version.ts",
    "crawl:download": "npx tsx scripts/crawl-download.ts",
    "fix": "knip --fix && eslint . --fix && prettier . --write",
    "verify": "prettier . --check && knip && jscpd && eslint . && electron-vite build",
    "dev": "electron-vite dev",
    "test": "vitest run",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "electron-vite build && npx playwright test --config=e2e/playwright.electron.config.ts",
    "test:e2e:update": "electron-vite build && npx playwright test --config=e2e/playwright.electron.config.ts --update-snapshots",
    "test:all": "npm test && npm run test:integration && npm run test:e2e",
    "dist:mac:arm64": "electron-vite build && electron-builder --mac --arm64 --publish never",
    "dist:mac:x64": "electron-vite build && electron-builder --mac --x64 --publish never",
    "dist:win": "electron-vite build && electron-builder --win --x64 --publish never",
    "dist:linux": "electron-vite build && electron-builder --linux --x64 --publish never"
  }
```

Changes:
- Rename `test:crawler` → `test:integration`
- Update `test:all` to use `test:integration`

- [ ] **Step 2: Verify passthrough works**

Run: `npm run test:integration -- src/repositories/vacancy/integration.test.ts`
Expected: Test file runs

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "refactor: rename test:crawler to test:integration"
```

---

### Task 8: Update CI workflow

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Rewrite `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  validate:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2

      - uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0
        with:
          node-version: 24
          cache: npm

      - run: npm ci

      - name: Audit dependencies
        run: npm audit --audit-level=high

      - name: Cache Playwright browsers
        id: playwright-cache
        uses: actions/cache@5a3ec84eff668545956fd18022155c47e93e2625 # v4.2.3
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ hashFiles('package-lock.json') }}

      - name: Install Playwright and system dependencies
        if: steps.playwright-cache.outputs.cache-hit != 'true'
        run: npx playwright install --with-deps chromium

      - name: Install Playwright system dependencies (cached)
        if: steps.playwright-cache.outputs.cache-hit == 'true'
        run: npx playwright install-deps chromium

      - name: Verify code quality and build
        run: npm run verify

      - name: Unit tests
        run: npm test

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

      - name: Cache Playwright browsers
        id: playwright-cache
        uses: actions/cache@5a3ec84eff668545956fd18022155c47e93e2625 # v4.2.3
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ hashFiles('package-lock.json') }}

      - name: Install Playwright and system dependencies
        if: steps.playwright-cache.outputs.cache-hit != 'true'
        run: npx playwright install --with-deps chromium

      - name: Install Playwright system dependencies (cached)
        if: steps.playwright-cache.outputs.cache-hit == 'true'
        run: npx playwright install-deps chromium

      - name: Integration tests
        run: npm run test:integration

      - name: E2E tests
        run: xvfb-run --auto-servernum npm run test:e2e
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "refactor: merge integration tests into validate-live CI job with caching"
```

---

### Task 9: Update AGENTS.md

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Update commands table**

Replace the commands section with:

```markdown
## Commands

| Command | Purpose |
|---|---|
| `npm run fix` | Auto-fix lint, formatting, unused deps. **Always run first.** |
| `npm test -- <file>` | Single vitest unit/component test |
| `npm test -- -t "<pattern>"` | Filter vitest by test name |
| `npm run test:integration -- <file>` | Single integration test file |
| `npm run test:integration -- -t "<pattern>"` | Filter integration tests by name |
| `npx playwright test <spec> --config=e2e/playwright.electron.config.ts` | Single E2E spec |
| `npx playwright test <spec> --config=e2e/playwright.visual.config.ts` | Single visual spec |
```

- [ ] **Step 2: Update layer import rules table**

Add `test-helpers` row:

```markdown
| `test-helpers` | (shared — no declared imports) |
```

- [ ] **Step 3: Update key enforced rules**

Fix test file naming:

```markdown
- **File naming:** `*.ts`, `*.tsx` → `kebab-case`. Test suffixes: `.test.ts`, `.test.tsx`, `.test-suite.ts`. Integration test filename: `integration.test.ts`.
```

Update shared modules:

```markdown
- **Shared modules** (`utils`, `ui/components`, `test-helpers`) must be consumed by **at least 2 packages**. If a symbol only has one consumer, move it into that consumer's package — don't leave it in shared.
```

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md
git commit -m "docs: update AGENTS.md with new test commands and conventions"
```

---

### Task 10: Verify and fix

- [ ] **Step 1: Run unit tests**

Run: `npm test`
Expected: All pass

- [ ] **Step 2: Run integration tests**

Run: `npm run test:integration`
Expected: Repository tests pass, plugin tests may skip (no live keys locally)

- [ ] **Step 3: Run lint fix**

Run: `npm run fix`
Expected: No unfixable issues

- [ ] **Step 4: Verify no broken imports**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 5: Final commit if needed**

If `npm run fix` changed anything:

```bash
git add -A
git commit -m "fix: auto-fix lint and formatting"
```
