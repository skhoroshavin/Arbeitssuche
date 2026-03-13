import { useMemo } from "react";
import { useParams, Link, Outlet } from "react-router";
import { useJobSearch } from "@/ui/data/job-searches";
import { useApplicant } from "@/ui/data/applicants";
import { useLayoutConfig } from "@/ui/layout";
import { HomeIcon, ChevronRightIcon } from "@/ui/components";

export default function JobSearchLayout() {
  const { id } = useParams<{ id: string }>();
  const { data } = useJobSearch(id!);
  const { data: applicantData } = useApplicant(data?.applicantId ?? "");

  const searchTitle = data?.params.searchTerm || id!;
  const applicantName = applicantData?.personal.name || data?.applicantId || "";
  const applicantId = data?.applicantId;

  const navItems = useMemo(
    () => [
      { to: `/job-searches/${id}`, label: "Konfiguration", end: true },
      { to: `/job-searches/${id}/cover-letter`, label: "Anschreiben" },
      { to: `/job-searches/${id}/vacancies`, label: "Stellen" },
    ],
    [id],
  );

  useLayoutConfig(
    () => ({
      sidebarTitle: "Stellensuche",
      sidebarNavItems: navItems,
      headerTitle: (
        <>
          {applicantId ? (
            <Link to={`/applicants/${applicantId}`} className="hover:underline">
              {applicantName}
            </Link>
          ) : (
            applicantName
          )}
          {applicantName && (
            <ChevronRightIcon className="inline w-4 h-4 text-gray-400 dark:text-gray-500 mx-1" />
          )}
          {searchTitle}
        </>
      ),
      headerBackLink: (
        <Link to="/" aria-label="Startseite">
          <HomeIcon />
        </Link>
      ),
    }),
    [applicantId, applicantName, searchTitle, navItems],
  );

  return <Outlet />;
}
