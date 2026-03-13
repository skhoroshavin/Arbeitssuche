import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  useApplicant,
  useDownloadResume,
  useConsultSearches,
} from "@/ui/data/applicants";
import {
  useJobSearches,
  useCreateJobSearch,
  useDeleteJobSearch,
} from "@/ui/data/job-searches";
import { Card, PageHeader, Loading } from "@/ui/components";
import { EntityList } from "@/ui/pages/applicant/components/EntityList";
import { ConsultationModal } from "@/ui/pages/applicant/components/ConsultationModal";
import type { ResumeTemplate } from "@/models/applicant/types";
import type { ConsultationSuggestion } from "@/models/job-search/types";

const TEMPLATE_OPTIONS: {
  value: ResumeTemplate;
  label: string;
  description: string;
  preview: React.ReactNode;
}[] = [
  {
    value: "resume_classic",
    label: "Klassisch",
    description: "Serif, zentriert, schlicht",
    preview: (
      <svg viewBox="0 0 120 170" className="w-full h-full">
        <rect width="120" height="170" fill="#fff" />
        {/* Name centered */}
        <rect x="25" y="12" width="70" height="6" rx="1" fill="#6b7280" />
        {/* Contact line */}
        <rect x="30" y="22" width="60" height="2" rx="0.5" fill="#bbb" />
        {/* HR */}
        <line
          x1="10"
          y1="30"
          x2="110"
          y2="30"
          stroke="#999"
          strokeWidth="0.5"
        />
        {/* Section: Berufserfahrung */}
        <rect x="10" y="36" width="45" height="4" rx="0.5" fill="#6b7280" />
        <line
          x1="10"
          y1="42"
          x2="110"
          y2="42"
          stroke="#999"
          strokeWidth="0.3"
        />
        <rect x="10" y="46" width="55" height="3" rx="0.5" fill="#9ca3af" />
        <rect x="75" y="46" width="30" height="2" rx="0.5" fill="#bbb" />
        <rect x="10" y="51" width="40" height="2" rx="0.5" fill="#999" />
        <rect x="14" y="56" width="85" height="2" rx="0.5" fill="#ddd" />
        <rect x="14" y="60" width="75" height="2" rx="0.5" fill="#ddd" />
        <rect x="10" y="67" width="50" height="3" rx="0.5" fill="#9ca3af" />
        <rect x="75" y="67" width="30" height="2" rx="0.5" fill="#bbb" />
        <rect x="10" y="72" width="35" height="2" rx="0.5" fill="#999" />
        <rect x="14" y="77" width="80" height="2" rx="0.5" fill="#ddd" />
        {/* Section: Ausbildung */}
        <rect x="10" y="86" width="35" height="4" rx="0.5" fill="#6b7280" />
        <line
          x1="10"
          y1="92"
          x2="110"
          y2="92"
          stroke="#999"
          strokeWidth="0.3"
        />
        <rect x="10" y="96" width="50" height="3" rx="0.5" fill="#9ca3af" />
        <rect x="75" y="96" width="30" height="2" rx="0.5" fill="#bbb" />
        <rect x="10" y="101" width="40" height="2" rx="0.5" fill="#999" />
        {/* Section: Kenntnisse */}
        <rect x="10" y="112" width="35" height="4" rx="0.5" fill="#6b7280" />
        <line
          x1="10"
          y1="118"
          x2="110"
          y2="118"
          stroke="#999"
          strokeWidth="0.3"
        />
        <rect x="10" y="122" width="90" height="2" rx="0.5" fill="#999" />
        {/* Section: Sprachen */}
        <rect x="10" y="130" width="30" height="4" rx="0.5" fill="#6b7280" />
        <line
          x1="10"
          y1="136"
          x2="110"
          y2="136"
          stroke="#999"
          strokeWidth="0.3"
        />
        <rect x="10" y="140" width="25" height="2" rx="0.5" fill="#999" />
        <rect x="45" y="140" width="25" height="2" rx="0.5" fill="#999" />
      </svg>
    ),
  },
  {
    value: "resume_elegant",
    label: "Elegant",
    description: "Tabellarisch, Garamond",
    preview: (
      <svg viewBox="0 0 120 170" className="w-full h-full">
        <rect width="120" height="170" fill="#fff" />
        {/* Name centered with spacing */}
        <rect x="20" y="10" width="80" height="7" rx="1" fill="#6b7280" />
        {/* Contact */}
        <rect x="25" y="21" width="70" height="2" rx="0.5" fill="#999" />
        {/* Double border */}
        <line
          x1="10"
          y1="28"
          x2="110"
          y2="28"
          stroke="#3d3d3d"
          strokeWidth="1"
        />
        {/* "Lebenslauf" subtitle */}
        <rect x="38" y="32" width="44" height="3" rx="0.5" fill="#ccc" />
        <line
          x1="10"
          y1="38"
          x2="110"
          y2="38"
          stroke="#ccc"
          strokeWidth="0.3"
        />
        {/* Section header */}
        <rect x="10" y="43" width="50" height="3" rx="0.5" fill="#888" />
        {/* Table rows: dates | content */}
        <line x1="32" y1="49" x2="32" y2="95" stroke="#ddd" strokeWidth="0.5" />
        <rect x="12" y="50" width="16" height="2" rx="0.5" fill="#bbb" />
        <rect x="12" y="54" width="16" height="2" rx="0.5" fill="#bbb" />
        <rect x="36" y="50" width="50" height="3" rx="0.5" fill="#9ca3af" />
        <rect x="36" y="55" width="35" height="2" rx="0.5" fill="#777" />
        <rect x="36" y="59" width="65" height="2" rx="0.5" fill="#ddd" />
        <rect x="36" y="63" width="55" height="2" rx="0.5" fill="#ddd" />
        <rect x="12" y="70" width="16" height="2" rx="0.5" fill="#bbb" />
        <rect x="12" y="74" width="16" height="2" rx="0.5" fill="#bbb" />
        <rect x="36" y="70" width="45" height="3" rx="0.5" fill="#9ca3af" />
        <rect x="36" y="75" width="30" height="2" rx="0.5" fill="#777" />
        <rect x="36" y="79" width="60" height="2" rx="0.5" fill="#ddd" />
        {/* Ausbildung */}
        <rect x="10" y="90" width="35" height="3" rx="0.5" fill="#888" />
        <line
          x1="32"
          y1="96"
          x2="32"
          y2="112"
          stroke="#ddd"
          strokeWidth="0.5"
        />
        <rect x="12" y="97" width="16" height="2" rx="0.5" fill="#bbb" />
        <rect x="36" y="97" width="45" height="3" rx="0.5" fill="#9ca3af" />
        <rect x="36" y="102" width="35" height="2" rx="0.5" fill="#777" />
        {/* Kenntnisse */}
        <rect x="10" y="114" width="35" height="3" rx="0.5" fill="#888" />
        <rect x="10" y="120" width="90" height="2" rx="0.5" fill="#999" />
        {/* Sprachen */}
        <rect x="10" y="128" width="30" height="3" rx="0.5" fill="#888" />
        <rect x="10" y="134" width="25" height="2" rx="0.5" fill="#999" />
        <rect x="45" y="134" width="25" height="2" rx="0.5" fill="#999" />
      </svg>
    ),
  },
  {
    value: "resume_modern",
    label: "Modern",
    description: "Seitenleiste, Akzentfarbe",
    preview: (
      <svg viewBox="0 0 120 170" className="w-full h-full">
        <rect width="120" height="170" fill="#fff" />
        {/* Sidebar */}
        <rect x="0" y="0" width="40" height="170" fill="#475569" />
        {/* Name in sidebar */}
        <rect x="5" y="14" width="30" height="5" rx="1" fill="#fff" />
        {/* Sidebar section: Kontakt */}
        <rect x="5" y="26" width="22" height="3" rx="0.5" fill="#1abc9c" />
        <line
          x1="5"
          y1="31"
          x2="35"
          y2="31"
          stroke="#1abc9c"
          strokeWidth="0.3"
        />
        <rect x="5" y="34" width="28" height="2" rx="0.5" fill="#bdc3c7" />
        <rect x="5" y="38" width="25" height="2" rx="0.5" fill="#bdc3c7" />
        <rect x="5" y="42" width="20" height="2" rx="0.5" fill="#bdc3c7" />
        {/* Sidebar section: Kenntnisse */}
        <rect x="5" y="52" width="28" height="3" rx="0.5" fill="#1abc9c" />
        <line
          x1="5"
          y1="57"
          x2="35"
          y2="57"
          stroke="#1abc9c"
          strokeWidth="0.3"
        />
        <rect x="5" y="60" width="30" height="2" rx="0.5" fill="#bdc3c7" />
        <rect x="5" y="64" width="26" height="2" rx="0.5" fill="#bdc3c7" />
        {/* Sidebar section: Sprachen */}
        <rect x="5" y="74" width="25" height="3" rx="0.5" fill="#1abc9c" />
        <line
          x1="5"
          y1="79"
          x2="35"
          y2="79"
          stroke="#1abc9c"
          strokeWidth="0.3"
        />
        <rect x="5" y="82" width="20" height="2" rx="0.5" fill="#ecf0f1" />
        <rect x="5" y="86" width="15" height="2" rx="0.5" fill="#bdc3c7" />
        {/* Main: Berufserfahrung */}
        <rect x="46" y="14" width="50" height="4" rx="0.5" fill="#64748b" />
        <line
          x1="46"
          y1="20"
          x2="112"
          y2="20"
          stroke="#1abc9c"
          strokeWidth="1"
        />
        <rect x="46" y="24" width="45" height="3" rx="0.5" fill="#64748b" />
        <rect x="90" y="24" width="22" height="2" rx="0.5" fill="#bbb" />
        <rect x="46" y="29" width="30" height="2" rx="0.5" fill="#1abc9c" />
        <rect x="48" y="34" width="55" height="2" rx="0.5" fill="#ddd" />
        <rect x="48" y="38" width="50" height="2" rx="0.5" fill="#ddd" />
        <rect x="46" y="45" width="40" height="3" rx="0.5" fill="#64748b" />
        <rect x="90" y="45" width="22" height="2" rx="0.5" fill="#bbb" />
        <rect x="46" y="50" width="28" height="2" rx="0.5" fill="#1abc9c" />
        <rect x="48" y="55" width="50" height="2" rx="0.5" fill="#ddd" />
        {/* Main: Ausbildung */}
        <rect x="46" y="66" width="38" height="4" rx="0.5" fill="#64748b" />
        <line
          x1="46"
          y1="72"
          x2="112"
          y2="72"
          stroke="#1abc9c"
          strokeWidth="1"
        />
        <rect x="46" y="76" width="45" height="3" rx="0.5" fill="#64748b" />
        <rect x="90" y="76" width="22" height="2" rx="0.5" fill="#bbb" />
        <rect x="46" y="81" width="30" height="2" rx="0.5" fill="#888" />
      </svg>
    ),
  },
  {
    value: "resume_minimal",
    label: "Minimal",
    description: "Kopfleiste, Farbverlauf",
    preview: (
      <svg viewBox="0 0 120 170" className="w-full h-full">
        <rect width="120" height="170" fill="#fff" />
        {/* Header gradient */}
        <defs>
          <linearGradient id="hg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2d3f54" />
            <stop offset="100%" stopColor="#3b5a7c" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="120" height="42" fill="url(#hg)" />
        {/* Name */}
        <rect
          x="12"
          y="12"
          width="65"
          height="7"
          rx="1"
          fill="#fff"
          opacity="0.95"
        />
        {/* Contact dots */}
        <circle cx="14" cy="28" r="1.5" fill="#38bdf8" />
        <rect x="18" y="27" width="30" height="2" rx="0.5" fill="#94a3b8" />
        <circle cx="54" cy="28" r="1.5" fill="#38bdf8" />
        <rect x="58" y="27" width="25" height="2" rx="0.5" fill="#94a3b8" />
        <circle cx="14" cy="34" r="1.5" fill="#38bdf8" />
        <rect x="18" y="33" width="35" height="2" rx="0.5" fill="#94a3b8" />
        {/* Section: Berufserfahrung */}
        <rect x="12" y="50" width="45" height="3" rx="0.5" fill="#475569" />
        <line
          x1="60"
          y1="51.5"
          x2="108"
          y2="51.5"
          stroke="#e2e8f0"
          strokeWidth="0.5"
        />
        {/* Entry with left border */}
        <line
          x1="14"
          y1="57"
          x2="14"
          y2="78"
          stroke="#e2e8f0"
          strokeWidth="1"
        />
        <rect x="18" y="57" width="50" height="3" rx="0.5" fill="#475569" />
        <rect x="85" y="57" width="22" height="2" rx="0.5" fill="#94a3b8" />
        <rect x="18" y="62" width="30" height="2" rx="0.5" fill="#5b7fa6" />
        <rect x="18" y="66" width="70" height="2" rx="0.5" fill="#ddd" />
        <rect x="18" y="70" width="60" height="2" rx="0.5" fill="#ddd" />
        <line
          x1="14"
          y1="80"
          x2="14"
          y2="98"
          stroke="#e2e8f0"
          strokeWidth="1"
        />
        <rect x="18" y="80" width="45" height="3" rx="0.5" fill="#475569" />
        <rect x="85" y="80" width="22" height="2" rx="0.5" fill="#94a3b8" />
        <rect x="18" y="85" width="28" height="2" rx="0.5" fill="#5b7fa6" />
        <rect x="18" y="89" width="65" height="2" rx="0.5" fill="#ddd" />
        {/* Section: Kenntnisse */}
        <rect x="12" y="104" width="35" height="3" rx="0.5" fill="#475569" />
        <line
          x1="50"
          y1="105.5"
          x2="108"
          y2="105.5"
          stroke="#e2e8f0"
          strokeWidth="0.5"
        />
        {/* Skill tags */}
        <rect x="12" y="111" width="22" height="8" rx="2" fill="#f1f5f9" />
        <rect x="15" y="113.5" width="16" height="3" rx="0.5" fill="#64748b" />
        <rect x="38" y="111" width="18" height="8" rx="2" fill="#f1f5f9" />
        <rect x="41" y="113.5" width="12" height="3" rx="0.5" fill="#64748b" />
        <rect x="60" y="111" width="25" height="8" rx="2" fill="#f1f5f9" />
        <rect x="63" y="113.5" width="19" height="3" rx="0.5" fill="#64748b" />
        <rect x="89" y="111" width="16" height="8" rx="2" fill="#f1f5f9" />
        <rect x="92" y="113.5" width="10" height="3" rx="0.5" fill="#64748b" />
        <rect x="12" y="122" width="20" height="8" rx="2" fill="#f1f5f9" />
        <rect x="15" y="124.5" width="14" height="3" rx="0.5" fill="#64748b" />
        {/* Section: Sprachen */}
        <rect x="12" y="137" width="30" height="3" rx="0.5" fill="#475569" />
        <line
          x1="45"
          y1="138.5"
          x2="108"
          y2="138.5"
          stroke="#e2e8f0"
          strokeWidth="0.5"
        />
        <rect x="12" y="144" width="20" height="2" rx="0.5" fill="#475569" />
        <rect x="35" y="144" width="15" height="2" rx="0.5" fill="#94a3b8" />
        <rect x="60" y="144" width="18" height="2" rx="0.5" fill="#475569" />
        <rect x="81" y="144" width="12" height="2" rx="0.5" fill="#94a3b8" />
      </svg>
    ),
  },
];

