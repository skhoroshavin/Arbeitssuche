## Why

Creating a job search currently persists it immediately and then asks the user to configure it across route-based pages, which makes first-time setup feel fragmented and makes cancellation awkward. A draft-backed creation wizard is needed now to make job-search setup feel deliberate, recoverable, and compatible with a future applicant creation wizard built on the same view pattern.

## What Changes

- Add a multi-step job search creation wizard that opens from the applicant overview instead of creating a job search immediately.
- Add applicant-scoped job search drafts so an unfinished wizard can autosave progress, survive unexpected close, and be resumed or discarded the next time a new search is started.
- Add wizard support for generating a cover letter from draft job-search data before the job search is finalized.
- Finalize completed drafts into normal job searches, open the vacancy list as the default working view, and start the initial update automatically.
- Introduce reusable job-search view artifacts that can be hosted by both the wizard flow and the normal job-search pages.

## Capabilities

### New Capabilities
- `job-search-creation-wizard`: Covers the multi-step create flow, step navigation, cancel/keep/discard decisions, finalization into a real job search, and the post-finish transition into the vacancy list.
- `job-search-drafts`: Covers applicant-scoped draft persistence, draft resume/discard behavior, autosave to draft during wizard editing, and draft-based cover-letter generation.

### Modified Capabilities
- None.

## Impact

- Affected UI areas: applicant overview create flow, job-search pages, and a new reusable `ui/views` layer for job-search editing views.
- Affected persistence and app layers: new job-search draft repository and IPC/service flows for draft load/save/discard/finalize and draft cover-letter generation.
- Affected navigation behavior: the default persisted job-search experience shifts to the vacancy list after wizard completion.
