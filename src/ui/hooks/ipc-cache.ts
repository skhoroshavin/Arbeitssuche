import {
  createContext,
  useCallback,
  useContext,
  useRef,
  createElement,
  type ReactNode,
} from "react";

type CacheKey = string[];
type Listener = () => void;

export class IpcCache {
  private cache = new Map<string, { data: unknown; ts: number }>();
  private listeners = new Map<string, Set<Listener>>();

  constructor(private staleTime: number) {}

  private serialize(key: CacheKey): string {
    return JSON.stringify(key);
  }

  get<T>(key: CacheKey): { data: T; fresh: boolean } | undefined {
    const entry = this.cache.get(this.serialize(key));
    if (!entry) return undefined;
    return {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- generic cache lookup
      data: entry.data as T,
      fresh: Date.now() - entry.ts < this.staleTime,
    };
  }

  set(key: CacheKey, data: unknown): void {
    this.cache.set(this.serialize(key), { data, ts: Date.now() });
  }

  invalidate(keyPrefix: CacheKey): void {
    const exact = this.serialize(keyPrefix);
    const childPrefix = exact.slice(0, -1) + ","; // e.g. '["a",' matches '["a","b"]'

    const matches = (key: string) =>
      key === exact || key.startsWith(childPrefix);

    for (const serialized of this.cache.keys()) {
      if (matches(serialized)) this.cache.delete(serialized);
    }
    for (const [serialized, listeners] of this.listeners) {
      if (matches(serialized)) {
        for (const fn of listeners) fn();
      }
    }
  }

  subscribe(key: CacheKey, listener: Listener): () => void {
    const serialized = this.serialize(key);
    let set = this.listeners.get(serialized);
    if (!set) {
      set = new Set();
      this.listeners.set(serialized, set);
    }
    set.add(listener);
    return () => {
      set!.delete(listener);
      if (set!.size === 0) this.listeners.delete(serialized);
    };
  }
}

const IpcCacheContext = createContext<IpcCache>(null!);

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

export function useIpcCache(): IpcCache {
  return useContext(IpcCacheContext);
}

export function useInvalidate(): (keyPrefix: string[]) => void {
  const cache = useIpcCache();
  return useCallback(
    (keyPrefix: string[]) => cache.invalidate(keyPrefix),
    [cache],
  );
}