export default function ApplicantOverview() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useApplicant(id!);
  const jobSearches = useJobSearches(id);
  const createJobSearch = useCreateJobSearch();
  const deleteJobSearch = useDeleteJobSearch();
  const navigate = useNavigate();

  const downloadResume = useDownloadResume(id!, data?.personal?.name ?? "");
  const consultSearches = useConsultSearches(id!);

  const [showConsultation, setShowConsultation] = useState(false);
  const [isCreatingSuggestions, setIsCreatingSuggestions] = useState(false);

  if (isLoading) return <Loading />;
  if (!data) return <div>Bewerber nicht gefunden</div>;

  const jobSearchItems = (jobSearches.data?.jobSearches ?? []).map((js) => ({
    id: js.id,
    label: js.searchTerm || js.id,
  }));

  const handleConsult = () => {
    setShowConsultation(true);
    consultSearches.mutate(undefined);
  };

  const handleCreateSelected = async (selected: ConsultationSuggestion[]) => {
    setIsCreatingSuggestions(true);
    try {
      await Promise.all(
        selected.map((suggestion) =>
          createJobSearch.mutateAsync({
            searchTerm: suggestion.searchTerm,
            applicantId: id!,
            searchMode: suggestion.searchMode,
          }),
        ),
      );
      setShowConsultation(false);
      consultSearches.reset();
    } finally {
      setIsCreatingSuggestions(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Lebenslauf" />

      <Card className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TEMPLATE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              title={`${opt.label} — ${opt.description}`}
              disabled={downloadResume.isPending}
              onClick={() => downloadResume.mutate(opt.value)}
              className="flex flex-col items-center rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 transition-colors disabled:opacity-50"
            >
              <div className="w-full aspect-[210/297] rounded bg-white dark:bg-gray-100 shadow-sm overflow-hidden">
                {opt.preview}
              </div>
            </button>
          ))}
        </div>
      </Card>

      <EntityList
        title="Jobsuchen"
        buttonLabel="Neue Suche"
        placeholder="Suchbegriff (z.B. React Entwickler)"
        emptyMessage="Noch keine Jobsuchen. Erstellen Sie eine, um loszulegen."
        items={jobSearchItems}
        isLoading={jobSearches.isLoading}
        onCreateSubmit={async (name) => {
          await createJobSearch.mutateAsync({
            searchTerm: name,
            applicantId: id!,
          });
        }}
        createError={createJobSearch.error}
        onDelete={(item) => {
          if (confirm(`Jobsuche "${item.label}" löschen?`)) {
            deleteJobSearch.mutate(item.id);
          }
        }}
        onNavigate={(jsId) => navigate(`/job-searches/${jsId}`)}
        headerExtra={
          <button
            onClick={handleConsult}
            disabled={consultSearches.isPending}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            Beratung
          </button>
        }
      />

      {showConsultation && (
        <ConsultationModal
          suggestions={consultSearches.data?.suggestions ?? []}
          isLoading={consultSearches.isPending}
          error={consultSearches.error}
          onClose={() => {
            setShowConsultation(false);
            consultSearches.reset();
          }}
          onCreateSelected={handleCreateSelected}
          isCreating={isCreatingSuggestions}
        />
      )}
    </div>
  );
}
