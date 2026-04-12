import { useRef } from "react"
import { Link, Outlet, useLocation } from "react-router"
import { useLayoutConfig } from "@/ui/layout"
import { ArrowLeftIcon } from "@/ui/components"

export default function SettingsLayout() {
  const location = useLocation()
  const returnTo = useRef(extractReturnTo(location.state))

  useLayoutConfig(
    () => ({
      sidebarTitle: "Einstellungen",
      sidebarNavItems: [
        { to: "/settings", label: "Künstliche Intelligenz", end: true },
        { to: "/settings/maps", label: "Karten" },
      ],
      headerTitle: "Einstellungen",
      headerBackLink: (
        <Link
          to={returnTo.current}
          aria-label="Zurück"
          className="hover:text-gray-700 dark:hover:text-gray-200"
        >
          <ArrowLeftIcon />
        </Link>
      ),
    }),
    [],
  )

  return <Outlet />
}

function extractReturnTo(state: unknown): string {
  if (
    state != undefined &&
    typeof state === "object" &&
    "returnTo" in state &&
    typeof state.returnTo === "string"
  ) {
    return state.returnTo
  }
  return "/"
}
