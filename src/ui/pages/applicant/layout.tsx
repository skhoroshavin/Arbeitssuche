import { useMemo } from "react";
import { useParams, Link, Outlet } from "react-router";
import { useApplicantHeaderName } from "@/ui/data/applicants";
import { useLayoutConfig } from "@/ui/layout";
import { HomeIcon } from "@/ui/components";

export default function ApplicantLayout() {
  const { id = "" } = useParams<{ id: string }>();
  const { displayName } = useApplicantHeaderName(id);

  const navItems = useMemo(
    () => [
      { to: `/applicants/${id}`, label: "Übersicht", end: true },
      { to: `/applicants/${id}/personal`, label: "Persönlich" },
      { to: `/applicants/${id}/experience`, label: "Erfahrung" },
      { to: `/applicants/${id}/education`, label: "Ausbildung" },
      { to: `/applicants/${id}/certifications`, label: "Zertifikate" },
      { to: `/applicants/${id}/other`, label: "Sonstiges" },
    ],
    [id],
  );

  useLayoutConfig(
    () => ({
      sidebarTitle: "Bewerber",
      sidebarNavItems: navItems,
      headerTitle: (
        <Link to={`/applicants/${id}`} className="hover:underline">
          {displayName}
        </Link>
      ),
      headerBackLink: (
        <Link to="/" aria-label="Startseite">
          <HomeIcon />
        </Link>
      ),
    }),
    [displayName, navItems],
  );

  return <Outlet />;
}
