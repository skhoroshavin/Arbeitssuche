# Utils Cleanup & Flattening

**Date:** 2026-05-16
**Status:** Design approved

## Problem

`src/utils/` has accumulated unnecessary complexity:
- A `node/` subdirectory that splits utils into "browser-safe" and "node-only", but the split is pointless — `src/ui/` never imports from utils, everything runs in Node context.
- `parseRow` is a standalone function that should be a method on `Statement`.
- `extractAddressFromJsonLd` lives in utils but belongs in the crawlers that use it.
- `normalizeMailtoHref` and `normalizeContact` each have a single consumer, violating the `no-false-sharing` rule for `shared: true` utils.
- File `text.ts` is poorly named.
- `stub-utilities.ts` and `test-database-utilities.ts` are two files for test infrastructure that should be one.
- Test gaps: normalize functions tested in the wrong test file, `database.test.ts` has only one trivial test, `findStubMatch` is untested.

## Design

### 1. Directory flattening

Delete `src/utils/node/`. All utils live directly in `src/utils/`. Update all imports from `@/utils/node/index.js` → `@/utils/index.js`.

### 2. File-by-file changes

#### `text.ts` → `normalize.ts`

- **Rename** to `normalize.ts`
- **Keep**: `normalizeOptionalText`, `joinNormalizedText`
- **Remove**: `normalizeMailtoHref` — move to `src/plugins/job-site/xing/`
- **Remove**: `normalizeContact` — move to `src/plugins/job-site/zalando/`

#### `json-ld.ts`

- **Keep**: `extractJsonLd`
- **Remove**: `extractAddressFromJsonLd` — inline ~6 lines into DM and Xing crawlers
- **Remove**: internal import of `joinNormalizedText` (no longer needed here)

#### `database.ts`

- Add a **`Statement` wrapper class** that wraps `StatementSync` from `node:sqlite`:
  - `getJsonData(...params): unknown` — replaces the `parseRow(stmt.get(...))` pattern; returns the parsed `data` column, or `undefined`
  - Proxies `get`, `all`, `run` to the inner `StatementSync`
- `Database.prepare()` now returns `Statement` instead of raw `StatementSync`
- Remove standalone `parseRow` function
- Update all repository call-sites: `parseRow(this.loadStmt.get(id))` → `this.loadStmt.getJsonData(id)`

#### `id.ts`

- Move from `src/utils/node/id.ts` to `src/utils/id.ts`
- No interface changes

#### `test-utils.ts` (new, replaces `stub-utilities.ts` and `test-database-utilities.ts`)

- Merge `findStubMatch` and `setupTemporaryDatabaseDirectory` into one file

#### `index.ts`

- Updated re-exports for the new flat structure

### 3. Consumers to update

| Change | Consumers affected |
|---|---|
| `@/utils/node/*` → `@/utils/*` | `app/main`, `app/composition/create-service-context`, all SQLite repository files, all repository stub files, all repository test files |
| Inline `extractAddressFromJsonLd` | `plugins/job-site/dm/`, `plugins/job-site/xing/` |
| Inline `normalizeMailtoHref` | `plugins/job-site/xing/` |
| Inline `normalizeContact` | `plugins/job-site/zalando/` |
| `parseRow()` → `stmt.getJsonData()` | `repositories/applicant/sqlite/`, `repositories/job-search/sqlite/`, `repositories/vacancy/sqlite/` |
| Import from combined `test-utils` | `plugins/browser/stub/`, `plugins/fetch/stub/`, repository test files using `setupTemporaryDatabaseDirectory` |

### 4. Tests

- **`normalize.test.ts`** (new): extract normalize tests currently living in `json-ld.test.ts`
- **`database.test.ts`**: real SQLite integration tests covering `Database.open`, `prepare`, `exec`, `transaction`, `Statement.getJsonData`, `Statement.get`, `Statement.all`, `Statement.run`, `close`
- **`id.test.ts`**: moved to `src/utils/`, content unchanged
- **`test-utils.test.ts`**: merged from `test-database-utilities.test.ts`; `findStubMatch` tests explicitly deferred (will be addressed in separate refactor)

### 5. Resulting file tree

```
src/utils/
  index.ts
  normalize.ts
  normalize.test.ts
  json-ld.ts
  json-ld.test.ts
  database.ts
  database.test.ts
  id.ts
  id.test.ts
  test-utils.ts
  test-utils.test.ts
```

### 6. ESLint config

No changes needed — `eslint.config.ts` already targets `src/utils/*.ts` with the 80-line limit.

## Out of scope

- Refactoring `findStubMatch` interface — deferred to a separate design
- Changing `id.ts` interface — kept as-is for now
