import { useState } from "react";
import { useParams, Link, useLocation } from "react-router";
import {
  useJobSearchVacancy,
  useAddActivity,
  useVacancyCoverLetter,
  useUpdateVacancyCoverLetter,
  useGenerateVacancyCoverLetter,
} from "@/ui/data";
import type { VacancyWithStatus } from "@/ui/data";
import { useApiKeyStatus } from "@/ui/data";
import { Card, SectionHeader, Loading, ArrowLeftIcon } from "@/ui/components";
import { CoverLetterEditor } from "@/ui/pages/job-search/components";
import { Markdown } from "@/ui/components";
import { StatusBadge } from "@/ui/pages/job-search/components";
import { useLayoutConfig } from "@/ui/layout";
import type { ActivityType } from "@/models/vacancy/types";
import {
  MATCH_SCORE_LABELS,
  STATUS_LABELS,
  TRANSITIONS,
} from "@/models/vacancy/index";
import { VacancyCommuteSection } from "./vacancy-commute-section";
import { VacancyContactSection } from "./vacancy-contact-section";
import { VacancyActivityForm } from "./vacancy-activity-form";
import { ActivityHistory } from "./activity-history";

export default function JobSearchVacancyDetail() {
  const { id = "", hash = "" } = useParams<{ id: string; hash: string }>();
  const backSearch = useBackSearch();
  const detail = useVacancyDetailData(id, hash);
  const { hasLlmKey } = useApiKeyStatus();
  const activity = useActivityRecorder(id, hash);

  const title = detail.title;

  useLayoutConfig(
    () => ({
      sidebarTitle: "Stelle",
      sidebarNavItems: [],
      headerTitle: title,
      headerBackLink: (
        <Link
          to={`/job-searches/${id}/vacancies${backSearch}`}
          aria-label="Zurück zu Stellen"
        >
          <ArrowLeftIcon />
        </Link>
      ),
    }),
    [title, id, backSearch],
  );

  if (detail.isLoading) return <Loading />;
  if (!detail.data) return <div>Stelle nicht gefunden</div>;

  const { data } = detail;
  const status = data.status;
  const allowedActions = TRANSITIONS[status];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm text-gray-400 dark:text-gray-500">
          {hash}
        </span>
        <StatusBadge status={status}>{STATUS_LABELS[status]}</StatusBadge>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {MATCH_SCORE_LABELS[data.matchScore]}
        </span>
      </div>

      <VacancyInfoCard data={data} />

      {/* Anschreiben */}
      <Card className="p-4 space-y-3">
        <SectionHeader>Anschreiben</SectionHeader>
        <CoverLetterEditor
          coverLetterQuery={detail.coverLetterQuery}
          updateMutation={detail.updateCoverLetter}
          generateMutation={detail.generateCoverLetter}
          llmAvailable={hasLlmKey}
        />
      </Card>

      {/* Actions */}
      <VacancyActivityForm
        allowedActions={allowedActions}
        eventForm={activity.eventForm}
        onSelectAction={activity.setEventForm}
        onConfirm={activity.handleRecordActivity}
      />

      <ActivityHistory activities={data.activityHistory} />
    </div>
  );
}

function useBackSearch(): string {
  const location = useLocation();
  const state: unknown = location.state;
  if (
    typeof state === "object" &&
    state !== null &&
    "vacancyListSearch" in state &&
    typeof state.vacancyListSearch === "string"
  ) {
    return state.vacancyListSearch;
  }
  return "";
}

function VacancyInfoCard({
  data,
}: {
  data: Pick<
    VacancyWithStatus,
    | "title"
    | "company"
    | "addresses"
    | "sources"
    | "commute"
    | "contact"
    | "summary"
    | "description"
  >;
}) {
  return (
    <Card className="p-5">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        {data.title}
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mt-1">{data.company}</p>

      {data.addresses.length > 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {data.addresses.join(" | ")}
        </p>
      )}

      {data.sources.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {data.sources.map((source, index) => (
            <a
              key={index}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              {source.site}
            </a>
          ))}
        </div>
      )}

      <VacancyCommuteSection commute={data.commute} />
      <VacancyContactSection contact={data.contact} />

      {data.summary && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Zusammenfassung
          </h3>
          <Markdown className="text-sm text-gray-600 dark:text-gray-400">
            {data.summary}
          </Markdown>
        </div>
      )}

      {data.description && (
        <details className="mt-4">
          <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
            Vollständige Beschreibung
          </summary>
          <Markdown className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {data.description}
          </Markdown>
        </details>
      )}
    </Card>
  );
}

function useActivityRecorder(jobSearchId: string, hash: string) {
  const addActivity = useAddActivity(jobSearchId);
  const [eventForm, setEventForm] = useState<{
    type: ActivityType;
    extra: Record<string, string>;
  }>();

  const handleRecordActivity = () => {
    if (!eventForm) return;
    const activity: Record<string, unknown> = {
      type: eventForm.type,
      date: today(),
      ...eventForm.extra,
    };
    addActivity.mutate(
      { hash, activity },
      { onSuccess: () => setEventForm(undefined) },
    );
  };

  return { eventForm, setEventForm, handleRecordActivity };
}

function useVacancyDetailData(jobSearchId: string, hash: string) {
  const { data, isLoading } = useJobSearchVacancy(jobSearchId, hash);
  const coverLetterQuery = useVacancyCoverLetter(jobSearchId, hash);
  const updateCoverLetter = useUpdateVacancyCoverLetter(jobSearchId, hash);
  const generateCoverLetter = useGenerateVacancyCoverLetter(jobSearchId, hash);
  const title = data?.title ?? "Stelle";
  return {
    data,
    isLoading,
    title,
    coverLetterQuery,
    updateCoverLetter,
    generateCoverLetter,
  };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
