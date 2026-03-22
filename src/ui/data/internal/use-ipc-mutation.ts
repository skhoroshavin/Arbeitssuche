import { useState, useCallback, useRef } from "react";

interface UseIpcMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData) => void;
}

interface MutateOptions<TData> {
  onSuccess?: (data: TData) => void;
}

interface UseIpcMutationResult<TData, TVariables> {
  mutate: (variables: TVariables, options?: MutateOptions<TData>) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  data: TData | undefined;
  error: Error | null;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  reset: () => void;
}

type Status = "idle" | "pending" | "success" | "error";

export function useIpcMutation<TData = unknown, TVariables = void>(
  options: UseIpcMutationOptions<TData, TVariables>,
): UseIpcMutationResult<TData, TVariables> {
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<TData | undefined>();
  const [error, setError] = useState<Error | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const mutateAsync = useCallback(
    async (variables: TVariables): Promise<TData> => {
      setStatus("pending");
      setError(null);
      try {
        const result = await optionsRef.current.mutationFn(variables);
        setData(result);
        setStatus("success");
        optionsRef.current.onSuccess?.(result);
        return result;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        setStatus("error");
        throw e;
      }
    },
    [],
  );

  const mutate = useCallback(
    (variables: TVariables, callSiteOptions?: MutateOptions<TData>) => {
      mutateAsync(variables)
        .then((result) => {
          callSiteOptions?.onSuccess?.(result);
        })
        .catch(() => {});
    },
    [mutateAsync],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setData(undefined);
    setError(null);
  }, []);

  return {
    mutate,
    mutateAsync,
    data,
    error,
    isPending: status === "pending",
    isSuccess: status === "success",
    isError: status === "error",
    reset,
  };
}
