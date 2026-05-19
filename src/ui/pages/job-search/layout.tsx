import { useMemo } from "react"
import { useParams, Link, Outlet } from "react-router"
import { useJobSearch, useApplicantHeaderName } from "@/ui/data"
import { useLayoutConfig } from "@/ui/layout"
import { HomeIcon, ChevronRightIcon } from "@/ui/components"

export default function JobSearchLayout() {
  const { id = "" } = useParams<{ id: string }>()
  const { searchTitle, applicantName, applicantId } = useJobSearchLayoutData(id)

  const navItems = useMemo(
    () => [
      { to: `/job-searches/${id}/config`, label: "Konfiguration" },
      { to: `/job-searches/${id}/cover-letter`, label: "Anschreiben" },
      { to: `/job-searches/${id}/vacancies`, label: "Stellen" },
    ],
    [id],
  )

  useLayoutConfig(
    () => ({
      sidebarTitle: "Stellensuche",
      sidebarNavItems: navItems,
      headerTitle: (
        <BreadcrumbTitle
          applicantId={applicantId}
          applicantName={applicantName}
          searchTitle={searchTitle}
        />
      ),
      headerBackLink: (
        <Link to="/" aria-label="Startseite">
          <HomeIcon />
        </Link>
      ),
    }),
    [applicantId, applicantName, searchTitle, navItems],
  )

  return <Outlet />
}

function BreadcrumbTitle({
  applicantId,
  applicantName,
  searchTitle,
}: {
  applicantId?: string
  applicantName: string
  searchTitle: string
}) {
  return (
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
  )
}

function useJobSearchLayoutData(id: string) {
  const { data } = useJobSearch(id)
  const applicantId = data?.applicantId
  const { displayName } = useApplicantHeaderName(applicantId)
  return {
    searchTitle: data?.jobSearch.searchTerm || id,
    applicantName: displayName,
    applicantId,
  }
}
