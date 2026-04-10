## 1. Tighten crawler and plugin contracts

- [ ] 1.1 Update the crawler-to-plugin `SearchCriteria` types so plugin implementations receive a resolved `radiusKm` and no crawler-only limit field.
- [ ] 1.2 Remove redundant radius fallback logic from affected job-site plugins and adjust related tests and stubs to match the tighter contract.

## 2. Consolidate shared normalization

- [ ] 2.1 Extract or extend shared normalization helpers for optional text, address assembly, and empty-contact suppression in `src/utils`.
- [ ] 2.2 Replace duplicated normalization logic in job-site plugins and adjacent helpers with the shared utilities.

## 3. Narrow UI and model boundary types

- [ ] 3.1 Keep applicant and job-search form serialization in UI hooks, and narrow model-layer formatters/helpers so they only accept domain-valid shapes.
- [ ] 3.2 Update list-view and query adapter hooks to expose stable empty collection defaults where pages currently guard against `undefined` collection shapes.
- [ ] 3.3 Remove redundant loaded-state and nullish checks that become unnecessary after the boundary types are tightened.

## 4. Verify cleanup behavior

- [ ] 4.1 Update or add focused tests covering the tighter search criteria contract and shared normalization behavior.
- [ ] 4.2 Run the relevant test suite and repository verification commands to confirm the cleanup is behavior-preserving.
