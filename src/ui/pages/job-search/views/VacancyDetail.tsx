import { useState } from "react";
import { useParams, Link, useLocation } from "react-router";
import {
  useJobSearchVacancy,
  useAddActivity,
  useVacancyCoverLetter,
  useUpdateVacancyCoverLetter,
  useGenerateVacancyCoverLetter,
} from "@/ui/data/job-searches";
import { useAutoSaveForm } from "@/ui/hooks/auto-save-form";
import {
  Card,
  SectionHeader,
  Loading,
  Textarea,
  ArrowLeftIcon,
} from "@/ui/components";
import { Markdown } from "@/ui/pages/job-search/components/Markdown";
import { StatusBadge } from "@/ui/pages/job-search/components/StatusBadge";
import { useLayoutConfig, useAutoSaveHeader } from "@/ui/layout";
import type {
  ActivityType,
  VacancyStatus,
  VacancyContact,
  CommuteInfo,
} from "@/models/vacancy/types";
import { STATUS_LABELS, MATCH_SCORE_LABELS } from "@/ui/constants";

function today() {
  return new Date().toISOString().slice(0, 10);
}

const COLORS = {
  apply: "bg-blue-600 hover:bg-blue-700",
  invite: "bg-purple-600 hover:bg-purple-700",
  offer: "bg-pink-600 hover:bg-pink-700",
  reject: "bg-red-600 hover:bg-red-700",
  interview: "bg-indigo-600 hover:bg-indigo-700",
  dismiss: "bg-orange-600 hover:bg-orange-700",
} as const;

interface StatusAction {
  type: ActivityType;
  label: string;
  color: string;
}

const NOT_INTERESTED_ACTION: StatusAction = {
  type: "not-interested",
  label: "Nicht interessant",
  color: COLORS.dismiss,
};

const FOLLOW_UP_ACTIONS: StatusAction[] = [
  { type: "invited", label: "Einladen", color: COLORS.invite },
  { type: "offered", label: "Angebot", color: COLORS.offer },
  { type: "rejected", label: "Ablehnen", color: COLORS.reject },
];

const TRANSITIONS: Record<VacancyStatus, StatusAction[]> = {
  new: [
    { type: "applied", label: "Bewerben", color: COLORS.apply },
    NOT_INTERESTED_ACTION,
  ],
  renewed: [
    { type: "applied", label: "Bewerben", color: COLORS.apply },
    NOT_INTERESTED_ACTION,
  ],
  gone: [],
  applied: FOLLOW_UP_ACTIONS,
  ignored: FOLLOW_UP_ACTIONS,
  invited: [
    { type: "interviewed", label: "Gespräch", color: COLORS.interview },
    { type: "offered", label: "Angebot", color: COLORS.offer },
    { type: "rejected", label: "Ablehnen", color: COLORS.reject },
  ],
  interviewed: [
    { type: "invited", label: "Einladen", color: COLORS.invite },
    { type: "offered", label: "Angebot", color: COLORS.offer },
    { type: "rejected", label: "Ablehnen", color: COLORS.reject },
  ],
  offered: [{ type: "rejected", label: "Ablehnen", color: COLORS.reject }],
  rejected: [],
  "not-interested": [
    { type: "applied", label: "Bewerben", color: COLORS.apply },
  ],
};

