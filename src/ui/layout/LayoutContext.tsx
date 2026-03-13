import {
  createContext,
  useContext,
  useEffect,
  type DependencyList,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { AutoSaveStatus } from "@/ui/components/AutoSaveStatus";

export interface NavItem {
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

export function useSetHeaderExtra(extra: ReactNode, deps: DependencyList) {
  const setConfig = useSetLayout();
  useEffect(() => {
    setConfig((prev) => ({ ...prev, headerExtra: extra }));
    return () => setConfig((prev) => ({ ...prev, headerExtra: null }));
  }, [setConfig, ...deps]);
}

export function useAutoSaveHeader(saveStatus: string) {
  useSetHeaderExtra(<AutoSaveStatus status={saveStatus} />, [saveStatus]);
}
