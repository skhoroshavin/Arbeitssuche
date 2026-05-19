# Harmonize Plugin Structure

## Problem

Plugins under `src/plugins/` follow an inconsistent pattern: some define their interfaces directly in `index.ts` (cipher, kvstore) while others extract them to a separate `types.ts`. AGENTS.md prescribes `types.ts` as the standard, but for small interfaces this adds unnecessary indirection. The "right" pattern — short interfaces in `index.ts` — is already in use and should be the default.

Additionally, `job-site/types.ts` mixes truly public types with internal JSON-LD parsing types (`JobPostingJsonLd`, `JobPostingAddress`), but that extraction is out of scope for this change.

## Design

### 1. Update AGENTS.md

Replace:

> **Public surfaces:** Cross-module imports must go through `index.ts`. `types.ts` is an internal contract file for repositories and plugins — do not import it cross-module.

With:

> **Public surfaces:** Cross-module imports must go through `index.ts`. Prefer defining interfaces directly in `index.ts`; extract to a separate file only when the type surface is large enough to hurt readability.

### 2. Inline and delete `types.ts` files

| Plugin | Action |
|---|---|
| **fetch** | Inline `Fetch` type alias into `index.ts`, delete `types.ts` |
| **pdf-renderer** | Inline `PdfRenderer` interface into `index.ts`, delete `types.ts` |
| **browser** | Inline `Browser`, `Page`, `OpenPageOptions` into `index.ts`, delete `types.ts` |
| **commute** | Inline all interfaces into `index.ts`, delete `types.ts` |
| **llm** | Inline all interfaces into `index.ts`, delete `types.ts` |
| **job-site** | Inline public types into `index.ts`; keep `types.ts` with only `JobPostingJsonLd` + `JobPostingAddress` (internal parsing types, to be reorganized separately) |
| **cipher** | No change (already correct) |
| **kvstore** | No change (already correct) |

Each inlined interface becomes a non-exported or re-exported symbol in `index.ts`, matching the pattern cipher/kvstore already use. Only types that are part of the cross-module public surface get `export`; internal types stay non-exported.

### 3. No other structural changes

No merging, renaming, or restructuring beyond `types.ts` inlining. The organic variation in subdirectory naming (electron/stub vs. google-maps/stub, etc.) reflects real backend differences and is appropriate.

## Out of Scope

- Extracting `JobPostingJsonLd` / `JobPostingAddress` from `job-site/types.ts` into crawler-internal modules
- Simplifying or merging cipher/kvstore (they are "done" and already follow the right pattern)
- Any changes to plugin subdirectory layout or factory patterns