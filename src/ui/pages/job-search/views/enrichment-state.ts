export function deriveEnrichmentState(
  enriched: boolean,
  enrichmentDirty: boolean,
  isEnriching: boolean,
): EnrichmentState {
  if (enrichmentDirty && isEnriching) return "pending"
  if (enriched && enrichmentDirty) return "stale"
  if (enriched) return "enriched"
  return "plain"
}

export type EnrichmentState = "plain" | "pending" | "stale" | "enriched"
