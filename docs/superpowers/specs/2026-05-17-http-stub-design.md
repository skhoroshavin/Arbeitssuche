# HttpStub — URL Router for Test Stubs

**Date:** 2026-05-17
**Status:** Design approved

## Problem

`findStubMatch` in `src/utils/test-utilities.ts` is a generic string lookup function with a confusing interface:

- Name `findStubMatch` ties it to stubs but doesn't describe matching strategy
- Parameters `(entries, value)` don't convey which is pattern vs. target
- Matching direction (`value.includes(key)`) is non-obvious
- No JSDoc, no tests
- Both `StubBrowser` and `StubFetch` duplicate URL tracking (`visitedUrls` / `requestedUrls`)
- The google-maps commute test has its own inline `createStubFetch` — a code smell suggesting the shared stub isn't flexible enough

This was explicitly deferred in the [utils cleanup spec](./2026-05-16-utils-cleanup-design.md).

## Design

### `HttpStub<T>` class

A generic URL router class that replaces `findStubMatch` and consolidates URL tracking.

```ts
// src/utils/http-stub.ts

class HttpStub<T> {
  constructor()

  /** Register a URL pattern and its response. Returns this for chaining. */
  set(urlPattern: string, response: T): this

  /**
   * Find matching entry for a URL.
   * Exact key match first, then first key that is a substring of the URL.
   * Returns undefined when no pattern matches.
   */
  get(url: string): T | undefined

  /** URLs passed to get(), in order. */
  readonly requestedUrls: string[]
}
```

**Matching strategy** (unchanged from current `findStubMatch`):
1. Exact key match: if `url` exists as a property name in the entries, return it.
2. Substring fallback: iterate entries, return the first where `url.includes(urlPattern)`.
3. No match: return `undefined`.

**Builder pattern** for test setup:

```ts
const stub = new HttpStub<string>()
  .set("search", "<html>...</html>")
  .set("detail", "<html>...</html>")

stub.get("/api/search?q=foo") // → "<html>...</html>"
stub.requestedUrls             // → ["/api/search?q=foo"]
```

### Stub wrapper changes

#### `StubBrowser`

- Takes `HttpStub<string>` instead of `Record<string, string>`
- Wraps `get()` output into `Page` objects (returns empty string on no match)
- Directory loading (`loadData`) becomes a separate export: `createStubBrowserFromDirectory(path)`
- `visitedUrls` → delegates to `httpStub.requestedUrls`

#### `StubFetch`

- Takes `HttpStub<StubRoute>` instead of `Record<string, StubRoute>`
- Wraps `get()` output into `Response` objects (returns 404 on no match)
- `requestedUrls` → delegates to `httpStub.requestedUrls`

### What goes away

| Removed | Reason |
|---|---|
| `findStubMatch` from `test-utilities.ts` | Replaced by `HttpStub.get()` |
| `findStubMatch` from `utils/index.ts` exports | No longer public |
| Inline `createStubFetch` in google-maps commute test | Replaced by shared `createStubFetch` |
| `visitedUrls` array in `StubBrowserImpl` | Delegated to `HttpStub.requestedUrls` |
| `requestedUrls` array in `createStubFetch` | Delegated to `HttpStub.requestedUrls` |

### Tests

- **`http-stub.test.ts`**: tests for exact match, substring match, no match, `requestedUrls` ordering, builder chaining with `set()`
- Existing stub tests (`arbeitsagentur`, `xing`, etc.) continue to pass — no behavioral change

### File changes summary

| File | Change |
|---|---|
| `src/utils/http-stub.ts` | **New** — `HttpStub<T>` class |
| `src/utils/http-stub.test.ts` | **New** — test suite |
| `src/utils/test-utilities.ts` | Remove `findStubMatch` |
| `src/utils/index.ts` | Add `HttpStub` export, remove `findStubMatch` |
| `src/plugins/browser/stub/index.ts` | Use `HttpStub<string>` internally |
| `src/plugins/fetch/stub/index.ts` | Use `HttpStub<StubRoute>` internally |
| `src/plugins/commute/google-maps/index.test.ts` | Replace inline `createStubFetch` with shared `createStubFetch` |

## Out of scope

- Changing the matching algorithm (substring match remains)
- Removing URL tracking from stubs
- Changing `StubRoute` type or `StubBrowser` directory loading behavior
