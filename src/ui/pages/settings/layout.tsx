import { useRef } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { useLayoutConfig } from "@/ui/layout";
import { ArrowLeftIcon } from "@/ui/components";

const navItems = [
  { to: "/settings", label: "Künstliche Intelligenz", end: true },
  { to: "/settings/maps", label: "Karten" },
];

export default function SettingsLayout() {
  const { state } = useLocation();
  const returnTo = useRef(
    (state != null &&
      typeof state === "object" &&
      "returnTo" in state &&
      typeof state.returnTo === "string" &&
      state.returnTo) ||
      "/",
  );

  useLayoutConfig(
    () => ({
      sidebarTitle: "Einstellungen",
      sidebarNavItems: navItems,
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
  );

  return <Outlet />;
}
