import { useNavigate } from "react-router";
import {
  useApplicantListView,
  useCreateApplicant,
  useDeleteApplicant,
} from "@/ui/data";
import { EntityList } from "@/ui/pages/applicant/components";
import { useLayoutConfig } from "@/ui/layout";

export default function ApplicantList() {
  const { data, isLoading } = useApplicantListView();
  const create = useCreateApplicant();
  const remove = useDeleteApplicant();
  const navigate = useNavigate();

  useLayoutConfig(
    () => ({
      sidebarTitle: "Startseite",
      sidebarNavItems: [],
      headerTitle: "Bewerber",
      headerBackLink: undefined,
    }),
    [],
  );

  const items = data.map((applicant) => ({
    id: applicant.id,
    label: applicant.name || applicant.id,
  }));

  return (
    <EntityList
      buttonLabel="Neuer Bewerber"
      placeholder="Name (z.B. Max Mustermann)"
      emptyMessage="Noch keine Bewerber. Erstellen Sie einen, um loszulegen."
      items={items}
      isLoading={isLoading}
      onCreateSubmit={async (name) => {
        await create.mutateAsync({ name });
      }}
      createError={create.error ?? undefined}
      onDelete={(item) => {
        if (confirm(`Bewerber "${item.label}" löschen?`)) {
          remove.mutate(item.id);
        }
      }}
      onNavigate={(id) => navigate(`/applicants/${id}`)}
    />
  );
}
