import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams, Link, useSearchParams } from "react-router";
import { useInvalidate } from "@/ui/hooks";
import {
  useJobSearchVacancies,
  type VacancyWithStatus,
} from "@/ui/data/job-searches";
import {
  useStartJobSearchCrawl,
  useAbortJobSearchCrawl,
} from "@/ui/data/job-search-crawl";
import { useJobProgress } from "@/ui/pages/job-search/hooks/job-progress";
import {
  Card,
  SectionHeader,
  PageHeader,
  EmptyState,
  Loading,
} from "@/ui/components";
import { Markdown } from "@/ui/pages/job-search/components/Markdown";
import { ProgressLog } from "@/ui/pages/job-search/components/ProgressLog";
import { StatusBadge } from "@/ui/pages/job-search/components/StatusBadge";
import {
  STATUS_LABELS,
  MATCH_SCORE_LABELS,
  MATCH_SCORE_ORDER,
} from "@/ui/constants";
import type { CommuteInfo } from "@/models/vacancy/types";

const FILTER_ORDER = [
  "all",
  "new",
  "gone",
  "renewed",
  "applied",
  "ignored",
  "invited",
  "interviewed",
  "offered",
  "rejected",
  "not-interested",
];

type SortKey = "date" | "company" | "commute" | "score";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "date", label: "Datum" },
  { key: "company", label: "Unternehmen" },
  { key: "commute", label: "Fahrtzeit" },
  { key: "score", label: "Bewertung" },
];

function isSortKey(s: string): s is SortKey {
  return SORT_OPTIONS.some((o) => o.key === s);
}

function commuteLabel(
  commute?: Record<string, CommuteInfo>,
): string | undefined {
  if (!commute) return undefined;
  const first = Object.values(commute)[0];
  return first ? `${first.durations.morning} (${first.distance})` : undefined;
}

function latestActivityDate(v: VacancyWithStatus): string {
  return v.activityHistory.length > 0
    ? v.activityHistory[v.activityHistory.length - 1].date
    : "";
}

function commuteMinutes(commute?: Record<string, CommuteInfo>): number {
  if (!commute) return Infinity;
  const first = Object.values(commute)[0];
  if (!first) return Infinity;
  const t = first.durations.morning;
  const hours = t.match(/(\d+)\s*hour/)?.[1];
  const mins = t.match(/(\d+)\s*min/)?.[1];
  return (hours ? parseInt(hours) * 60 : 0) + (mins ? parseInt(mins) : 0);
}

