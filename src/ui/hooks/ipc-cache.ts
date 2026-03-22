import { useCallback, useRef, createElement, type ReactNode } from "react";
import { IpcCache, IpcCacheContext, useIpcCache } from "./internal/ipc-cache";

export function IpcCacheProvider({
  children,
  staleTime = 30_000,
}: {
  children: ReactNode;
  staleTime?: number;
}) {
  const cacheRef = useRef<IpcCache>(null);
  if (!cacheRef.current) {
    cacheRef.current = new IpcCache(staleTime);
  }
  return createElement(
    IpcCacheContext.Provider,
    { value: cacheRef.current },
    children,
  );
}

export function useInvalidate(): (keyPrefix: string[]) => void {
  const cache = useIpcCache();
  return useCallback(
    (keyPrefix: string[]) => cache.invalidate(keyPrefix),
    [cache],
  );
}
