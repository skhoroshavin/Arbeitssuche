export type EnrichmentState = "plain" | "pending" | "stale" | "enriched"

export function deriveEnrichmentState(
  enriched: boolean,
  enrichmentDirty: boolean,
): EnrichmentState {
  if (!enriched && !enrichmentDirty) return "plain"
  if (!enriched && enrichmentDirty) return "pending"
  if (enriched && enrichmentDirty) return "stale"
  return "enriched"
}