export default function JobSearchVacancyList() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useJobSearchVacancies(id!);
  const invalidate = useInvalidate();
  const startCrawl = useStartJobSearchCrawl(id!);
  const abortCrawl = useAbortJobSearchCrawl(id!);
  const [progressJobId, setProgressJobId] = useState<string>();
  const {
    events: crawlEvents,
    done: crawlDone,
    reset: resetCrawl,
    vacancyUpdateCount,
  } = useJobProgress(progressJobId);

  useEffect(() => {
    if (vacancyUpdateCount > 0) {
      invalidate(["job-search-vacancies", id!]);
    }
  }, [vacancyUpdateCount, invalidate, id]);

  const handleStartCrawl = () => {
    resetCrawl();
    startCrawl.mutate(undefined, {
      onSuccess: () => {
        setProgressJobId(id!);
      },
    });
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get("filter") ?? "all";
  const rawSort = searchParams.get("sort") ?? "date";
  const sortBy = isSortKey(rawSort) ? rawSort : "date";

  const setFilter = useCallback(
    (value: string) => {
      setSearchParams(
        (prev) => {
          if (value === "all") prev.delete("filter");
          else prev.set("filter", value);
          return prev;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setSortBy = useCallback(
    (value: SortKey) => {
      setSearchParams(
        (prev) => {
          if (value === "date") prev.delete("sort");
          else prev.set("sort", value);
          return prev;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const vacancies = data?.vacancies ?? [];

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
    return [...list].sort((a, b) => {
      if (sortBy === "company") return a.company.localeCompare(b.company);
      if (sortBy === "commute") {
        return commuteMinutes(a.commute) - commuteMinutes(b.commute);
      }
      if (sortBy === "score") {
        const sa = a.matchScore ? MATCH_SCORE_ORDER.indexOf(a.matchScore) : 99;
        const sb = b.matchScore ? MATCH_SCORE_ORDER.indexOf(b.matchScore) : 99;
        return sa - sb;
      }
      // Sort by most recent activity date
      const dateA = latestActivityDate(a);
      const dateB = latestActivityDate(b);
      return dateB.localeCompare(dateA);
    });
  }, [vacancies, filter, sortBy]);

  const isCrawling = !!(progressJobId && !crawlDone);

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-4">
      <PageHeader
        title={
          <>
            Stellen{" "}
            <span className="text-gray-400 dark:text-gray-500 font-normal text-lg">
              ({data?.totalCount ?? 0})
            </span>
          </>
        }
        actions={
          <button
            onClick={handleStartCrawl}
            disabled={isCrawling}
            className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            Aktualisieren
          </button>
        }
      />

      {progressJobId && crawlEvents.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <SectionHeader>Crawl-Fortschritt</SectionHeader>
            {!crawlDone && (
              <button
                onClick={() => abortCrawl.mutate()}
                className="px-3 py-1 text-sm text-red-600 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Abbrechen
              </button>
            )}
            {crawlDone && (
              <span className="text-sm text-green-600 font-medium">Fertig</span>
            )}
          </div>
          <ProgressLog events={crawlEvents} scrollable />
          {crawlDone && (
            <button
              onClick={() => {
                setProgressJobId(undefined);
                invalidate(["job-search-vacancies", id!]);
              }}
              className="mt-3 text-sm text-blue-600 hover:underline"
            >
              Schließen
            </button>
          )}
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400 dark:text-gray-500 mr-1">
            Sortierung:
          </span>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                sortBy === opt.key
                  ? "bg-zinc-700 text-white dark:bg-zinc-300 dark:text-gray-900"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTER_ORDER.map((status) => {
            const count = statusCounts[status] ?? 0;
            if (status !== "all" && count === 0) return null;
            return (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1 rounded-full text-sm border ${
                  filter === status
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                }`}
              >
                {STATUS_LABELS[status] ?? status} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((v) => (
          <VacancyCard key={v.hash} vacancy={v} jobSearchId={id!} />
        ))}
        {filtered.length === 0 && (
          <EmptyState message="Keine Stellen entsprechen dem Filter." />
        )}
      </div>
    </div>
  );
}

function VacancyCard({
  vacancy: v,
  jobSearchId,
}: {
  vacancy: VacancyWithStatus;
  jobSearchId: string;
}) {
  const commute = commuteLabel(v.commute);
  const latestDate = latestActivityDate(v) || undefined;

  return (
    <Link
      to={`/job-searches/${jobSearchId}/vacancies/${v.hash}`}
      className="block bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-gray-400 dark:text-gray-500">
              {v.hash}
            </span>
            <StatusBadge status={v.status}>
              {STATUS_LABELS[v.status] ?? v.status}
            </StatusBadge>
            {v.matchScore && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {MATCH_SCORE_LABELS[v.matchScore] ?? v.matchScore}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
            {v.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {v.company}
          </p>
          {v.sources.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {v.sources.map((s) => (
                <span
                  key={s.site}
                  role="link"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(s.url, "_blank");
                  }}
                  className="inline-block px-1.5 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer"
                >
                  {s.site}
                </span>
              ))}
            </div>
          )}
          {v.addresses.length > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {v.addresses.join(" | ")}
            </p>
          )}
        </div>
        <div className="text-right text-xs text-gray-400 dark:text-gray-500 ml-4 flex-shrink-0">
          {commute && (
            <div className="text-gray-600 dark:text-gray-400">{commute}</div>
          )}
          {latestDate && <div>{new Date(latestDate).toLocaleDateString()}</div>}
        </div>
      </div>
      {v.summary && (
        <div className="mt-2 line-clamp-2">
          <Markdown className="text-sm text-gray-500 dark:text-gray-400">
            {v.summary}
          </Markdown>
        </div>
      )}
    </Link>
  );
}
