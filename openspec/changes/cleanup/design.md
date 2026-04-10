## Context

This cleanup spans multiple internal boundaries where the code currently widens types too early and then compensates with repeated nullish guards. The main hotspots are crawler-to-plugin search criteria, duplicated optional-text and address normalization across job-site plugins, and UI hooks or formatters that accept broader unions than the domain model actually allows.

The change is intentionally non-behavioral at the product level. The goal is to make the existing behavior easier to express by moving normalization to boundary adapters and keeping internal consumers on resolved shapes.

## Goals / Non-Goals

**Goals:**
- Define a single resolved contract for search criteria passed from crawler code into job-site plugins.
- Centralize reusable normalization for optional text, address assembly, and empty contact suppression.
- Keep form serialization and query fallback logic at the UI boundary so domain formatters and page components consume narrower types.
- Remove redundant `undefined` branches that exist only because internal types are broader than the runtime state.

**Non-Goals:**
- Changing persisted data formats, IPC payload shapes, or user-visible vacancy/applicant behavior.
- Reworking every nullable field in the model layer; this change targets places where runtime invariants are already stronger than the declared types.
- Introducing a new architecture layer or large generic abstraction framework for normalization.

## Decisions

### Tighten types at boundary adapters, not inside downstream consumers

The crawler, UI view-model hooks, and form mapping functions will remain responsible for converting partial or optional inputs into resolved values. Services, plugins, and formatters downstream of those boundaries will then consume required fields wherever the upstream adapter already guarantees them.

This is preferred over leaving broad types in place and relying on localized `??` or `if (!data)` checks because the latter duplicates the same runtime knowledge throughout the codebase.

Alternative considered: keep existing broad types and only delete obviously redundant checks. Rejected because the checks would reappear whenever new call sites are added.

### Reuse shared normalization helpers instead of plugin-local implementations

Optional text trimming, rejection of sentinel empty values such as `"null"`, address-part joining, and empty-contact suppression will be expressed through shared helpers in `src/utils`. Site-specific extraction code will stay site-specific, but normalization after extraction will be standardized.

This is preferred over per-plugin helper copies because the current duplication already diverges slightly in semantics and makes it harder to change normalization rules consistently.

Alternative considered: keep helper code local to avoid a shared utility. Rejected because the behavior is already cross-cutting and already used in multiple plugins.

### Keep domain helpers on domain types only

Formatting helpers in `models` should only accept domain-valid shapes, while form hooks in `ui/pages/*/hooks` should own conversion between textarea strings and string arrays. Query list hooks in `ui/data` should expose stable empty collections where the view expects collection access.

This is preferred over allowing domain helpers to accept both form and domain shapes because mixed unions hide layering mistakes and create defensive branches that should not exist once the boundary mapping is correct.

Alternative considered: broaden domain helpers to handle both forms and domain models. Rejected because it couples the model layer to UI-specific state representations.

## Risks / Trade-offs

- [Risk] Tightening internal types may surface compile errors in tests and stubs that were relying on broader shapes. → Mitigation: update tests and stubs alongside production types so each boundary still has a clear adapter.
- [Risk] Moving helpers into `src/utils` can conflict with shared-module consumption rules. → Mitigation: only extract helpers that have multiple real consumers and keep site-specific parsing logic local.
- [Risk] Some nullish checks may be protecting future edge cases rather than redundant states. → Mitigation: only remove checks when the upstream type and construction path make the value mandatory, and leave external-input guards in place.
- [Trade-off] The code will rely more heavily on explicit normalization functions at boundaries. → Mitigation: keep helpers small and colocated near the boundary that owns the conversion.
