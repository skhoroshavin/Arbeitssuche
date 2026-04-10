## Why

The codebase currently carries repeated nullish guards, duplicated normalization helpers, and broad type unions that force defensive checks in services, plugins, and UI hooks. Cleaning up those boundaries now will make future feature work safer, reduce drift between layers, and remove branches that exist only because internal types are looser than the actual runtime data.

## What Changes

- Tighten internal search and normalization contracts so downstream code receives resolved values instead of optional fields that are always populated in practice.
- Standardize optional-text, address, and empty-contact normalization through shared helpers instead of site-local reimplementations.
- Narrow applicant and job-search UI form and view-model types so pages and formatters stop carrying domain-invalid unions and redundant loaded-state checks.
- Update existing crawler/service decomposition requirements where plugin search criteria are expected to be fully resolved before they reach job-site implementations.

## Capabilities

### New Capabilities
- `normalized-data-contracts`: Defines resolved internal data contracts for normalization helpers, UI view models, and domain formatting so internal callers do not need redundant null or union handling.

### Modified Capabilities
- `service-decomposition`: Tighten the crawler-to-plugin search criteria contract so job-site plugins receive fully resolved search criteria without optional fields that are always populated by the crawler.

## Impact

- Affected code: `src/plugins/job-site`, `src/services/site-crawler`, `src/utils`, `src/models/applicant`, `src/ui/data`, and applicant/job-search UI form hooks.
- APIs: internal TypeScript contracts only; no external API or persisted schema changes are intended.
- Dependencies and systems: OpenSpec specs for service decomposition and new normalization contracts, plus existing linting and architecture rules that govern shared helper placement.
