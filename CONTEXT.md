# Arbeitssuche

Language for the job-search domain in this repository.

## Language

**Vacancy lifecycle**:
The progression of a Vacancy from first discovery through enrichment, user activity, disappearance, and cover-letter work. It is the domain concept that concentrates how a Vacancy changes over time.
_Avoid_: Vacancy service, vacancy workflow, vacancy pipeline

**Vacancy discovery**:
Normalized data captured when a job site first yields or re-yields a Vacancy. It describes what the crawler learned before the Vacancy module merges it into existing state.
_Avoid_: Scrape result, raw vacancy details, site payload

**Vacancy enrichment**:
Normalized analysis data applied to a Vacancy after discovery, such as assessment, contact extraction, or commute-related updates. It describes a change set for the Vacancy module, not the adapter that produced it.
_Avoid_: Enrichment service result, LLM response, analysis payload
