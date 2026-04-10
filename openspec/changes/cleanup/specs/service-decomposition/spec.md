## MODIFIED Requirements

### Requirement: JobSearchCriteria domain type in models

A `JobSearchCriteria` type SHALL be defined in `models/job-search/types.ts` containing `location`, `query`, `radiusKm`, `mode`, and `limit`. The crawler SHALL derive the job-site plugin `SearchCriteria` from `JobSearchCriteria` internally before calling a job site. The plugin-level `SearchCriteria` contract SHALL contain `location`, `query`, `radiusKm`, and `mode` as fully resolved fields and SHALL NOT include crawler-only limit information.

#### Scenario: Crawler derives plugin SearchCriteria from JobSearchCriteria
- **WHEN** the site-crawler calls `site.getVacancyList()`
- **THEN** it SHALL pass a `SearchCriteria` derived from `JobSearchCriteria`
- **AND** the derived plugin criteria SHALL exclude `limit`, which remains a crawler-level concern

#### Scenario: Plugin receives resolved radius
- **WHEN** a job-site plugin receives `SearchCriteria`
- **THEN** `radiusKm` SHALL already be present as a resolved numeric value
- **AND** the plugin implementation SHALL NOT need a fallback for a missing crawler-provided radius
