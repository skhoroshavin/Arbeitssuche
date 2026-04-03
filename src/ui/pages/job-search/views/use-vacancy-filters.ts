import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import type { VacancyWithStatus } from "@/ui/data";
import { isSortKey, type SortKey } from "./filter-bar";
import { compareVacancies } from "./vacancy-utilities";

export function useVacancyFilters() {
  const [searchParameters, setSearchParameters] = useSearchParams();
  const filter = searchParameters.get("filter") ?? "all";
  const rawSort = searchParameters.get("sort") ?? "date";
  const sortBy = isSortKey(rawSort) ? rawSort : "date";

  const setFilter = useCallback(
    (value: string) => {
      setSearchParameters(
        (previous) => {
          if (value === "all") previous.delete("filter");
          else previous.set("filter", value);
          return previous;
        },
        { replace: true },
      );
    },
    [setSearchParameters],
  );

  const setSortBy = useCallback(
    (value: SortKey) => {
      setSearchParameters(
        (previous) => {
          if (value === "date") previous.delete("sort");
          else previous.set("sort", value);
          return previous;
        },
        { replace: true },
      );
    },
    [setSearchParameters],
  );

  return { filter, sortBy, setFilter, setSortBy };
}

export function useFilteredVacancies(
  vacancies: VacancyWithStatus[],
  filter: string,
  sortBy: SortKey,
) {
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: vacancies.length };
    for (const v of vacancies) {
      counts[v.status] = (counts[v.status] ?? 0) + 1;
    }
    return counts;
  }, [vacancies]);

  const filtered = useMemo(() => {
    const list =
      filter === "all"
        ? vacancies.filter((v) => v.status !== "not-interested")
        : vacancies.filter((v) => v.status === filter);
    return list.toSorted((a, b) => compareVacancies(sortBy, a, b));
  }, [vacancies, filter, sortBy]);

  return { statusCounts, filtered };
}
