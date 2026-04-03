import { Link } from "react-router";
import { Markdown } from "@/ui/components";
import { StatusBadge } from "@/ui/pages/job-search/components";
import { MATCH_SCORE_LABELS, STATUS_LABELS } from "@/models/vacancy/index";
import type { VacancyWithStatus } from "@/ui/data";
import { getCommuteSummary, getLatestActivityDate } from "./vacancy-utilities";

export function VacancyCard({
  vacancy: v,
  jobSearchId,
  searchString,
}: {
  vacancy: VacancyWithStatus;
  jobSearchId: string;
  searchString: string;
}) {
  return (
    <Link
      to={`/job-searches/${jobSearchId}/vacancies/${v.hash}`}
      state={{ vacancyListSearch: searchString }}
      className="block bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-gray-400 dark:text-gray-500">
              {v.hash}
            </span>
            <StatusBadge status={v.status}>
              {STATUS_LABELS[v.status]}
            </StatusBadge>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {MATCH_SCORE_LABELS[v.matchScore]}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
            {v.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {v.company}
          </p>
          <VacancyCardSources sources={v.sources} />
          {v.addresses.length > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {v.addresses.join(" | ")}
            </p>
          )}
        </div>
        <VacancyCardMeta vacancy={v} />
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

function VacancyCardSources({
  sources,
}: {
  sources: { site: string; url: string }[];
}) {
  if (sources.length === 0) return;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {sources.map((s) => (
        <span
          key={s.site}
          role="link"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            window.open(s.url, "_blank");
          }}
          className="inline-block px-1.5 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer"
        >
          {s.site}
        </span>
      ))}
    </div>
  );
}

function VacancyCardMeta({ vacancy }: { vacancy: VacancyWithStatus }) {
  const commute = getCommuteSummary(vacancy);
  const latestDate = getLatestActivityDate(vacancy);
  return (
    <div className="text-right text-xs text-gray-400 dark:text-gray-500 ml-4 flex-shrink-0">
      {commute && (
        <div className="text-gray-600 dark:text-gray-400">{commute}</div>
      )}
      {latestDate && <div>{new Date(latestDate).toLocaleDateString()}</div>}
    </div>
  );
}
