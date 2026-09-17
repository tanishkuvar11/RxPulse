import { useEffect, useState } from "react";

const BASE = `${import.meta.env.BASE_URL}data`;

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/** Fetch a static JSON artifact from app/public/data/. No other network call exists
 * in this app -- everything the pipeline produces is a file, fetched once. */
export function useData<T>(file: string): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    fetch(`${BASE}/${file}`)
      .then((r) => {
        if (!r.ok) throw new Error(`${file}: HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ data: null, loading: false, error: String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [file]);

  return state;
}
