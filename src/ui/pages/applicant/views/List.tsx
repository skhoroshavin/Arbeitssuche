import { useNavigate } from "react-router";
import {
  useApplicants,
  useCreateApplicant,
  useDeleteApplicant,
} from "@/ui/data/applicants";
import { EntityList } from "@/ui/pages/applicant/components/EntityList";
import { useLayoutConfig } from "@/ui/layout";

export default function ApplicantList() {
  const { data, isLoading } = useApplicants();
  const create = useCreateApplicant();
  const remove = useDeleteApplicant();
  const navigate = useNavigate();

  useLayoutConfig(
    () => ({
      sidebarTitle: "Startseite",
      sidebarNavItems: [],
      headerTitle: "Bewerber",
      headerBackLink: null,
    }),
    [],
  );

  const items = (data?.applicants ?? []).map((a) => ({
    id: a.id,
    label: a.name || a.id,
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
      createError={create.error}
      onDelete={(item) => {
        if (confirm(`Bewerber "${item.label}" löschen?`)) {
          remove.mutate(item.id);
        }
      }}
      onNavigate={(id) => navigate(`/applicants/${id}`)}
    />
  );
}
