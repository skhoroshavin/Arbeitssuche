import {
  createContext,
  useContext,
  useEffect,
  type DependencyList,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { AutoSaveStatus as AutoSaveStatusType } from "@/ui/hooks/auto-save-form";

const autoSaveConfig: Record<
  Exclude<AutoSaveStatusType, "idle">,
  { text: string; className: string }
> = {
  unsaved: {
    text: "Ungespeicherte Änderungen",
    className: "text-amber-600 dark:text-amber-400",
  },
  saving: {
    text: "Speichern...",
    className: "text-gray-500 dark:text-gray-400",
  },
  saved: {
    text: "Gespeichert",
    className: "text-green-600 dark:text-green-400",
  },
  error: {
    text: "Fehler beim Speichern",
    className: "text-red-600 dark:text-red-400",
  },
};

function AutoSaveStatus({ status }: { status: AutoSaveStatusType }) {
  if (status === "idle") return null;
  const { text, className } = autoSaveConfig[status];
  return <span className={`text-sm ${className}`}>{text}</span>;
}

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

export interface LayoutConfig {
  sidebarTitle: string;
  sidebarNavItems: NavItem[];
  headerTitle: ReactNode;
  headerBackLink: ReactNode | null;
  headerExtra?: ReactNode | null;
}

interface LayoutContextValue {
  config: LayoutConfig;
  setConfig: Dispatch<SetStateAction<LayoutConfig>>;
}

export const defaultLayoutConfig: LayoutConfig = {
  sidebarTitle: "Startseite",
  sidebarNavItems: [],
  headerTitle: "",
  headerBackLink: null,
  headerExtra: null,
};

export const LayoutContext = createContext<LayoutContextValue>({
  config: defaultLayoutConfig,
  setConfig: () => {},
});

export function useLayout() {
  return useContext(LayoutContext).config;
}

function useSetLayout() {
  return useContext(LayoutContext).setConfig;
}

export function useLayoutConfig(
  configFn: () => LayoutConfig,
  deps: DependencyList,
) {
  const setConfig = useSetLayout();
  useEffect(() => {
    setConfig(configFn());
  }, [setConfig, ...deps]);
}

function useSetHeaderExtra(extra: ReactNode, deps: DependencyList) {
  const setConfig = useSetLayout();
  useEffect(() => {
    setConfig((prev) => ({ ...prev, headerExtra: extra }));
    return () => setConfig((prev) => ({ ...prev, headerExtra: null }));
  }, [setConfig, ...deps]);
}

export function useAutoSaveHeader(saveStatus: AutoSaveStatusType) {
  useSetHeaderExtra(<AutoSaveStatus status={saveStatus} />, [saveStatus]);
}
