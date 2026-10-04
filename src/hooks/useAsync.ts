import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/types/product";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** True when the failure was a 404 so pages can render a not-found state. */
  notFound: boolean;
  retry: () => void;
  setData: (value: T | null) => void;
}

/**
 * Small data-fetching hook with loading / error / retry handling.
 * Every catalog, content and service call in the storefront goes through it so
 * no page is left showing an empty area while it loads.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setNotFound(false);

    loader()
      .then((result) => {
        if (!active || !mounted.current) return;
        setData(result);
      })
      .catch((caught: unknown) => {
        if (!active || !mounted.current) return;
        if (caught instanceof ApiError) {
          setError(caught.message);
          setNotFound(caught.status === 404);
        } else {
          setError("حدث خطأ غير متوقع، حاول مرة أخرى.");
        }
      })
      .finally(() => {
        if (!active || !mounted.current) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { data, loading, error, notFound, retry, setData };
}
