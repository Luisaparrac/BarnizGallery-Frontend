import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";

export interface AsyncState<T> {
  data: T | null;
  error: unknown;
  loading: boolean;
  reload(): Promise<void>;
  setData(value: T | null): void;
}

/** Runs an async loader when the dependencies change and keeps its result, error and loading flag. */
export function useAsync<T>(loader: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const call = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(loader, deps);

  const reload = useCallback(async () => {
    const id = ++call.current;
    setLoading(true);
    setError(null);
    try {
      const result = await run();
      if (id === call.current) setData(result);
    } catch (caught) {
      if (id === call.current) setError(caught);
    } finally {
      if (id === call.current) setLoading(false);
    }
  }, [run]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload, setData };
}
