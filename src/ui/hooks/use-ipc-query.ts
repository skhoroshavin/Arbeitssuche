import { useState, useEffect, useCallback, useRef } from "react";
import { useIpcCache } from "./internal/ipc-cache";

interface UseIpcQueryOptions<T> {
  queryKey: string[];
  queryFn: () => Promise<T>;
  enabled?: boolean;
}

interface UseIpcQueryResult<T> {
  data: T | undefined;
  error: Error | null;
  isPending: boolean;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function useIpcQuery<T>(
  options: UseIpcQueryOptions<T>,
): UseIpcQueryResult<T> {
  const { queryKey, queryFn, enabled = true } = options;
  const cache = useIpcCache();
  const [data, setData] = useState<T | undefined>(
    () => cache.get<T>(queryKey)?.data,
  );
  const [error, setError] = useState<Error | null>(null);
  const [isPending, setIsPending] = useState(!data);
  const reqId = useRef(0);
  const keyStr = JSON.stringify(queryKey);

  const fetch = useCallback(
    async (force = false) => {
      if (!enabled) return;
      if (!force) {
        const cached = cache.get<T>(queryKey);
        if (cached?.fresh) {
          setData(cached.data);
          setIsPending(false);
          return;
        }
      }
      const id = ++reqId.current;
      setIsPending(true);
      try {
        const result = await queryFn();
        if (id !== reqId.current) return;
        cache.set(queryKey, result);
        setData(result);
        setError(null);
      } catch (err) {
        if (id !== reqId.current) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (id === reqId.current) setIsPending(false);
      }
    },

    [keyStr, enabled],
  );

  useEffect(() => {
    if (!enabled) {
      setIsPending(false);
      return;
    }
    fetch();
    return cache.subscribe(queryKey, () => fetch(true));
  }, [fetch]);

  return {
    data,
    error,
    isPending,
    isLoading: isPending && !data,
    refetch: () => fetch(true),
  };
}
