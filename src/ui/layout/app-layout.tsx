import { useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { useScrollRestoration } from "./use-scroll-restoration";
import {
  LayoutContext,
  useLayout,
  defaultLayoutConfig,
  type LayoutConfig,
} from "./layout-context";
import { CogIcon } from "@/ui/components";

export function AppLayout() {
  const [config, setConfig] = useState<LayoutConfig>(defaultLayoutConfig);

  return (
    <LayoutContext.Provider value={{ config, setConfig }}>
      <div className="flex">
        <Sidebar />
        <MainArea />
      </div>
    </LayoutContext.Provider>
  );
}

function Sidebar() {
  const { sidebarTitle, sidebarNavItems } = useLayout();
  const { pathname, search } = useLocation();
  const isSettings = pathname.startsWith("/settings");

  return (
    <aside className="w-64 shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-screen">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <Link
          to="/"
          className="text-lg font-bold text-gray-900 dark:text-gray-100"
        >
          {sidebarTitle}
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {sidebarNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={navLinkClassName}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
        <NavLink
          to="/settings"
          state={isSettings ? undefined : { returnTo: pathname + search }}
          className={navLinkClassName}
        >
          <span className="flex items-center gap-2">
            <CogIcon />
            Einstellungen
          </span>
        </NavLink>
      </div>
    </aside>
  );
}

function MainArea() {
  const { headerTitle, headerBackLink, headerExtra } = useLayout();
  const location = useLocation();
  const mainReference = useRef<HTMLElement>(null);
  useScrollRestoration(mainReference, location.pathname + location.search);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {headerBackLink && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {headerBackLink}
            </span>
          )}
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
            {headerTitle}
          </h2>
        </div>
        {headerExtra}
      </header>

      <main ref={mainReference} className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function navLinkClassName({ isActive }: { isActive: boolean }) {
  return `block px-3 py-2 rounded-lg text-sm ${
    isActive
      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium"
      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
  }`;
}