function VacancyCommuteSection({
  commute,
}: {
  commute?: Record<string, CommuteInfo>;
}) {
  if (!commute || Object.keys(commute).length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Fahrtweg
      </h3>
      <div className="grid grid-cols-4 gap-2 text-xs text-gray-600 dark:text-gray-400">
        <div className="font-medium">Adresse</div>
        <div className="font-medium">Morgens</div>
        <div className="font-medium">Tagsüber</div>
        <div className="font-medium">Entfernung</div>
        {Object.entries(commute).map(([addr, info]) => (
          <div key={addr} className="contents">
            <div>{addr}</div>
            <div>{info.durations.morning} min</div>
            <div>{info.durations.day} min</div>
            <div>{info.distance}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VacancyContactSection({ contact }: { contact?: VacancyContact }) {
  if (!contact || (!contact.name && !contact.email && !contact.phone))
    return null;

  return (
    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Ansprechpartner
      </h3>
      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
        {contact.name && <div>{contact.name}</div>}
        {contact.email && (
          <div>
            <a
              href={`mailto:${contact.email}`}
              className="text-blue-600 hover:underline"
            >
              {contact.email}
            </a>
          </div>
        )}
        {contact.phone && (
          <div>
            <a
              href={`tel:${contact.phone}`}
              className="text-blue-600 hover:underline"
            >
              {contact.phone}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function VacancyActivityForm({
  allowedActions,
  eventForm,
  onSelectAction,
  onConfirm,
}: {
  allowedActions: StatusAction[];
  eventForm: { type: ActivityType; extra: Record<string, string> } | null;
  onSelectAction: (
    form: { type: ActivityType; extra: Record<string, string> } | null,
  ) => void;
  onConfirm: () => void;
}) {
  return (
    <Card className="p-4">
      <SectionHeader className="mb-3">Aktionen</SectionHeader>
      <div className="flex flex-wrap gap-2">
        {allowedActions.map((action) => {
          let extra: Record<string, string> = {};
          if (action.type === "invited") {
            extra = { interviewDate: "" };
          } else if (action.type === "interviewed") {
            extra = { outcome: "completed" };
          }
          return (
            <button
              key={action.type}
              onClick={() => onSelectAction({ type: action.type, extra })}
              className={`px-3 py-1.5 text-sm text-white rounded-lg ${action.color}`}
            >
              {action.label}
            </button>
          );
        })}
      </div>

      {eventForm && (
        <div className="mt-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg space-y-2">
          <p className="text-sm font-medium dark:text-gray-200">
            Eintrag: {eventForm.type}
          </p>
          {eventForm.type === "invited" && (
            <input
              type="date"
              placeholder="Vorstellungstermin"
              onChange={(e) =>
                onSelectAction({
                  ...eventForm,
                  extra: { interviewDate: e.target.value },
                })
              }
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={onConfirm}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg"
            >
              Bestätigen
            </button>
            <button
              onClick={() => onSelectAction(null)}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:text-gray-200"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

function VacancyCoverLetterSection({
  coverLetterQuery,
  updateCoverLetter,
  generateCoverLetter,
}: {
  coverLetterQuery: ReturnType<typeof useVacancyCoverLetter>;
  updateCoverLetter: ReturnType<typeof useUpdateVacancyCoverLetter>;
  generateCoverLetter: ReturnType<typeof useGenerateVacancyCoverLetter>;
}) {
  const { register, setValue, saveStatus } = useAutoSaveForm<
    { content: string },
    { content: string }
  >({
    queryResult: {
      data: coverLetterQuery.data,
      isLoading: coverLetterQuery.isLoading,
    },
    toFormValues: (d) => ({ content: d.content ?? "" }),
    onSave: async (form) => {
      await updateCoverLetter.mutateAsync(form.content);
    },
  });

  useAutoSaveHeader(saveStatus);

  const onGenerate = () => {
    generateCoverLetter.mutate(undefined, {
      onSuccess: (result) => {
        setValue("content", result.content, { shouldDirty: true });
      },
    });
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <SectionHeader>Anschreiben</SectionHeader>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onGenerate}
            disabled={generateCoverLetter.isPending}
            className="rounded-md bg-zinc-600 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-500 disabled:opacity-50"
          >
            {generateCoverLetter.isPending ? "Generiere..." : "Generieren"}
          </button>
        </div>
      </div>

      {generateCoverLetter.isError && (
        <p className="text-sm text-red-600 mb-2">
          Generierung fehlgeschlagen. Bitte erneut versuchen.
        </p>
      )}

      <Textarea label="Anschreiben" rows={12} {...register("content")} />
    </Card>
  );
}

export default function JobSearchVacancyDetail() {
  const { id, hash } = useParams<{ id: string; hash: string }>();
  const location = useLocation();
  const backSearch: string = location.state?.vacancyListSearch ?? "";
  const { data, isLoading, refetch } = useJobSearchVacancy(id!, hash!);
  const addActivity = useAddActivity(id!);
  const coverLetterQuery = useVacancyCoverLetter(id!, hash!);
  const updateCoverLetter = useUpdateVacancyCoverLetter(id!, hash!);
  const generateCoverLetter = useGenerateVacancyCoverLetter(id!, hash!);
  const [eventForm, setEventForm] = useState<{
    type: ActivityType;
    extra: Record<string, string>;
  } | null>(null);

  const title = data?.title ?? "Stelle";

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

  if (isLoading) return <Loading />;
  if (!data) return <div>Stelle nicht gefunden</div>;

  const status = data.status;
  const allowedActions = TRANSITIONS[status] ?? [];

  const handleRecordActivity = () => {
    if (!eventForm) return;
    const activity: Record<string, unknown> = {
      type: eventForm.type,
      date: today(),
      ...eventForm.extra,
    };
    addActivity.mutate(
      { hash: hash!, activity },
      {
        onSuccess: () => {
          setEventForm(null);
          refetch();
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm text-gray-400 dark:text-gray-500">
          {hash}
        </span>
        <StatusBadge status={status}>
          {STATUS_LABELS[status] ?? status}
        </StatusBadge>
        {data.matchScore && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Treffer: {MATCH_SCORE_LABELS[data.matchScore] ?? data.matchScore}
          </span>
        )}
      </div>

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
            {data.sources.map((s, i) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                {s.site}
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

      {/* Anschreiben */}
      <VacancyCoverLetterSection
        coverLetterQuery={coverLetterQuery}
        updateCoverLetter={updateCoverLetter}
        generateCoverLetter={generateCoverLetter}
      />

      {/* Actions */}
      <VacancyActivityForm
        allowedActions={allowedActions}
        eventForm={eventForm}
        onSelectAction={setEventForm}
        onConfirm={handleRecordActivity}
      />

      {/* Activity History */}
      {data.activityHistory.length > 0 && (
        <Card className="p-4">
          <SectionHeader className="mb-3">Aktivitätshistorie</SectionHeader>
          <div className="space-y-2">
            {data.activityHistory.map((a, i) => (
              <div
                key={i}
                className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400"
              >
                <span className="font-mono text-xs text-gray-400 dark:text-gray-500">
                  {a.date}
                </span>
                <StatusBadge status={a.type}>
                  {STATUS_LABELS[a.type] ?? a.type}
                </StatusBadge>
                {a.notes && <span>{a.notes}</span>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
