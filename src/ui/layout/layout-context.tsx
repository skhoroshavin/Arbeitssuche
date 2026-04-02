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

export interface LayoutConfig {
  sidebarTitle: string;
  sidebarNavItems: NavItem[];
  headerTitle: ReactNode;
  headerBackLink: ReactNode;
  headerExtra?: ReactNode;
}

export const defaultLayoutConfig: LayoutConfig = {
  sidebarTitle: "Startseite",
  sidebarNavItems: [],
  headerTitle: "",
  headerBackLink: undefined,
  headerExtra: undefined,
};

export function useLayout() {
  return useContext(LayoutContext).config;
}

export function useLayoutConfig(
  configFunction: () => LayoutConfig,
  deps: DependencyList,
) {
  const setConfig = useSetLayout();
  useEffect(() => {
    setConfig(configFunction());
  }, [setConfig, ...deps]);
}

export function useAutoSaveHeader(saveStatus: AutoSaveStatusType) {
  useSetHeaderExtra(<AutoSaveStatus status={saveStatus} />, [saveStatus]);
}

function useSetHeaderExtra(extra: ReactNode, deps: DependencyList) {
  const setConfig = useSetLayout();
  useEffect(() => {
    setConfig((previous) => ({ ...previous, headerExtra: extra }));
    return () =>
      setConfig((previous) => ({ ...previous, headerExtra: undefined }));
  }, [setConfig, ...deps]);
}

function useSetLayout() {
  return useContext(LayoutContext).setConfig;
}

function AutoSaveStatus({ status }: { status: AutoSaveStatusType }) {
  if (status === "idle") return;
  const { text, className } = autoSaveConfig[status];
  return <span className={`text-sm ${className}`}>{text}</span>;
}

export const LayoutContext = createContext<LayoutContextValue>({
  config: defaultLayoutConfig,
  setConfig: () => {},
});

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

interface LayoutContextValue {
  config: LayoutConfig;
  setConfig: Dispatch<SetStateAction<LayoutConfig>>;
}

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
